import { mutation } from "./_generated/server"
import { v } from "convex/values"
import { internalMutation } from "./_generated/server"

export const ingestMatch = internalMutation({
  args: {
    matchNumber: v.number(),
    weekNumber: v.number(),
    leagueTier: v.number(),
    rankedMatchId: v.string(),
    results: v.array(
      v.object({
        playerName: v.string(),
        pointsWon: v.number(),
        timeMs: v.number(),
        placement: v.number(),
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
        weekNumber: args.weekNumber,
        isCurrent: true,
      })
      targetWeek = await ctx.db.get(weekId)
      if (!targetWeek) {
        console.error(`[Internal Error] Failed to create week record ${args.weekNumber}`)
        throw new Error("Failed to create current week")
      }
    }

    // Find league
    let league = await ctx.db
      .query("leagues")
      .withIndex("by_tier_level", (q) => q.eq("tierLevel", args.leagueTier))
      .first()

    // Autocreate league if it doesnt exist
    if (!league) {
      const leagueId = await ctx.db.insert("leagues", {
        name: `League ${args.leagueTier}`,
        tierLevel: args.leagueTier,
      })
      league = await ctx.db.get(leagueId)
      if (!league) {
        console.error(`[Internal Error] Failed to create league tier ${args.leagueTier}`)
        throw new Error("Failed to create league")
      }
    }

    // Upsert match
    let match = await ctx.db
      .query("matches")
      .withIndex("by_week_league_match", (q) =>
        q
          .eq("weekId", targetWeek._id)
          .eq("leagueId", league._id)
          .eq("matchNumber", args.matchNumber)
      )
      .first()

    // Delete existing match results for this match if it exists so we can insert the new ones
    if (match) {
      if (match.rankedMatchId !== args.rankedMatchId) {
        await ctx.db.patch(match._id, { rankedMatchId: args.rankedMatchId })
      }
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
        rankedMatchId: args.rankedMatchId,
        matchNumber: args.matchNumber,
      })
      match = await ctx.db.get(matchId)
      if (!match) {
        console.error(`[Internal Error] Failed to create match entry ${args.matchNumber} in league ${args.leagueTier}`)
        throw new Error("Failed to create match")
      }
    }

    // Insert results
    const seenPlacements = new Set<number>()
    for (const res of args.results) {
      if (seenPlacements.has(res.placement)) {
        console.error(`[Validation] Duplicate placement ${res.placement} in match results`)
        throw new Error("Duplicate placement detected within match results")
      }
      if (!Number.isInteger(res.placement) || res.placement < 1) {
        console.error(`[Validation] Invalid placement ${res.placement} for ${res.playerName}`)
        throw new Error("Placement must be a positive integer")
      }
      seenPlacements.add(res.placement)

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
        if (!player) {
          console.error(`[Internal Error] Failed to create player ${res.playerName}`)
          throw new Error("Failed to create player")
        }
      }

      await ctx.db.insert("matchResults", {
        matchId: match._id,
        playerId: player._id,
        pointsWon: res.pointsWon,
        timeMs: res.timeMs,
        placement: res.placement,
      })
    }

    return {
      success: true,
      matchId: match._id,
      resultsInserted: args.results.length,
    }
  },
})
