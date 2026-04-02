- [ ] Make sure listPlayerMatches Read API is not broken by the changes
- [x] In the unregisterPlayer API make sure the player can be removed only if they havent played any matches.
- [ ] Make sure only one competition per league can be active at a time. This is enforced by the bot, but keep in mind.

## In the bot (not related to this project):

- [ ] **If a new match is created (`/nm`)**: Use the new competition API. If it exists and has ended, return error.
- [ ] **If a player's result is edited (`/edit` & `/r`)**: Re-import the match again to update the whole leaderboard.
- [ ] **End / Unend Competition (`/em` & `/unend`)**: Call `PATCH /api/write/competition/status` to lock (`"ended"`) or unlock (`"active"`) the week on the website.
- [ ] **Player Registration (`/reg` & `/admin_reg`)**: Call `POST /api/write/player` to push the player's Discord ID, IGN, UUID, and ELO to the website.
- [ ] **Roster Lock (`/unreg` & `/remove`)**: Allow unregistering only if the player hasn't played any matches. Call the unregister API.
- [ ] **Seed Creation (`/ns`)**: Call `POST /api/write/match/create` so the website creates the empty match container.
- [ ] **Clear Seed (`/clear`)**: Call `DELETE /api/write/match/clear` to wipe all results for that specific seed on the website.
- [ ] **Point Adjustments (`/adjust`)**: Call `PATCH /api/write/adjustment` with the player's new total `manualAdjustmentPoints`.
- [ ] **Promotions & Demotions (`/relegate`)**: Call `PATCH /api/write/movements` passing the arrays of `promotedDiscordIds` and `demotedDiscordIds` from the `applyLeagueMovements` logic.
- [ ] **Importing Matches**: import a match using the `POST /api/write/match/import` endpoint.
- [ ] **Test Mode Guard**: Wrap **every** single API call in `if (!iT(competition))` so you don't accidentally push dummy test data to the live website.
- [ ] **Create Fetch Helper**: Create a reusable `pushToWeb(endpoint, payload, method)` function at the top of the bot to handle the `fetch` logic, JSON stringifying, and `x-api-key` headers so the code stays clean.
