# tenki.monster proxy

A rewrite-only Vercel project — no build, no code, no runtime. `vercel.json`
forwards every path to the Tenki sandbox that serves Tenki Studio.

    tenki.monster/*  ->  tenki-studio--03q08p.us.sb.tenki.sh/*

One rule, deliberately. There used to be a second rule sending `/_events/*` to
its own `tenki-events` preview route, and it broke twice: once when the route
vanished with a sandbox rebuild, and once when its hostname moved while the
site's did not — `/` served fine while every run and the whole Traces page
404'd. `scripts/serve.mjs` now proxies `/_events/*` to the orchestrator on
:8090 inside the sandbox, so the event stream is same-origin with the site and
there is nothing here left to drift.

## Use `(.*)`, not `:path*`

The first version of this file used `"source": "/:path*"`. It silently matched
only single-segment paths with no trailing slash: `/studio` worked while `/`,
`/studio/` and `/_next/static/...` all 404'd. Since the studio is exported with
`trailingSlash: true`, almost every real link was in the broken set — the domain
looked completely dead while one hand-typed path happened to work.

The regex capture form matches the root, trailing slashes and nested paths.
Don't "tidy" it back to the named-parameter form.

## When a deployment cannot be made

Project-level routes are evaluated *before* a deployment's own rewrites and are
applied with no build, so they can override a bad rewrite when the build
pipeline is unavailable. That is not theoretical: a stale `/_events` rewrite
had to be overridden during a Vercel incident that left every deployment stuck
in `Initializing`, and a project route was the only thing that could land.

    POST /v1/projects/<id>/routes        stage a version
    PATCH /v1/projects/<id>/routes/versions   promote it

The project has **no** routes configured now — the single rewrite below covers
everything, so a redundant rule would only be a puzzle for the next reader.
`GET /v1/projects/<id>/routes` should come back empty; if it does not, someone
added an override and it takes precedence over `vercel.json`.

## Deployed as

Vercel project `tenki-monster` (team `dablclub`, `prj_MGOepCKQliXtY4B6XySTTPzMPO0Q`).

Deployment protection is `all_except_custom_domains`: the `*.vercel.app` URLs
stay behind team SSO while the custom domain serves the public. That is the
arrangement we want — don't disable it.

## When the sandbox changes

The preview hostname is stable while the sandbox is sticky and its slug is
unchanged. If the sandbox is recreated or re-slugged, update the one
`destination` value and redeploy; nothing else moves.

The suffix after `--` is the workspace, and it is **not** as stable as the slug:
it moved from `irtbn5` to `03q08p` on its own, which 404'd the domain while the
sandbox was healthy. `tenki sandbox preview-url list` prints the current
hostname — check it there before assuming the sandbox is down.

## Caveat

Rewrites proxy through Vercel's edge. Server-sent events work, but if a stream
ever buffers, open the studio on the sandbox's own preview URL — it serves the
site and `/_events` together, so it needs nothing from this project at all.
