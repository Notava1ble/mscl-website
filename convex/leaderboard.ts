import { v } from "convex/values"
import { query } from "./_generated/server"

export const getLeagueStandings = query({
  args: {
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_league", (q) => q.eq("currentLeagueId", args.leagueId))
      .collect()

    // Sort by elo descending
    players.sort((a, b) => b.elo - a.elo)

    return players.map((p, i) => ({
      rank: i + 1,
      playerId: p._id,
      name: p.name,
      elo: p.elo,
    }))
  },
})
