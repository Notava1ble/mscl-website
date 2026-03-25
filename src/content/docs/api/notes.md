---
title: Notes
description: Operational behavior and important caveats.
---

## CORS

All current handlers return:

`Access-Control-Allow-Origin: *`

## Number parsing

Some query params are parsed as numbers in handlers:

- `week`
- `match`

Pass numeric values to avoid `400` errors.

## Required params

Routes validate required query/body fields and return `400` when they are missing.

## Auth enforcement

Read and write routes are checked against different API keys:

- Reader routes -> `READER_API_KEY`
- Writer routes -> `WRITER_API_KEY`

## Removed route

There is currently no splits timeline endpoint in `convex/http.ts` (`/api/read/player/match/splits` was removed). Use only the routes listed in the Endpoints page.
