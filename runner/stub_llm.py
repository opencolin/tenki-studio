"""A minimal OpenAI-compatible chat endpoint.

Exists so the CrewAI path can be exercised end to end without a real provider
credential: everything above the HTTP boundary — Agent, Task, Crew, the event
bus, the callback — is the real thing; only the model's reply is canned.
"""
import json, time, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class H(BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get("content-length", "0"))
        body = json.loads(self.rfile.read(n) or "{}")
        last = ""
        for m in body.get("messages", []):
            if m.get("role") == "user":
                last = (m.get("content") or "")[:120]
        out = json.dumps({
            "id": "chatcmpl-" + uuid.uuid4().hex[:12],
            "object": "chat.completion",
            "created": int(time.time()),
            "model": body.get("model", "stub"),
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "STUB MODEL REPLY. Echoing the start of the prompt: " + last,
                },
                "finish_reason": "stop",
            }],
            "usage": {"prompt_tokens": 10, "completion_tokens": 12, "total_tokens": 22},
        }).encode()
        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    def log_message(self, *a):
        pass


ThreadingHTTPServer(("127.0.0.1", 8099), H).serve_forever()

# Usage — proves the CrewAI path without a provider credential:
#
#   python3 runner/stub_llm.py &
#   OPENAI_API_KEY=stub-local ~/crewenv/bin/python runner/tenki_runner.py \
#       --crew <crew.json with base_url http://127.0.0.1:8099/v1> \
#       --callback http://localhost:8090/ingest --run-id run_stubproof --inputs '{}'
#
# Everything above the HTTP boundary is the real thing. This is a test double
# for the model provider only — never wire it into a real run.
