import { v } from "convex/values"
import { internalMutation, query } from "./_generated/server"

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

export const createOrUpdatePlayers = internalMutation({
  args: {
    players: v.array(
      v.object({
        name: v.string(),
        elo: v.number(),
        leagueTier: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Cache the resolved league IDs to avoid repeated unneeded queries
    const leagueCache = new Map<number, string>()

    for (const p of args.players) {
      let leagueId = leagueCache.get(p.leagueTier)

      if (!leagueId) {
        // Find existing league
        const league = await ctx.db
          .query("leagues")
          .withIndex("by_tier_level", (q) => q.eq("tierLevel", p.leagueTier))
          .first()

        if (league) {
          leagueId = league._id
        } else {
          // Auto-create league if it doesn't exist
          leagueId = await ctx.db.insert("leagues", {
            name: `League ${p.leagueTier}`,
            tierLevel: p.leagueTier,
          })
        }
        leagueCache.set(p.leagueTier, leagueId)
      }

      // Ensure we type-cast the cached string back to an Id
      const finalLeagueId =
        leagueId as import("./_generated/dataModel").Id<"leagues">

      const existingPlayer = await ctx.db
        .query("players")
        .withIndex("by_name", (q) => q.eq("name", p.name))
        .first()

      if (existingPlayer) {
        await ctx.db.patch(existingPlayer._id, {
          elo: p.elo,
          currentLeagueId: finalLeagueId,
        })
      } else {
        await ctx.db.insert("players", {
          name: p.name,
          elo: p.elo,
          currentLeagueId: finalLeagueId,
        })
      }
    }

    return { success: true, count: args.players.length }
  },
})
