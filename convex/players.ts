import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const listPlayersInLeague = query({
  args: {
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_league", (q) => q.eq("currentLeagueId", args.leagueId))
      .order("desc")
      .collect()
  },
})
