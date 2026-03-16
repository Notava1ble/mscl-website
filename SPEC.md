## MSCL Website – Living Specification

This document is the **living spec** for the MSCL website. It describes both:

- The **intended behavior** of the system, and
- The **current implementation** in this repo, including known deviations from the original plan.

---

## 1. Product Overview

The MSCL website is a public **leaderboard and stats portal** for a multi‑league, weekly tournament:

- Players are placed into **tiered leagues** (e.g. Tier 1–6).
- Each week, players compete in **matches** within their league.
- At the end of each week, players can be **promoted, relegated, or remain** based on results.

The website is **not** the source of truth for competition logic:

- A separate **organizer app**:
  - Decides format, point rules, tie‑breaking, and moderation.
  - Computes end‑of‑week league assignments and ELO changes.
  - Calls this project’s HTTP APIs to persist that data in Convex.
- The MSCL website:
  - Stores the data in a normalized schema.
  - Exposes **read‑only** views for spectators and players.

---

## 2. Tech Stack

- **Frontend**: Astro (static pages) + React islands.
- **UI**: shadcn/ui + custom components.
- **Backend & DB**: Convex (document DB, queries, mutations, HTTP actions).
- **Frontend data access**: Convex React `useQuery`.

---

## 3. Data Model (Convex)

Authoritative definitions are in `convex/schema.ts`. Conceptually:

- `players` – players, their ELO, and their current league.
- `leagues` – named tiers, ordered by `tierLevel` (1 = highest).
- `weeks` – numbered weeks, with one `isCurrent` week at a time.
- `matches` – per‑week, per‑league matches, with a `matchNumber` within that week+league.
- `matchResults` – per‑player results for each match (points, time, placement).
- `weeklyStandings` – computed, denormalized standings per `(week, league, player)` with `movement` status.

This schema is designed to support:

- Live league standings.
- Week‑end promotion/relegation computation.
- Per‑player historical stats.

---

## 4. Ingestion APIs (Organizer‑Facing)

All writes are done via Convex HTTP actions in `convex/http.ts`. These APIs are intended for the organizer app; the public website uses only Convex queries.

### 4.1 Authentication and Validation

- Every ingestion endpoint requires an `x-api-key` header.
- The key is compared against `process.env.WRITER_API_KEY` using a timing‑safe comparison.
- Missing or invalid keys return JSON errors with appropriate status codes (401/403/500).
- Request bodies are validated with zod schemas in `convex/lib/validators.ts`:
  - `PlayersSchema` for bulk players.
  - `MatchSchema` for a single match.
  - `WeekTransitionSchema` for end‑of‑week transitions.

### 4.2 `POST /api/write/players`

**Purpose:** Create or update players and their league tiers.

- **Body:** array of `{ name: string; elo: number; leagueTier: 1..6 }`.
- **Behavior:**
  - Ensures `leagues` rows exist for each `leagueTier` (auto‑creates `Tier <tier>` if missing).
  - For each object:
    - Looks up a player by `name`.
    - If found: updates `elo` and `currentLeagueId`.
    - If not found: inserts a new `players` row.
- **Response:** `200 { success: true, updated: <count> }` on success.

### 4.3 `POST /api/write/match`

**Purpose:** Upsert a single match and its results.

- **Body:**
  - `weekNumber: number >= 1`
  - `matchNumber: number >= 1`
  - `leagueTier: 1..6`
  - `results: Array<{ playerName; pointsWon; timeMs; placement }>`
- **Intended behavior:**
  - Ensure a `weeks` row exists for `weekNumber` (creating it if needed).
  - Ensure a `leagues` row exists for `leagueTier`.
  - Find or create a `matches` row keyed by `(weekId, leagueId, matchNumber)`.
  - Delete any existing `matchResults` for that `matchId`.
  - For each result:
    - Validate `placement` is a positive integer and unique within the match.
    - Upsert `players` by `playerName` (creating players with default ELO if necessary).
    - Insert `matchResults` rows with `pointsWon`, `timeMs`, and `placement`.
- **Guarantee:** Posting the same `(weekNumber, leagueTier, matchNumber)` again fully replaces that match’s results.

### 4.4 `POST /api/write/weeks/transition`

**Purpose:** Finalize a week’s results, compute standings and movement, and advance to a new current week.

- **Body:**
  - `weekNumber: number` – the week being finalized.
  - `newWeek: number` – the week that will become current.
  - `overwrite: boolean` – whether to replace existing standings for `weekNumber`.
  - `players: Array<{ name: string; elo: number; leagueTier: 1..6 }>` – declarative “next state” for all players.
