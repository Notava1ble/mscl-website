// convex/schema.ts
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  players: defineTable({
    name: v.string(),
    elo: v.number(),
    currentLeagueId: v.id("leagues"),
  })
    .index("by_elo", ["elo"])
    .index("by_league", ["currentLeagueId"])
    .index("by_name", ["name"]),

  leagues: defineTable({
    name: v.string(),
    tierLevel: v.number(),
  }),

  weeks: defineTable({
    weekNumber: v.number(),
    isCurrent: v.boolean(),
  }),

  matches: defineTable({
    weekId: v.id("weeks"),
    leagueId: v.id("leagues"),
    matchType: v.string(), // "regular" or "tiebreaker"
  }).index("by_week_and_league", ["weekId", "leagueId"]),

  matchResults: defineTable({
    matchId: v.id("matches"),
    playerId: v.id("players"),
    pointsWon: v.number(),
    timeMs: v.number(),
  }).index("by_match", ["matchId"]),

  weeklyStandings: defineTable({
    weekId: v.id("weeks"),
    playerId: v.id("players"),
    movement: v.string(), // "promoted", "relegated", "stayed", "new"
  }).index("by_week_and_player", ["weekId", "playerId"]),
})
