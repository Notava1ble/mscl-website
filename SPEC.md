## MSCL Website – Living Specification

This document is the **living spec** for the MSCL website. It describes both:

- The **intended behavior** of the system, and
- The **current implementation** in this repo, focusing on the integration between the Discord Bot, the Convex Backend, and the React Frontend.

---

## 1. Product Overview

The MSCL website is a public **leaderboard and stats portal** for a multi‑league, weekly Minecraft speedrunning tournament:

- Players are placed into **tiered leagues** (e.g. Tier 1–6).
- Each week, players compete in **matches (seeds)** within their league.
- At the end of each week, players can be **promoted, relegated, or remain** in their tier.

The website is **not** the source of truth for competition logic.

- A **Discord Bot (Node.js)**:
  - Manages registrations, match time tracking, tie-breakers, DNF penalties, and point distribution.
  - Controls the start (`/nm`) and end (`/em`) of the weekly competitions.
  - Acts as the "Game Engine", calling this project’s HTTP APIs to persist data.
- The **MSCL website (Convex + Astro/React)**:
  - Validates and stores the data in a highly indexed, relational schema.
  - Exposes **read‑only** real-time views and historical stats for spectators and players.

---

## 2. Tech Stack

- **Frontend**: Astro (static pages) + React islands.
- **UI**: shadcn/ui + custom components.
- **Backend & DB**: Convex (document DB, queries, mutations, HTTP actions).
- **Game Server / Ingestion**: Discord.js Bot.

---

## 3. Data Model (Convex)

Authoritative definitions are in `convex/schema.ts`. The database is heavily denormalized to ensure fast frontend queries.

- `players` – Global player profiles (`discordId`, `ign`, `lowercaseIgn`, `elo`, `currentLeagueNumber`).
- `competitions` – Represents a specific week in a specific league. Includes `leagueTier`, `weekNumber`, and `status` (`"active"` | `"ended"`).
- `registrations` – The central junction linking a player to a competition. Stores `manualAdjustmentPoints`, `totalPoints`, and week-end `movementStatus` (`promoted`, `demoted`, `none`).
- `matches` – Individual seeds/matches within a competition.
- `matchResults` – A specific player's performance on a specific match (`timeMs`, `dnf`, `placement`, `pointsWon`).

---

## 4. Ingestion APIs (Discord Bot-Facing)

All writes are done via Convex HTTP actions in `convex/http.ts`.

### 4.1 Authentication and Safety

- Every ingestion endpoint requires an `x-api-key` header matching `process.env.WEBSITE_API_KEY`.
- Validation is done using a timing-safe crypto comparison.
- **Finalization Lock:** If a competition's `status` is `"ended"`, structural endpoints (like `/api/write/competition`) will block mutations with a `403 Forbidden` to protect historical integrity.

### 4.2 Endpoints and Bot Command Mapping

**1. Create/Restart Competition**

- **Endpoint:** `POST /api/write/competition`
- **Bot Command:** `/nm`
- **Behavior:**
  - If the week is `"ended"`, returns 403.
  - If it already exists as `"active"` (admin resetting state), wipes all previous registrations/matches for that week and restarts it.
  - Otherwise, creates a new `"active"` competition.

**2. Update Competition Status**

- **Endpoint:** `PATCH /api/write/competition/status`
- **Bot Commands:** `/em` (sets to `"ended"`), `/unend` (sets to `"active"`).
- **Behavior:** Locks or unlocks the competition from further structural overwrites.

**3. Player Registration**

- **Endpoint:** `POST /api/write/player` & `DELETE /api/write/player`
- **Bot Commands:** `/reg`, `/admin_reg` (POST) | `/unreg`, `/remove` (DELETE).
- **Behavior:** Upserts the player profile and creates/removes the `registrations` link for that competition.

**4. Match/Seed Management**

- **Endpoint:** `POST /api/write/match/create` & `DELETE /api/write/match/clear`
- **Bot Commands:** `/ns` (Creates empty match), `/clear` (Wipes results for a match).

**5. Import/Update Match Results**

- **Endpoint:** `POST /api/write/match/results`
- **Bot Commands:** `/import`, `/edit`, `/r`.
- **Behavior:** Receives a full array of results. Upserts the match and all player `matchResults`.
  - _Note:_ Even when editing a single player's time (`/edit`), the bot recalculates all placements locally and pushes the _entire_ match to this endpoint to guarantee point consistency.

**6. Manual Point Adjustments**

- **Endpoint:** `PATCH /api/write/adjustment`
- **Bot Command:** `/adjust`
- **Behavior:** Updates `manualAdjustmentPoints` on a player's `registrations` row, which propagates to their `totalPoints`.

**7. League Movements (Promotions/Demotions)**

- **Endpoint:** `PATCH /api/write/movements`
- **Bot Command:** `/relegate`
- **Behavior:** Receives lists of promoted/demoted Discord IDs. Updates their `registrations.movementStatus` and shifts their global `currentLeagueNumber`.

---

## 5. Frontend Behavior & Queries

The frontend uses Convex React hooks (`useQuery`) to display real-time leaderboards.

### 5.1 Weekly/Current Leaderboard

## **Intended user goal:** See the standings for a specific league and week (including live ongoing weeks).

## 6. Edge Cases & System Guarantees

1. **Mistake Deletion via `/dm`**
   - The bot has a `/dm` command to wipe its local memory of an ongoing setup.
   - The API handles this implicitly: `/dm` does not fire an API call. The website simply holds the abandoned `"active"` data. If `/nm` is called again later for that week, the API's "Safe Upsert" cleanly wipes the ghost data and restarts.

2. **Editing Match Times**
   - Because placements and points depend on _everyone's_ times, there is no `/edit-single-result` API.
   - The bot handles edits locally, computes new placements, and uses the `POST /api/write/match` bulk endpoint to overwrite the entire match state safely.

3. **Denormalized Sorting**
   - `totalPoints` is pre-calculated and stored directly on the `registrations` table during match imports and point adjustments. This prevents the frontend from needing complex aggregation logic, ensuring $O(1)$ fast reads for leaderboards.
