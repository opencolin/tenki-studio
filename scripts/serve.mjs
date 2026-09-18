#!/usr/bin/env node
/**
 * Zero-dependency static server for the exported site.
 *
 * Next's static export writes a directory per route (`/studio/index.html`), so
 * this resolves a request path to a file, then to `<path>/index.html`, and falls
 * back to the exported 404 page. Used by `npm start` and by the Tenki sandbox
 * that hosts the live site.
 *
 * It also proxies `/_events/*` to the orchestrator. That used to be a second
 * preview route plus a second rewrite in the Vercel proxy, and it broke twice:
 * the route vanished when the sandbox was rebuilt, and the rewrite was left
 * pointing at a hostname that had moved. Serving the event stream from the same
 * origin as the site removes both failure modes — one route, one rewrite, and
 * the studio's default `/_events` base works behind any front door.
 */
import { createServer, request as httpRequest } from "node:http";
import { createReadStream, promises as fs } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "out");
const port = Number(process.env.PORT ?? process.argv[3] ?? 3000);
const eventsPort = Number(process.env.EVENTS_PORT ?? 8090);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

async function fileFor(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  const target = join(root, clean);
  if (!target.startsWith(root)) return null; // path traversal
  for (const candidate of [target, join(target, "index.html"), `${target}.html`]) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch {
      /* keep looking */
    }
  }
  return null;
}

/**
 * Forward to the orchestrator, streaming both ways.
 *
 * Nothing here may buffer: `/stream/<run>` is server-sent events, so the
 * response has to reach the client as it arrives, not when it ends. Piping
 * raw streams and copying headers verbatim is what keeps that true.
 */
function proxyToOrchestrator(req, res) {
  const path = (req.url ?? "/").slice("/_events".length) || "/";
  const upstream = httpRequest(
    { host: "127.0.0.1", port: eventsPort, path, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${eventsPort}` } },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on("error", (err) => {
    // Say which hop failed. A bare 502 here reads as "the site is broken" when
    // the site is fine and only the orchestrator is down.
    if (!res.headersSent) res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: `orchestrator unreachable on :${eventsPort}`, detail: err.message }));
  });
  req.pipe(upstream);
  res.on("close", () => upstream.destroy());
}

createServer(async (req, res) => {
  if ((req.url ?? "").startsWith("/_events")) return proxyToOrchestrator(req, res);

  let file = await fileFor(req.url ?? "/");
  let status = 200;
  if (!file) {
    file = await fileFor("/404.html");
    status = 404;
  }
  if (!file) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
    return;
  }
  const immutable = (req.url ?? "").startsWith("/_next/static/");
  res.writeHead(status, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    "cache-control": immutable ? "public, max-age=31536000, immutable" : "public, max-age=60",
    "x-content-type-options": "nosniff",
  });
  createReadStream(file).pipe(res);
}).listen(port, "0.0.0.0", () => {
  console.log(`serving ${root} on http://0.0.0.0:${port}`);
});
