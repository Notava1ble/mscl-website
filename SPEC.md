# Project Specification: MSCL Website

## 1. Overview

A real-time leaderboard website for a 6-league tournament. Matches are played weekly, and points reset each week. At the end of the week, players are promoted or relegated based on their performance. The system acts as a "dumb" data layer and display engine: all match data, moderation, and the final end-of-week player states are pushed to this system by the organizing team's custom application.

## 2. Tech Stack

- **Frontend Framework**: Astro (Static Site Generation / SSG mode).
- **UI Components**: React (Astro Islands for real-time interactivity).
- **Backend & Database**: Convex (Document DB, Real-time WebSockets, HTTP Actions).
- **Hosting**: Free static hosting for Astro.

## 3. Database Schema (Convex)

The database is fully normalized to allow fast querying and easy historical lookups.

It can be found at `convex/schema.ts`.

## 4. API Contracts (Ingestion via Convex HTTP Actions)

The organizing team's app will communicate with the website exclusively through HTTP endpoints exposed via Convex HTTP Actions. All endpoints must be secured with an `Authorization: Bearer <TEAM_API_KEY>` header.

### 4.1 Ingest / Update Match

**Endpoint:** `POST https://<your-convex-url>.convex.site/api/matches`

Acts as an **upsert**. Pushed immediately after a match concludes. If moderation is needed (e.g., score correction), the team pushes the same `match_id` with the corrected results array, and the backend overwrites the previous results.

### 4.2 End of Week Transition

**Endpoint:** `POST https://<your-convex-url>.convex.site/api/weeks/transition`

Pushed at the end of the week. The team pushes the **declarative next state** of all players. The Convex backend automatically calculates who was promoted or relegated by comparing their old league's `tierLevel` to their new league's `tierLevel`.

## 5. Frontend & Queries

The Astro frontend is statically generated. Interactive components (like the leaderboards) use React and Convex's `useQuery` hooks.

### 5.1 The Current Leaderboard

**View:** Renders the live standings for the active week.
**Data Aggregation (Convex Query):**

- Fetches the week where `isCurrent == true`.
- Fetches all `matches` for the given `leagueId` and `weekId`.
- Fetches all `matchResults` for those matches.
- Aggregates `pointsWon` (SUM) and `timeMs` (SUM) per `playerId` in memory.
- **Sorting Rule:** Order by `pointsWon` (DESC). If tied (which is theoretically impossible, but just in case), resolve using `timeMs` (ASC - lower time wins).

### 5.2 The Historical Leaderboard

**View:** Renders past weeks. Includes visual indicators (green/red arrows) showing promotion or relegation statuses resulting from that week.
**Data Aggregation:**

- Same aggregation logic as the current leaderboard, but filters by a specific historical `weekId`.
- Joins the `weeklyStandings` table to append the `movement` status to each player row for UI rendering.

## 6. Edge Cases Handled

1. **Draws:** Handled by the organizing team's app. The specific points awarded for a draw are calculated externally and pushed via the `results` array.
2. **Disconnections / Dropped Players:** Handled externally. The team pushes the player with `0` points, or omits them from the `results` array.
3. **Score Moderation:** Handled by the **upsert** nature of the `/api/matches` endpoint. Re-pushing a match safely wipes the old records and inserts the new ones. Convex instantly pushes the updated aggregated scores to connected website visitors via WebSockets.
4. **Tiebreakers:** Pushed via `/api/matches` with `"match_type": "tiebreaker"`. Aggregated into the total points normally, but the `match_type` flag allows the frontend to highlight these specific matches in a "Match History" detail view if needed.
5. **New Player Onboarding:** Handled seamlessly during the End of Week Transition. If an unrecognized `id` is present in the `players` array payload, they are seamlessly inserted into the database.
