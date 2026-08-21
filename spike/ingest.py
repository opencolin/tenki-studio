#!/usr/bin/env python3
"""
Phase 0 spike: the orchestrator side.

Verifies HMAC-signed event batches from the runner, keeps them ordered by seq,
and re-emits them as SSE with backfill — the `?after=seq` resume the studio
needs when a browser reconnects mid-run.

In production this is the orchestrator with Postgres and Redis behind it. Here
it is one threaded stdlib server so the spike answers the transport question
without dragging in infrastructure.

    GET  /health
    POST /ingest                      signed batch from the runner
    GET  /runs                        run ids and their event counts
    GET  /stream/<run_id>?after=N     SSE; replays >N then tails live
    GET  /events/<run_id>?after=N     plain JSON, for scripted assertions
"""

import hashlib
import hmac
import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

SECRET = os.environ.get("TENKI_CALLBACK_SECRET", "spike-secret").encode()
PORT = int(os.environ.get("PORT", "8090"))

_runs: dict[str, list[dict]] = {}
_cv = threading.Condition()
_stats = {"batches": 0, "rejected": 0, "events": 0}


def _store(run_id: str, events: list[dict]) -> int:
    """Append, de-duplicating on seq so a retried batch is harmless."""
    added = 0
    with _cv:
        bucket = _runs.setdefault(run_id, [])
        seen = {e["seq"] for e in bucket}
        for e in events:
            if e.get("seq") not in seen:
                bucket.append(e)
                seen.add(e["seq"])
                added += 1
        bucket.sort(key=lambda e: e["seq"])
        _stats["events"] += added
        _cv.notify_all()
    return added


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *_):  # quiet; the spike reads its own counters
        pass

    def _cors(self):
        self.send_header("access-control-allow-origin", "*")
        self.send_header("access-control-allow-headers", "content-type, x-tenki-signature")
        self.send_header("access-control-allow-methods", "GET, POST, OPTIONS")

    def _json(self, code: int, payload: dict):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("content-length", "0")
        self.end_headers()

    def do_POST(self):
        if urlparse(self.path).path != "/ingest":
            return self._json(404, {"error": "not found"})
        length = int(self.headers.get("content-length", "0"))
        raw = self.rfile.read(length)
        expected = hmac.new(SECRET, raw, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, self.headers.get("x-tenki-signature", "")):
            _stats["rejected"] += 1
            return self._json(401, {"error": "bad signature"})
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            return self._json(400, {"error": "bad json"})
        _stats["batches"] += 1
        added = _store(payload["run_id"], payload.get("events", []))
        self._json(200, {"ok": True, "added": added})

    def do_GET(self):
        url = urlparse(self.path)
        after = int(parse_qs(url.query).get("after", ["0"])[0])

        if url.path == "/health":
            return self._json(200, {"ok": True, **_stats, "runs": len(_runs)})

        if url.path == "/runs":
            with _cv:
                return self._json(200, {"runs": {k: len(v) for k, v in _runs.items()}})

        if url.path.startswith("/events/"):
            run_id = url.path.split("/", 2)[2]
            with _cv:
                events = [e for e in _runs.get(run_id, []) if e["seq"] > after]
            return self._json(200, {"run_id": run_id, "events": events})

        if url.path.startswith("/stream/"):
            return self._stream(url.path.split("/", 2)[2], after)

        self._json(404, {"error": "not found"})

    def _stream(self, run_id: str, after: int):
        self.send_response(200)
        self.send_header("content-type", "text/event-stream")
        self.send_header("cache-control", "no-cache")
        self.send_header("connection", "keep-alive")
        self._cors()
        self.end_headers()

        cursor = after
        idle = 0.0
        try:
            while True:
                with _cv:
                    pending = [e for e in _runs.get(run_id, []) if e["seq"] > cursor]
                    if not pending:
                        _cv.wait(timeout=1.0)
                        pending = [e for e in _runs.get(run_id, []) if e["seq"] > cursor]

                for e in pending:
                    cursor = e["seq"]
                    # `id:` lets EventSource resume with Last-Event-ID after a drop.
                    self.wfile.write(f"id: {e['seq']}\ndata: {json.dumps(e)}\n\n".encode())
                    self.wfile.flush()
                    if e["type"] in ("run_completed", "run_failed"):
                        self.wfile.write(b"event: end\ndata: {}\n\n")
                        self.wfile.flush()
                        return

                if pending:
                    idle = 0.0
                else:
                    idle += 1.0
                    # A comment frame keeps proxies from reaping an idle stream.
                    self.wfile.write(b": keep-alive\n\n")
                    self.wfile.flush()
                    if idle > 900:
                        return
        except (BrokenPipeError, ConnectionResetError):
            return


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"ingest listening on :{PORT}", flush=True)
    server.serve_forever()
