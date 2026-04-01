import { v } from "convex/values"
import { query, type QueryCtx } from "./_generated/server"

async function getCompetitionByWeekAndLeague(
  ctx: QueryCtx,
  weekNumber: number,
  leagueTier: number
) {
  return await ctx.db
    .query("competitions")
    .withIndex("by_league_and_week", (q) =>
      q.eq("leagueTier", leagueTier).eq("weekNumber", weekNumber)
    )
    .unique()
}

export const getAllWeeks = query({
  args: {},
  handler: async (ctx) => {
    const competitions = await ctx.db.query("competitions").collect()
    const weeks = new Map<number, { weekNumber: number; isActive: boolean }>()

    for (const competition of competitions) {
      const existing = weeks.get(competition.weekNumber)
      weeks.set(competition.weekNumber, {
        weekNumber: competition.weekNumber,
        isActive:
          competition.status === "active" || existing?.isActive === true,
      })
    }

    return Array.from(weeks.values()).sort((a, b) => b.weekNumber - a.weekNumber)
  },
})

export const getWeekMatches = query({
  args: {
    weekNumber: v.number(),
    leagueTier: v.number(),
  },
  handler: async (ctx, args) => {
    const competition = await getCompetitionByWeekAndLeague(
      ctx,
      args.weekNumber,
      args.leagueTier
    )
    if (!competition) return []

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_competition_match", (q) =>
        q.eq("competitionId", competition._id)
      )
      .collect()

    const matchesWithWinner = await Promise.all(
      matches.map(async (match) => {
        const results = await ctx.db
          .query("matchResults")
          .withIndex("by_match", (q) => q.eq("matchId", match._id))
          .collect()

        const winner = results
          .filter((result) => result.placement !== null)
          .sort((a, b) => (a.placement ?? Number.MAX_SAFE_INTEGER) - (b.placement ?? Number.MAX_SAFE_INTEGER))[0]

        const winnerPlayer = winner ? await ctx.db.get(winner.playerId) : null

        return {
          _id: match._id,
          matchNumber: match.matchNumber,
          rankedMatchId: match.rankedMatchId ?? null,
          winnerName: winnerPlayer?.ign ?? "Unknown",
        }
      })
    )

    return matchesWithWinner.sort((a, b) => a.matchNumber - b.matchNumber)
  },
})

export const getWeekStandings = query({
  args: {
    weekNumber: v.number(),
    leagueTier: v.number(),
  },
  handler: async (ctx, args) => {
    const competition = await getCompetitionByWeekAndLeague(
      ctx,
      args.weekNumber,
      args.leagueTier
    )
    if (!competition) return []

    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_competition", (q) => q.eq("competitionId", competition._id))
      .collect()

    const populated = await Promise.all(
      registrations.map(async (registration) => {
        const player = await ctx.db.get(registration.playerId)

        return {
          playerId: registration.playerId,
          name: player?.ign ?? "Unknown",
          totalPoints: registration.totalPoints,
          movement: (registration.movementStatus ?? null) as
            | "promoted"
            | "demoted"
            | "none"
            | null,
          elo: player?.elo ?? 0,
        }
      })
    )

    populated.sort((a, b) => {
      const pointsDiff = b.totalPoints - a.totalPoints
      if (pointsDiff !== 0) return pointsDiff
      const eloDiff = b.elo - a.elo
      if (eloDiff !== 0) return eloDiff
      return a.name.localeCompare(b.name)
    })

    return populated.map(({ elo: _elo, ...row }, index) => ({
      ...row,
      rank: index + 1,
    }))
  },
})

export const getPlayerWeekPlacements = query({
  args: {
    weekNumber: v.number(),
    leagueTier: v.number(),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const competition = await getCompetitionByWeekAndLeague(
      ctx,
      args.weekNumber,
      args.leagueTier
    )
    if (!competition) return []

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_competition_match", (q) =>
        q.eq("competitionId", competition._id)
      )
      .collect()

    const placements = (
      await Promise.all(
        matches.map(async (match) => {
          const result = await ctx.db
            .query("matchResults")
            .withIndex("by_match_and_player", (q) =>
              q.eq("matchId", match._id).eq("playerId", args.playerId)
            )
            .unique()

          if (!result) return null

          return {
            matchId: match._id,
            matchNumber: match.matchNumber,
            placement: result.placement,
            pointsWon: result.pointsWon,
            timeMs: result.timeMs,
            dnf: result.dnf,
          }
        })
      )
    ).filter((result) => result !== null)

    return placements.sort((a, b) => a.matchNumber - b.matchNumber)
  },
})
