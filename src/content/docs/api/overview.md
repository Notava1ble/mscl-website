---
title: Overview
description: API surface and endpoint groups.
---

The MSCL API is exposed through Convex HTTP routes in `convex/http.ts`.

## Base URL

Use your deployment URL, then append the route path:

`https://<your-convex-deployment>/api/...`

## Endpoint groups

- Read endpoints (`GET`) for player/match lookups.
- Write endpoints (`POST`) for moderator data ingestion.

## Authentication model

All routes require `Authorization: Bearer <API_KEY>`.

- Read routes validate against `READER_API_KEY`.
- Write routes validate against `WRITER_API_KEY`.

See the Authentication page for request header examples.

## Route index

### Write routes

- `POST /api/write/players`
- `POST /api/write/match`
- `POST /api/write/weeks/transition`

### Read routes

- `GET /api/read/players/weeks`
- `GET /api/read/players/league`
- `GET /api/read/players/week/summary`
- `GET /api/read/players/match`
- `GET /api/read/players/matches`