# tenki.monster proxy

A rewrite-only Vercel project — no build, no code, no runtime. `vercel.json`
forwards every path to the Tenki sandbox that serves Tenki Studio.

    tenki.monster/*          ->  tenki-studio--irtbn5.us.sb.tenki.sh/*
    tenki.monster/_events/*  ->  tenki-events--irtbn5.us.sb.tenki.sh/*

The second rule exists so a live run can be streamed same-origin:

    https://tenki.monster/studio/?stream=https://tenki.monster/_events&run=<id>

## Use `(.*)`, not `:path*`

The first version of this file used `"source": "/:path*"`. It silently matched
only single-segment paths with no trailing slash: `/studio` worked while `/`,
`/studio/` and `/_next/static/...` all 404'd. Since the studio is exported with
`trailingSlash: true`, almost every real link was in the broken set — the domain
looked completely dead while one hand-typed path happened to work.

The regex capture form matches the root, trailing slashes and nested paths.
Don't "tidy" it back to the named-parameter form.

## Deployed as

Vercel project `tenki-monster` (team `dablclub`, `prj_MGOepCKQliXtY4B6XySTTPzMPO0Q`).

Deployment protection is `all_except_custom_domains`: the `*.vercel.app` URLs
stay behind team SSO while the custom domain serves the public. That is the
arrangement we want — don't disable it.

## When the sandbox changes

The preview hostnames are stable while the sandbox is sticky and its slug is
unchanged. If the sandbox is recreated or re-slugged, update the two
`destination` values and redeploy; nothing else moves.

## Caveat

Rewrites proxy through Vercel's edge. Server-sent events work, but if a stream
ever buffers, point the studio straight at the events host instead — CORS is
open on the ingest, so it works cross-origin too.
