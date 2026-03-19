## MSCL Website

**MSCL Website** is a real‑time leaderboard and stats site for the Minecraft Speedrunning Community Leagues weekly event.

All the data is pushed by the organizers, and this codebase is designed to be a "dumb data layer."

## Tech Stack

- **Frontend**: Astro + React + TypeScript
- **Styling**: Tailwind + shadcn/ui + custom components
- **Backend**: Convex

## Architecture

Organizer tooling pushes **players**, **matches**, and **week transitions** via HTTP. The website is read‑only for the public.

**High‑level flow:**

1. **Initial setup**
   - Organizer scripts call `POST /api/write/players` to create all players and assign them to starting leagues with initial ELOs. This step is only required before the first week starts and is not supposed to be used after.
2. **During a week**
   - For each match, the organizer app calls `POST /api/write/match`.
   - If scores or times are corrected, the same `(weekNumber, leagueTier, matchNumber)` is re‑posted, and Convex overwrites the prior results.
3. **Week transition phase**
   - Organizer tooling computes the next week’s leagues.
   - That tooling calls `POST /api/write/weeks/transition` with:
     - The week just finished (`weekNumber`).
     - The upcoming week number (`newWeek`).
     - The full “next state” of all players.
   - Convex writes `weeklyStandings` for the finished week and advances `isCurrent` to the new week.

## Data Model

The schema lives in `convex/schema.ts`. Below is the simplified schema:

- `players`
  - `name: string`
  - `elo: number`
  - `currentLeagueId: Id<"leagues">`
- `leagues`
  - `name: string` _(e.g. "Tier 1")_
  - `tierLevel: number` _(1 = highest, 6 = lowest)_
- `weeks`
  - `weekNumber: number` _(1, 2, 3, …)_
  - `isCurrent: boolean`
- `matches`
  - `weekId: Id<"weeks">`
  - `leagueId: Id<"leagues">`
  - `rankedMatchId: string` _(The ID of the match on the MSCR ranked api)_
  - `matchNumber: number`
- `matchResults`
  - `matchId: Id<"matches">`
  - `playerId: Id<"players">`
  - `pointsWon: number`
  - `timeMs: number`
  - `placement: number` _(1 = first, etc.)_
- `weeklyStandings`
  - `weekId: Id<"weeks">`
  - `weekNumber: number`
  - `leagueId: Id<"leagues">`
  - `leagueNumber: number` _(tier level at that week)_
  - `playerId: Id<"players">`
  - `finalPlacement: number`
  - `totalPoints: number`
  - `movement: "promoted" | "relegated" | "stayed" | "new"`

This schema aims to simplify:

- Week transition logic and promotion/relegation.
- Per‑player historical stats.

## HTTP Ingestion APIs

All ingestion is done via Convex HTTP actions defined in `convex/http.ts`.

### Authentication & Validation

Every request must include an `x-api-key` header.

- **Invalid/Missing Key:** Returns `401 Unauthorized` or `403 Forbidden` JSON errors.
- **Validation:** Request bodies are validated for specific structures. On validation failure, the APIs return a structured `400 Bad Request` detailing the validation issues.

### `POST` `/api/write/players`

Upserts players and their league tiers.

**Headers:**

- `x-api-key`: `<your_api_key>` (Required)

**Request Body (`PlayersSchema`):**

```typescript
[
  {
    "name": "string",
    "elo": 1500,
    "leagueTier": 1 // Accepts 1, 2, 3, 4, 5, or 6
  }
]
```

**Behavior:**

- For each entry:
  - Ensures a `leagues` row exists for `leagueTier` (creates `Tier <tier>` if missing).
  - Looks up the player by `name`.
    - **If found:** updates `elo` and `currentLeagueId`.
    - **If missing:** inserts a new `players` document.

**Response:**

```json
// 200 OK
{ "success": true, "updated": 42 }
```

### `POST` `/api/write/match`

Upserts a single match and its per‑player results. Re‑posting the same `(weekNumber, leagueTier, matchNumber)` with updated results fully replaces prior results.

**Headers:**

- `x-api-key`: `<your_api_key>` (Required)

**Request Body (`MatchSchema`):**

```typescript
{
  "weekNumber": 1,      // Integer >= 1
  "matchNumber": 1,     // Integer >= 1
  "leagueTier": 1,      // Accepts 1 through 6
  "rankedMatchId": "string", // The ID of the match on the MSCR ranked api
  "results":[
    {
      "playerName": "string",
      "pointsWon": 10,
      "timeMs": 15000,
      "placement": 1    // Integer >= 1
    }
  ]
}
```

**Behavior:**

- Ensures a `weeks` record exists for `weekNumber`.
- Ensures a `leagues` record exists for `leagueTier`.
- Looks up a `matches` row for `(weekId, leagueId, matchNumber)`:
  - **If exists:** Deletes all existing `matchResults` for that match so it can fill the updated ones.
  - **If missing:** Creates a new `matches` row.
- For each result:
  - Validates that `placement` is a positive integer and unique within the match.
  - Ensures that the `playerName` already exists in the database (creates one with `elo=0` if not).
  - Inserts a `matchResults` row recording `pointsWon`, `timeMs`, `rankedMatchId`, and `placement`.

**Response:**

```json
// 200 OK
{ "success": true, "matchId": "...", "resultsInserted": 8 }
```

### `POST` `/api/write/weeks/transition`

Finalizes the week by computing standings, promotions, and relegations based on the updated player data.

**Headers:**

- `x-api-key`: `<your_api_key>` (Required)

**Request Body (`WeekTransitionSchema`):**

```typescript
{
  "weekNumber": 1,         // The week being finalized
  "newWeek": 2,            // The week number that will become current
  "overwrite": false,      // (Optional) Whether to replace existing standings
  "players":[             // Declarative “next state” for all players
    {
      "name": "string",
      "elo": 1550,
      "leagueTier": 1      // Accepts 1 through 6
    }
  ]
}
```

**Behavior:**

1. **Week Initialization:** Ensures a `weeks` record exists for `weekNumber`.
   - If `weeklyStandings` already exist for that week and `overwrite` is `false`, it aborts with a `409 Conflict`.
   - If `overwrite` is `true`, it deletes existing standings for that week, replacing them with new ones.
2. **Player Movement:** For each player in `players`:
   - Ensures a `leagues` row exists for the provided `leagueTier`.
   - Looks up the existing player by `name` (creates if missing).
   - Computes `movement`:
     - `"promoted"` (old tier > new tier)
     - `"relegated"` (old tier < new tier)
     - `"stayed"` (old tier == new tier)
     - `"new"` (player did not previously exist)
   - Updates the player’s `elo` and `currentLeagueId`.
   - Groups players by their **old** tier for standings.
3. **Standings Calculation:** For each old tier:
   - Finds all matches for `(weekId, oldLeagueId)`.
   - Aggregates `pointsWon` across all matches per player.
   - Sorts players **by total points descending**.
   - Writes one `weeklyStandings` row per player containing: `finalPlacement`, `totalPoints`, `movement`, `leagueNumber` (old tier), `weekNumber`, `weekId`, `leagueId`, and `playerId`.
4. **Current Week Update:**
   - Sets all existing weeks `isCurrent` field to false.
   - Inserts a new `weeks` row `{ weekNumber: newWeek, isCurrent: true }`.

**Responses:**

```json
// 200 OK
{ "success": true, "count": 42 }

// 409 Conflict (If standings exist and overwrite is false)
{ "error": "Standings already exist for week 1." }
```
