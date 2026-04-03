import { internalMutation, query } from "./_generated/server"
import { v } from "convex/values"

export const getCurrentWeek = query({
  args: {},
  handler: async (ctx) => {
    const activeWeeks = await ctx.db
      .query("weeks")
      .withIndex("by_active_comp_count", (q) =>
        q.gt("activeCompetitionCount", 0)
      )
      .collect()

    if (activeWeeks.length === 0) return null

    const weekNumber = Math.max(...activeWeeks.map((week) => week.weekNumber))
    const competitions = await ctx.db
      .query("competitions")
      .withIndex("by_week_number", (q) => q.eq("weekNumber", weekNumber))
      .collect()

    return {
      weekNumber,
      competitions: competitions.filter(
        (competition) => competition.status === "active"
      ),
    }
  },
})

export const transitionWeek = internalMutation({
  args: {
    weekNumber: v.number(),
    newWeek: v.number(),
    players: v.array(
      v.object({
        uuid: v.string(),
        ign: v.string(),
        elo: v.optional(v.number()),
        leagueTier: v.number(),
      })
    ),
  },
  handler: async (_ctx, args) => {
    return {
      success: false,
      error:
        "transitionWeek is no longer supported by the refactored competition schema.",
      weekNumber: args.weekNumber,
      newWeek: args.newWeek,
      playerCount: args.players.length,
    }
  },
})

// Temporary for this week
export const transitionWeekFromText = internalMutation({
  args: {
    weekNumber: v.number(),
    newWeek: v.number(),
    promotionString: v.string(), // Pass your text here
  },
  handler: async (ctx, args) => {
    // 1. Week Idempotency Check
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
        return {
          success: false,
          error: `Standings for week ${args.weekNumber} already exist.`,
        }
      }
    } else {
      const weekId = await ctx.db.insert("weeks", {
        weekNumber: args.weekNumber,
        isCurrent: false,
      })
      week = await ctx.db.get(weekId)
    }

    // 2. Cache League IDs
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

    // 3. Parse the input string to figure out who is moving
    const lines = args.promotionString.split("\n")
    let currentMode: "promoted" | "relegated" | null = null
    const movementTargets = new Map<
      string,
      { mode: "promoted" | "relegated"; newTier: number }
    >()

    for (let line of lines) {
      line = line.trim()
      if (!line) continue

      if (line.toLowerCase().startsWith("promoted")) {
        currentMode = "promoted"
        continue
      } else if (line.toLowerCase().startsWith("demoted")) {
        currentMode = "relegated"
        continue
      }

      const match = line.match(/^(\d+):\s*(.*)$/)
      if (match && currentMode) {
        const baseTier = parseInt(match[1], 10)
        // Assuming: Promoted from tier 2 goes to tier 1. Demoted from 1 goes to 2.
        const newTier = currentMode === "promoted" ? baseTier - 1 : baseTier + 1

        const cleanStr = match[2].replace(/\([^)]*\)/g, "")
        const playerNames = cleanStr
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p.length > 0)

        for (const name of playerNames) {
          movementTargets.set(name, { mode: currentMode, newTier })
        }
      }
    }

    type Movement = "promoted" | "relegated" | "stayed" | "new"
    const movementMap = new Map<
      import("./_generated/dataModel").Id<"players">,
      Movement
    >()

    // 4. Process ALL players (since we need standings for everyone)
    const allPlayers = await ctx.db.query("players").collect()

    for (const player of allPlayers) {
      const target = movementTargets.get(player.name)
      let movement: Movement = "stayed"
      let newLeagueId = player.currentLeagueId

      if (target) {
        movement = target.mode
        newLeagueId = await getLeagueId(target.newTier)
      }

      // Update the player (we don't update ELO because we don't have it)
      if (newLeagueId !== player.currentLeagueId) {
        await ctx.db.patch(player._id, { currentLeagueId: newLeagueId })
      }
      movementMap.set(player._id, movement)
    }

    // 5. Calculate Standings (Exactly like transitionWeek)
    const allWeekMatches = await ctx.db
      .query("matches")
      .withIndex("by_week_and_league", (q) => q.eq("weekId", week!._id))
      .collect()

    const leagueTiersThisWeek = new Set<number>()
    for (const match of allWeekMatches) {
      const league = await ctx.db.get(match.leagueId)
      if (league) leagueTiersThisWeek.add(league.tierLevel)
    }

    const allResultsByMatch = new Map()
    for (const match of allWeekMatches) {
      const results = await ctx.db
        .query("matchResults")
        .withIndex("by_match", (q) => q.eq("matchId", match._id))
        .collect()
      allResultsByMatch.set(match._id, results)
    }

    for (const oldTier of leagueTiersThisWeek) {
      const oldLeagueId = await getLeagueId(oldTier)
      const matches = allWeekMatches.filter((m) => m.leagueId === oldLeagueId)

      const pointsMap = new Map<
        import("./_generated/dataModel").Id<"players">,
        number
      >()

      for (const match of matches) {
        for (const result of allResultsByMatch.get(match._id) ?? []) {
          pointsMap.set(
            result.playerId,
            (pointsMap.get(result.playerId) ?? 0) + result.pointsWon
          )
        }
      }

      const sorted = [...pointsMap.entries()].sort(([, a], [, b]) => b - a)

      let placement = 1
      for (const [playerId, totalPoints] of sorted) {
        await ctx.db.insert("weeklyStandings", {
          weekId: week!._id,
          weekNumber: args.weekNumber,
          leagueId: oldLeagueId,
          leagueNumber: oldTier,
          playerId,
          totalPoints,
          finalPlacement: placement,
          movement: movementMap.get(playerId) ?? "stayed",
        })
        placement++
      }
    }

    // 6. Advance the current week (Exactly like transitionWeek)
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

    return { success: true, processedPlayersCount: allPlayers.length }
  },
})
