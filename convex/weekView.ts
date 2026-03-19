import { v } from "convex/values"
import { query } from "./_generated/server"

export const getAllWeeks = query({
  handler: async (ctx) => {
    const weeks = await ctx.db.query("weeks").collect()
    // Sort descending by weekNumber
    return weeks.sort((a, b) => b.weekNumber - a.weekNumber)
  },
})

export const getWeekMatches = query({
  args: {
    weekId: v.id("weeks"),
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_week_and_league", (q) =>
        q.eq("weekId", args.weekId).eq("leagueId", args.leagueId)
      )
      .collect()

    // For each match, return the winner
    const matchesWithWinner = await Promise.all(
      matches.map(async (match) => {
        const results = await ctx.db
          .query("matchResults")
          .withIndex("by_match", (q) => q.eq("matchId", match._id))
          .collect()

        const winnerResult = results.find((r) => r.placement === 1)
        let winnerName = "Unknown"
        if (winnerResult) {
          const p = await ctx.db.get(winnerResult.playerId)
          if (p) winnerName = p.name
        }

        return {
          _id: match._id,
          matchNumber: match.matchNumber,
          rankedMatchId: match.rankedMatchId,
          winnerName,
        }
      })
    )

    matchesWithWinner.sort((a, b) => a.matchNumber - b.matchNumber)
    return matchesWithWinner
  },
})

export const getWeekStandings = query({
  args: {
    weekId: v.id("weeks"),
    leagueId: v.id("leagues"),
  },
  handler: async (ctx, args) => {
    const targetWeek = await ctx.db.get(args.weekId)
    if (!targetWeek) return []

    if (!targetWeek.isCurrent) {
      // return from weeklyStandings table
      const standings = await ctx.db
        .query("weeklyStandings")
        .withIndex("by_week", (q) => q.eq("weekId", args.weekId))
        .filter((q) => q.eq(q.field("leagueId"), args.leagueId))
        .collect()

      const populated = await Promise.all(
        standings.map(async (st) => {
          const player = await ctx.db.get(st.playerId)
          return {
            playerId: st.playerId,
            name: player?.name ?? "Unknown",
            rank: st.finalPlacement,
            totalPoints: st.totalPoints,
            movement: st.movement,
          }
        })
      )
      return populated.sort((a, b) => a.rank - b.rank)
    } else {
      // aggregate dynamically
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_week_and_league", (q) =>
          q.eq("weekId", args.weekId).eq("leagueId", args.leagueId)
        )
        .collect()

      const pointsMap = new Map<
        import("./_generated/dataModel").Id<"players">,
        number
      >()
      const playerSet = new Set<
        import("./_generated/dataModel").Id<"players">
      >()

      for (const match of matches) {
        const results = await ctx.db
          .query("matchResults")
          .withIndex("by_match", (q) => q.eq("matchId", match._id))
          .collect()

        for (const res of results) {
          playerSet.add(res.playerId)
          pointsMap.set(
            res.playerId,
            (pointsMap.get(res.playerId) ?? 0) + res.pointsWon
          )
        }
      }

      const playersList = Array.from(playerSet)
      const populated = await Promise.all(
        playersList.map(async (pId) => {
          const p = await ctx.db.get(pId)
          return {
            playerId: pId,
            name: p?.name ?? "Unknown",
            totalPoints: pointsMap.get(pId) ?? 0,
            movement: null, // "potentialRelegation" handled by UI based on rank and league rules
          }
        })
      )

      populated.sort((a, b) => {
        return b.totalPoints - a.totalPoints
      })

      return populated.map((p, i) => ({ ...p, rank: i + 1 }))
    }
  },
})

export const getPlayerWeekPlacements = query({
  args: {
    weekId: v.id("weeks"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    // Get all matches for this week
    const matches = await ctx.db
      .query("matches")
      .filter((q) => q.eq(q.field("weekId"), args.weekId))
      .collect()

    const matchIds = new Set(matches.map((m) => m._id))
    const matchMap = new Map(matches.map((m) => [m._id, m]))

    // Get results for this player
    const playerResults = await ctx.db
      .query("matchResults")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .collect()

    // Filter and resolve
    const weekResults = playerResults.filter((res) => matchIds.has(res.matchId))

    const placements = weekResults.map((res) => {
      const match = matchMap.get(res.matchId)
      return {
        matchId: res.matchId,
        matchNumber: match?.matchNumber ?? 0,
        placement: res.placement,
        pointsWon: res.pointsWon,
        timeMs: res.timeMs,
      }
    })

    placements.sort((a, b) => a.matchNumber - b.matchNumber)
    return placements
  },
})
