---
title: Reading Data
description: How to read data with the API.
---

1. Get Player Weeks

Endpoint:

GET /api/read/player/weeks?playerName=<name>

Response:

{
  "success": true,
  "weeks": [1, 2, 3, 4]
}

2. Get Player League

Endpoint:

GET /api/read/player/league?playerName=<name>

Response:

{
  "success": true,
  "leagueId": "tier_3"
}

3. Get Player Week Points & Placement

Points:

GET /api/read/player/week/points?playerName=<name>&week=<weekNumber>

Placement:

GET /api/read/player/week/placement?playerName=<name>&week=<weekNumber>

Responses:
Points:

{
  "success": true,
  "points": 120
}

Placement:

{
  "success": true,
  "placement": 2
}

4. Get Player Match Placement
GET /api/read/player/match/placement?playerName=<name>&week=<weekNumber>&match=<matchNumber>

Response:

{
  "success": true,
  "placement": 1
}

5. Get Player Match Splits (Timelines)
GET /api/read/player/match/splits?rankedMatchId=<id>&playerUuid=<uuid>

Response:

{
  "success": true,
  "splits": [
    {"type": "overworld_start", "time": 0},
    {"type": "nether_enter", "time": 120000},
    {"type": "complete", "time": 600000}
  ]
}

6. Get Matches by Player
GET /api/read/matches/player?playerName=<name>&week=<weekNumber(optional)>

Response:

{
  "success": true,
  "data": {
    "matches": [
      {"matchNumber": 1, "weekNumber": 2, "pointsWon": 10},
      {"matchNumber": 2, "weekNumber": 2, "pointsWon": 12}
    ]
  }
}
