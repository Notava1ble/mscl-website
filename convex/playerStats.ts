import { v } from "convex/values"
import { query } from "./_generated/server"

export const getPlayerStats = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    // 1. Get player info
    const player = await ctx.db.get(args.playerId)
    if (!player) return null

    // Get current league info
    const currentLeague = await ctx.db.get(player.currentLeagueId)

    // 2. Get all weekly standings for this player (league history + movement)
    const allStandings = await ctx.db.query("weeklyStandings").collect()
    const playerStandings = allStandings.filter(
      (s) => s.playerId === args.playerId
    )

    // Build league history with week info
    const leagueHistory = await Promise.all(
      playerStandings.map(async (standing) => {
        const week = await ctx.db.get(standing.weekId)
        return {
          weekNumber: week?.weekNumber ?? 0,
          leagueNumber: standing.leagueNumber,
          movement: standing.movement,
          weekId: standing.weekId,
        }
      })
    )
    leagueHistory.sort((a, b) => a.weekNumber - b.weekNumber)

    // 3. Get all match results for this player
    const allResults = await ctx.db.query("matchResults").collect()
    const playerResults = allResults.filter((r) => r.playerId === args.playerId)

    // Group by match -> week
    const weeklyBreakdown: Record<
      string,
      {
        weekNumber: number
        matches: number
        totalPoints: number
        totalTimeMs: number
        times: number[]
      }
    > = {}

    for (const result of playerResults) {
      const match = await ctx.db.get(result.matchId)
      if (!match) continue

      const week = await ctx.db.get(match.weekId)
      if (!week) continue

      const weekKey = week._id
      if (!weeklyBreakdown[weekKey]) {
        weeklyBreakdown[weekKey] = {
          weekNumber: week.weekNumber,
          matches: 0,
          totalPoints: 0,
          totalTimeMs: 0,
          times: [],
        }
      }

      weeklyBreakdown[weekKey].matches++
      weeklyBreakdown[weekKey].totalPoints += result.pointsWon
      weeklyBreakdown[weekKey].totalTimeMs += result.timeMs
      weeklyBreakdown[weekKey].times.push(result.timeMs)
    }

    const weeks = Object.values(weeklyBreakdown).sort(
      (a, b) => a.weekNumber - b.weekNumber
    )

    // 4. Compute summary stats
    const allTimes = playerResults.map((r) => r.timeMs)
    const totalMatches = playerResults.length
    const avgTimeMs =
      allTimes.length > 0
        ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length
        : 0
    const bestTimeMs = allTimes.length > 0 ? Math.min(...allTimes) : 0

    return {
      name: player.name,
      elo: player.elo,
      currentLeague: currentLeague?.name ?? "Unknown",
      currentTier: currentLeague?.tierLevel ?? 0,
      leagueHistory,
      weeklyBreakdown: weeks,
      summary: {
        totalMatches,
        avgTimeMs: Math.round(avgTimeMs),
        bestTimeMs,
      },
    }
  },
})
