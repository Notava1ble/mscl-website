import { v } from "convex/values"
import { internalQuery, query } from "./_generated/server"

export const listPlayersInLeague = query({
  args: {
    leagueTier: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_league", (q) =>
        q.eq("currentLeagueNumber", args.leagueTier)
      )
      .collect()
  },
})

export const getPlayerByName = internalQuery({
  args: {
    ign: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_ign", (q) => q.eq("ign", args.ign))
      .unique()
  },
})
