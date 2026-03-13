import { mutation } from "./_generated/server"
import { v } from "convex/values"
import { internalMutation } from "./_generated/server"

export const ingestMatch = internalMutation({
  args: {
    matchNumber: v.number(),
    weekNumber: v.number(),
    leagueTier: v.number(),
    results: v.array(
      v.object({
        playerName: v.string(),
        pointsWon: v.number(),
        timeMs: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Find current week
    let targetWeek = await ctx.db
      .query("weeks")
      .withIndex("by_week_number", (q) => q.eq("weekNumber", args.weekNumber))
      .first()

    // Autocreate week if it doesnt exist
    if (!targetWeek) {
      const weekId = await ctx.db.insert("weeks", {
        weekNumber: 1,
        isCurrent: true,
      })
      targetWeek = await ctx.db.get(weekId)
      if (!targetWeek) throw new Error("Failed to create current week")
    }

    // Find league
    let league = await ctx.db
      .query("leagues")
      .withIndex("by_tier_level", (q) => q.eq("tierLevel", args.leagueTier))
      .first()

    // Autocreate league if it doesnt exist
    if (!league) {
      const leagueId = await ctx.db.insert("leagues", {
        name: `Tier ${args.leagueTier}`,
        tierLevel: args.leagueTier,
      })
      league = await ctx.db.get(leagueId)
      if (!league) throw new Error("Failed to create league")
    }

    // Upsert match
    let match = await ctx.db
      .query("matches")
      .withIndex("by_week_league_match", (q) =>
        q
          .eq("weekId", targetWeek!._id)
          .eq("leagueId", league!._id)
          .eq("matchNumber", args.matchNumber)
      )
      .first()

    // Delete existing match results for this match if it exists so we can insert the new ones
    if (match) {
      const existingResults = await ctx.db
        .query("matchResults")
        .withIndex("by_match", (q) => q.eq("matchId", match!._id))
        .collect()

      for (const res of existingResults) {
        await ctx.db.delete(res._id)
      }
    } else {
      const matchId = await ctx.db.insert("matches", {
        weekId: targetWeek._id,
        leagueId: league._id,
        matchNumber: args.matchNumber,
      })
      match = await ctx.db.get(matchId)
      if (!match) throw new Error("Failed to create match")
    }

    // Insert results
    for (const res of args.results) {
      // Find or create player
      let player = await ctx.db
        .query("players")
        .withIndex("by_name", (q) => q.eq("name", res.playerName))
        .first()

      if (!player) {
        const playerId = await ctx.db.insert("players", {
          name: res.playerName,
          elo: 0, // Default ELO if not provided
          currentLeagueId: league._id,
        })
        player = await ctx.db.get(playerId)
        if (!player) throw new Error("Failed to create player")
      }

      await ctx.db.insert("matchResults", {
        matchId: match._id,
        playerId: player._id,
        pointsWon: res.pointsWon,
        timeMs: res.timeMs,
      })
    }

    return {
      success: true,
      matchId: match._id,
      resultsInserted: args.results.length,
    }
  },
})
