import { internalMutation, query } from "./_generated/server"
import { v } from "convex/values"

export const getCurrentWeek = query({
  args: {},
  handler: async (ctx) => {
    const weeks = await ctx.db.query("weeks").collect()
    const activeWeeks = weeks.filter((week) => week.activeCompetitionCount > 0)

    if (activeWeeks.length > 0) {
      const weekNumber = Math.max(...activeWeeks.map((week) => week.weekNumber))
      const competitions = await ctx.db
        .query("competitions")
        .withIndex("by_week_number", (q) => q.eq("weekNumber", weekNumber))
        .collect()

      return {
        weekNumber,
        competitions: competitions.filter(
          (competition) => competition.status === "active"
        ),
      }
    }

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