- **Behavior (high‑level):**
  1. Ensure a `weeks` row exists for `weekNumber`.
  2. Check for existing `weeklyStandings` for that week:
     - If they exist and `overwrite` is `false`:
       - Return a structured `{ success: false, status: 409, error: ... }`.
     - If they exist and `overwrite` is `true`:
       - Delete them and proceed.
  3. Upsert players:
     - For each entry in `players`:
       - Ensure a `leagues` row for `leagueTier`.
       - Upsert the player by `name`.
       - Determine `movement` by comparing old and new tiers (`promoted`, `relegated`, `stayed`, `new`).
       - Update `elo` and `currentLeagueId`.
       - Group players by their **old** tier.
  4. Compute `weeklyStandings` for each old tier:
     - Fetch all `matches` for `(weekId, oldLeagueId)`.
     - Aggregate `pointsWon` per `playerId` from `matchResults`.
     - Rank players by `totalPoints DESC`.
     - Insert `weeklyStandings` rows with:
       - `finalPlacement`, `totalPoints`, `movement`, `leagueNumber`, `weekNumber`, etc.
  5. Advance the current week:
     - Set `isCurrent = false` on all existing current weeks.
     - Insert a new `weeks` row `{ weekNumber: newWeek, isCurrent: true }`.
- **Response:** `200 { success: true, count: <players_processed> }` on success, or an error JSON if blocked by `overwrite` rules.

---

## 5. Frontend Behavior & Queries

The Astro frontend is static; React islands use Convex queries to drive real‑time views.

### 5.1 `/leaderboard` – League Leaderboard (Current Implementation)

**Intended user goal:** See the current ordering of players within each league and drill into individual stats.

**Queries used:**

- `leagues.listLeagues`:
  - Returns all leagues ordered by `tierLevel ASC`.
  - Drives the tabbed league selector.
- `leaderboard.getLeagueStandings({ leagueId })`:
  - Loads all `players` in the given league.
  - Sorts by `elo DESC`.
  - Returns `{ rank, playerId, name, elo }`.

**UI behavior:**

- League tabs:
  - Initially select the league from `?league=<tier>` or default to the first league.
  - Updating the tab:
    - Changes selected league.
    - Updates the query param via `history.pushState`.
    - Triggers a re‑query.
- Standings table:
  - Shows ELO‑based ranking for players in the selected league.
  - On row click, opens a player stats side panel.

> **Deviation from original vision:**  
> The original spec described a “current leaderboard” based on **current‑week points** and match aggregation.  
> The current implementation shows **ELO‑based standings**, independent of weeks and match results.

### 5.2 Player Stats Panel

**Query used:** `playerStats.getPlayerStats({ playerId })`.

This query:

- Loads the `players` row and its `currentLeague`.
- Builds:
  - `leagueHistory` from `weeklyStandings`.
  - `weeklyBreakdown` from `matchResults` and `matches`.
  - A `summary` of match counts and times.

The UI:

- Shows player name, ELO, and a visual tier badge.
- Shows aggregate stats (matches, average time, best time).
- For each week:
  - Week number and league.
  - Movement (promoted/relegated/stayed/new).
  - Totals and per‑match placements/times.

This effectively provides a **per‑player historical view** across weeks and leagues.

### 5.3 Historical / Week‑Based Leaderboards (Planned)

- A “current leaderboard” based on the current week’s aggregated `pointsWon`.
- A separate “historical leaderboard” for past weeks with promotion/relegation arrows.

The current codebase has the data needed (`weeklyStandings`, `matchResults`, `weeks`), but:

- There is no dedicated Convex query for “standings for week N and league L”.
- There is no Astro page for `/week` or similar.
- A UI link to `/week?league=<tier>&week=latest` exists but points to a non‑existent page.

---

## 6. Edge Cases & Guarantees

1. **Draws / scoring rules**
   - All scoring decisions (including draws) are handled by the organizer app.
   - The backend stores the resulting `pointsWon` values as provided.
2. **Players that don't participate for the week**
   - Represented in the payload by:
     - Omission from `results`.
3. **Score moderation**
   - Supported by:
     - The upsert semantics of `/api/write/match` for individual matches.
     - The `overwrite` flag of `/api/write/weeks/transition` for weekly standings.
4. **New player onboarding**
   - If an unknown `name` appears in a players/match/transition payload, a new `players` row is created automatically.
5. **Single current week**
   - The system enforces that at most one week is `isCurrent == true` at a time, by patching old records to `false` on each transition.

---

## 9. Summary

- The current system:
  - Provides robust ingestion APIs for players, matches, and week transitions.
  - Maintains normalized data and denormalized weekly standings.
  - Exposes an ELO‑based league leaderboard and deep per‑player stats.
- With relatively small additions (queries + UI), it can:
  - Support true week‑based current and historical leaderboards.
  - Align fully with the original tournament spec once the open questions above are decided.
