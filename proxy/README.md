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

## A project route also sends /_events to the sandbox

Project-level routes are evaluated before a deployment's own rewrites, and this
project has one:

    ^/_events/(.*)$  ->  https://tenki-studio--03q08p.us.sb.tenki.sh/_events/$1

It exists because the stale second rewrite could not be removed when it broke:
Vercel was mid-incident with deployments stuck in `Initializing`, so no new
config could land. A project route is applied without a build, which made it
the only way to override a bad rewrite while the platform was down. Keep it —
it now points at the same host as the catch-all, so it costs nothing, and it is
the lever to reach for the next time a deployment cannot be made.

Read or change it with the Vercel API (`/v1/projects/<id>/routes`); staged
versions must be promoted before they take effect.

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
