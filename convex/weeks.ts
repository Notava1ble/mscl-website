import { query, internalMutation } from "./_generated/server"
import { v } from "convex/values"

export const getCurrentWeek = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("weeks")
      .withIndex("by_current", (q) => q.eq("isCurrent", true))
      .first()
  },
})

export const transitionWeek = internalMutation({
  args: {
    weekNumber: v.number(),
    newWeek: v.number(),
    players: v.array(
      v.object({
        name: v.string(),
        elo: v.number(),
        leagueTier: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Find or create the week record for weekNumber
    let week = await ctx.db
      .query("weeks")
      .withIndex("by_week_number", (q) => q.eq("weekNumber", args.weekNumber))
      .first()

    if (week) {
      const existingStandings = await ctx.db
        .query("weeklyStandings")
        .withIndex("by_week", (q) => q.eq("weekId", week!._id))
        .collect()

      if (existingStandings.length > 0) {
        console.error(`[Business Logic] Standings for week ${args.weekNumber} already exist. Aborting transition.`)
        return {
          success: false,
          error: `Standings for week ${args.weekNumber} already exist.`,
          status: 409,
        }
      }
    } else {
      // If the week doesn't exist, create it (this is theoretically not needed since the transition should only be run after a week is created, but safety i guess)
      const weekId = await ctx.db.insert("weeks", {
        weekNumber: args.weekNumber,
        isCurrent: false,
      })
      week = await ctx.db.get(weekId)
      if (!week) {
        console.error(`[Internal Error] Failed to create week record for weekNumber ${args.weekNumber}`)
        throw new Error("Failed to create week record")
      }
    }

    // Cache league IDs to avoid repeated queries
    const leagueCache = new Map<
      number,
      import("./_generated/dataModel").Id<"leagues">
    >()

    const getLeagueId = async (tier: number) => {
      if (!leagueCache.has(tier)) {
        const league = await ctx.db
          .query("leagues")
          .withIndex("by_tier_level", (q) => q.eq("tierLevel", tier))
          .first()
        const leagueId = league
          ? league._id
          : await ctx.db.insert("leagues", {
              name: `Tier ${tier}`,
              tierLevel: tier,
            })
        leagueCache.set(tier, leagueId)
      }
      return leagueCache.get(tier)!
    }

    // Upsert all players and group by OLD league tier
    // leagueTier in args is the NEW league after promotion/relegation.
    // We group by the old league because that's where matches were played this week.
    type PlayerEntry = {
      playerId: import("./_generated/dataModel").Id<"players">
      oldLeagueTier: number
      movement: "promoted" | "relegated" | "stayed" | "new"
    }

    const leagueGroups = new Map<number, PlayerEntry[]>()

    for (const p of args.players) {
      const newLeagueId = await getLeagueId(p.leagueTier)

      let player = await ctx.db
        .query("players")
        .withIndex("by_name", (q) => q.eq("name", p.name))
        .first()

      let movement: "promoted" | "relegated" | "stayed" | "new" = "new"
      // For new players there is no old league, so fall back to their new tier
      let oldLeagueTier = p.leagueTier

      if (player) {
        const oldLeague = await ctx.db.get(player.currentLeagueId)
        if (oldLeague) {
          oldLeagueTier = oldLeague.tierLevel
          if (oldLeague.tierLevel > p.leagueTier) movement = "promoted"
          else if (oldLeague.tierLevel < p.leagueTier) movement = "relegated"
          else movement = "stayed"
        }
        await ctx.db.patch(player._id, {
          elo: p.elo,
          currentLeagueId: newLeagueId,
        })
      } else {
        const playerId = await ctx.db.insert("players", {
          name: p.name,
          elo: p.elo,
          currentLeagueId: newLeagueId,
        })
        player = (await ctx.db.get(playerId))!
        if (!player) {
          console.error(`[Internal Error] Failed to find or create player ${p.name}`)
          throw new Error("Failed to create player")
        }
      }

      // Group by OLD tier so we can later calculate the standings for that tier
      const group = leagueGroups.get(oldLeagueTier) ?? []
      group.push({ playerId: player._id, oldLeagueTier, movement })
      leagueGroups.set(oldLeagueTier, group)
    }

    // Per old league, sum points and rank players
    for (const [oldTier, entries] of leagueGroups) {
      const oldLeagueId = await getLeagueId(oldTier)

      // Fetch all matches played in this league during this week
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_week_and_league", (q) =>
          q.eq("weekId", week._id).eq("leagueId", oldLeagueId)
        )
        .collect()

      // Accumulate totalPoints per player across all matches in this league
      const pointsMap = new Map<
        import("./_generated/dataModel").Id<"players">,
        number
      >()

      for (const match of matches) {
        const results = await ctx.db
          .query("matchResults")
          .withIndex("by_match", (q) => q.eq("matchId", match._id))
          .collect()

        for (const result of results) {
          const current = pointsMap.get(result.playerId) ?? 0
          pointsMap.set(result.playerId, current + result.pointsWon)
        }
      }

      // Sort descending by totalPoints to assign finalPlacement
      const sorted = [...entries].sort((a, b) => {
        const pointsA = pointsMap.get(a.playerId) ?? 0
        const pointsB = pointsMap.get(b.playerId) ?? 0
        return pointsB - pointsA
      })

      // Insert weeklyStandings — leagueId/leagueNumber reflect the league they competed in
      let placement = 1
      for (let i = 0; i < sorted.length; i++) {
        const { playerId, movement } = sorted[i]
        const totalPoints = pointsMap.get(playerId) ?? 0

        // Skip players who didn't participate in any matches
        if (totalPoints === 0 && !pointsMap.has(playerId)) continue
        await ctx.db.insert("weeklyStandings", {
          weekId: week!._id,
          weekNumber: args.weekNumber,
          leagueId: oldLeagueId,
          leagueNumber: oldTier,
          playerId,
          totalPoints: pointsMap.get(playerId) ?? 0,
          finalPlacement: placement,
          movement,
        })
        placement++
      }
    }

    // Advance the current week
    const allCurrentWeeks = await ctx.db
      .query("weeks")
      .withIndex("by_current", (q) => q.eq("isCurrent", true))
      .collect()

    for (const cw of allCurrentWeeks) {
      await ctx.db.patch(cw._id, { isCurrent: false })
    }

    const nextWeek = await ctx.db
      .query("weeks")
      .withIndex("by_week_number", (q) => q.eq("weekNumber", args.newWeek))
      .first()

    if (nextWeek) {
      await ctx.db.patch(nextWeek._id, { isCurrent: true })
    } else {
      await ctx.db.insert("weeks", {
        weekNumber: args.newWeek,
        isCurrent: true,
      })
    }

    return { success: true, count: args.players.length }
  },
})
