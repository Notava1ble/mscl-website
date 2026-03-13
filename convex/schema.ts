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
    name: v.string(), // lg_1, lg_2, etc.
    tierLevel: v.number(), // 1, 2, 3, etc. (unique)
  }).index("by_tier_level", ["tierLevel"]),

  weeks: defineTable({
    weekNumber: v.number(), // 1, 2, 3, etc.
    isCurrent: v.boolean(),
  })
    .index("by_current", ["isCurrent"])
    .index("by_week_number", ["weekNumber"]),

  matches: defineTable({
    weekId: v.id("weeks"),
    leagueId: v.id("leagues"),
    matchNumber: v.number(),
  })
    .index("by_week_and_league", ["weekId", "leagueId"])
    .index("by_week_league_match", ["weekId", "leagueId", "matchNumber"]),

  matchResults: defineTable({
    matchId: v.id("matches"),
    playerId: v.id("players"),
    pointsWon: v.number(),
    timeMs: v.number(),
  }).index("by_match", ["matchId"]),

  weeklyStandings: defineTable({
    weekId: v.id("weeks"),
    weekNumber: v.number(),
    playerId: v.id("players"),
    movement: v.union(
      v.literal("promoted"),
      v.literal("relegated"),
      v.literal("stayed"),
      v.literal("new")
    ), // "promoted", "relegated", "stayed", "new"
  })
    .index("by_week_and_player", ["weekId", "playerId"])
    .index("by_week", ["weekId"])
    .index("by_player", ["playerId"])
    .index("by_week_number", ["weekNumber"]),
})
