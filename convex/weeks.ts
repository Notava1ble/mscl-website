import { internalMutation, query } from "./_generated/server"
import { v } from "convex/values"

export const getCurrentWeek = query({
  args: {},
  handler: async (ctx) => {
    const activeCompetitions = await ctx.db
      .query("competitions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect()

    if (activeCompetitions.length === 0) return null

    const weekNumber = Math.max(...activeCompetitions.map((c) => c.weekNumber))

    return {
      weekNumber,
      competitions: activeCompetitions.filter(
        (competition) => competition.weekNumber === weekNumber
      ),
    }
  },
})

export const transitionWeek = internalMutation({
  args: {
    weekNumber: v.number(),
    newWeek: v.number(),
    players: v.array(
      v.object({
        discordId: v.string(),
        uuid: v.string(),
        ign: v.string(),
        elo: v.optional(v.number()),
        leagueTier: v.number(),
      })
    ),
  },
  handler: async (_ctx, args) => {
    return {
      success: false,
      error:
        "transitionWeek is no longer supported by the refactored competition schema.",
      weekNumber: args.weekNumber,
      newWeek: args.newWeek,
      playerCount: args.players.length,
    }
  },
})
