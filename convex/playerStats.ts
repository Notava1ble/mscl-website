import { v } from "convex/values"
import { query } from "./_generated/server"

export const getPlayerStats = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId)
    if (!player) return null

    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .collect()

    const competitionsById = new Map<
      string,
      {
        leagueTier: number
        weekNumber: number
        competitionId: typeof registrations[number]["competitionId"]
      }
    >()

    for (const registration of registrations) {
      const competition = await ctx.db.get(registration.competitionId)
      if (!competition) continue
      competitionsById.set(registration.competitionId, {
        competitionId: registration.competitionId,
        leagueTier: competition.leagueTier,
        weekNumber: competition.weekNumber,
      })
    }

    const leagueHistory = registrations
      .map((registration) => {
        const competition = competitionsById.get(registration.competitionId)
        if (!competition) return null

        return {
          weekNumber: competition.weekNumber,
          leagueNumber: competition.leagueTier,
          movement: registration.movementStatus ?? "none",
        }
      })
      .filter((entry) => entry !== null)
      .sort((a, b) => a.weekNumber - b.weekNumber)

    const playerResults = await ctx.db
      .query("matchResults")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .collect()

    const weeklyBreakdown = new Map<
      number,
      {
        weekNumber: number
        leagueNumber: number
        matches: number
        totalPoints: number
        totalTimeMs: number
        timedMatches: number
        matchDetails: {
          matchId: typeof playerResults[number]["matchId"]
          matchNumber: number
          placement: number | null
          pointsWon: number
          timeMs: number | null
          dnf: boolean
        }[]
      }
    >()

    for (const result of playerResults) {
      const match = await ctx.db.get(result.matchId)
      if (!match) continue

      const competition = await ctx.db.get(match.competitionId)
      if (!competition) continue

      const existingWeek = weeklyBreakdown.get(competition.weekNumber) ?? {
        weekNumber: competition.weekNumber,
        leagueNumber: competition.leagueTier,
        matches: 0,
        totalPoints: 0,
        totalTimeMs: 0,
        timedMatches: 0,
        matchDetails: [],
      }

      existingWeek.matches += 1
      existingWeek.totalPoints += result.pointsWon
      if (result.timeMs !== null) {
        existingWeek.totalTimeMs += result.timeMs
        existingWeek.timedMatches += 1
      }

      existingWeek.matchDetails.push({
        matchId: match._id,
        matchNumber: match.matchNumber,
        placement: result.placement,
        pointsWon: result.pointsWon,
        timeMs: result.timeMs,
        dnf: result.dnf,
      })

      weeklyBreakdown.set(competition.weekNumber, existingWeek)
    }

    const weeks = Array.from(weeklyBreakdown.values())
      .map((week) => ({
        ...week,
        matchDetails: week.matchDetails.sort((a, b) => a.matchNumber - b.matchNumber),
      }))
      .sort((a, b) => a.weekNumber - b.weekNumber)

    const completedTimes = playerResults
      .map((result) => result.timeMs)
      .filter((timeMs): timeMs is number => timeMs !== null)

    const avgTimeMs =
      completedTimes.length > 0
        ? Math.round(
            completedTimes.reduce((total, timeMs) => total + timeMs, 0) /
              completedTimes.length
          )
        : 0

    return {
      name: player.ign,
      elo: player.elo ?? 0,
      currentLeague: `League ${player.currentLeagueNumber}`,
      currentTier: player.currentLeagueNumber,
      leagueHistory,
      weeklyBreakdown: weeks,
      summary: {
        totalMatches: playerResults.length,
        avgTimeMs,
        bestTimeMs:
          completedTimes.length > 0 ? Math.min(...completedTimes) : 0,
      },
    }
  },
})
