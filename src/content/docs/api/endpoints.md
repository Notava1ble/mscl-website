---
title: Endpoints
description: Route-by-route API reference.
---

This reference matches the routes currently registered in `convex/http.ts`.

## Write endpoints

### `POST /api/write/players`

Auth: `WRITER_API_KEY`

Body:

```json
[
  {
    "name": "PlayerOne",
    "elo": 1240,
    "leagueTier": 3
  }
]
```

Success response:

```json
{
  "success": true,
  "updated": 1
}
```

---

### `POST /api/write/match`

Auth: `WRITER_API_KEY`

Body:

```json
{
  "weekNumber": 4,
  "matchNumber": 2,
  "leagueTier": 3,
  "rankedMatchId": "abcd-1234",
  "results": [
    {
      "playerName": "PlayerOne",
      "placement": 1,
      "pointsWon": 12,
      "timeMs": 600000
    }
  ]
}
```

Success response:

```json
{
  "success": true
}
```

---

### `POST /api/write/weeks/transition`

Auth: `WRITER_API_KEY`

Body:

```json
{
  "weekNumber": 4,
  "newWeek": 5,
  "players": [
    {
      "name": "PlayerOne",
      "elo": 1300,
      "leagueTier": 2
    }
  ]
}
```

Success response:

```json
{
  "success": true,
  "count": 1
}
```

## Read endpoints

### `GET /api/read/players/weeks`

Auth: `READER_API_KEY`

Query params:

- `playerName` (required)

Success response:

```json
{
  "success": true,
  "weeks": [1, 2, 3, 4]
}
```

---

### `GET /api/read/players/league`

Auth: `READER_API_KEY`

Query params:

- `playerName` (required)
- `week` (optional number)

Success response:

```json
{
  "success": true,
  "playerName": "PlayerOne",
  "leagueNumber": 3,
  "weekNumber": 4
}
```

---

### `GET /api/read/players/week/summary`

Auth: `READER_API_KEY`

Query params:

- `playerName` (required)
- `week` (required number)

Success response:

```json
{
  "success": true,
  "points": 36,
  "avgPlacement": 2,
  "matchesCount": 3
}
```

---

### `GET /api/read/players/match`

Auth: `READER_API_KEY`

Query params:

- `playerName` (required)
- `week` (required number)
- `match` (required number)

Success response:

```json
{
  "success": true,
  "playerName": "PlayerOne",
  "weekNumber": "4",
  "matchNumber": 2,
  "pointsWon": 12,
  "placement": 1,
  "rankedMatchId": "abcd-1234",
  "timeMs": 600000
}
```

---

### `GET /api/read/players/matches`

Auth: `READER_API_KEY`

Query params:

- `playerName` (required)
- `week` (optional number)

Success response:

```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "matchNumber": 1,
        "weekNumber": 4,
        "pointsWon": 10,
        "placement": 3,
        "rankedMatchId": "abcd-1111",
        "timeMs": 630000
      }
    ]
  }
}
```

## Common error cases

- Missing required query/body fields: `400`
- Invalid numeric query values (for example `week`): `400`
- Missing or invalid API key: auth error response
- Unknown player/match in a targeted read route: `404` where applicable
- Unexpected handler failures: `500`
