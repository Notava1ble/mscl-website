---
title: Authentication
description: API key requirements and request header format.
---

Every API request is protected by a bearer token.

## Header format

```http
Authorization: Bearer YOUR_API_KEY
```

## Key types

- `READER_API_KEY`: required by all `/api/read/...` routes.
- `WRITER_API_KEY`: required by all `/api/write/...` routes.

If the key is missing or invalid, the server returns an authentication error response.

## Example request

```bash
curl -X GET "https://<your-convex-deployment>/api/read/players/weeks?playerName=Notava1ble" \
  -H "Authorization: Bearer YOUR_READER_API_KEY"
```

Authorization: Bearer YOUR_API_KEY