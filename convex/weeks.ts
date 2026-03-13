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
    overwrite: v.boolean(),
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
        if (!args.overwrite) {
          return {
            success: false,
            error: `Standings for week ${args.weekNumber} already exist. Pass overwrite=true to replace them.`,
            status: 409,
          }
        }
        for (const st of existingStandings) {
          await ctx.db.delete(st._id)
        }
      }
    } else {
      // If the week doesn't exist, create it (this is theoretically not needed since the transition should only be run after a week is created, but safety i guess)
      const weekId = await ctx.db.insert("weeks", {
        weekNumber: args.weekNumber,
        isCurrent: false,
      })
      week = await ctx.db.get(weekId)
      if (!week) throw new Error("Failed to create week record")
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

    // Process all players
    for (const p of args.players) {
      const finalLeagueId = await getLeagueId(p.leagueTier)

      let player = await ctx.db
        .query("players")
        .withIndex("by_name", (q) => q.eq("name", p.name))
        .first()

      let movement: "promoted" | "relegated" | "stayed" | "new" = "new"

      if (player) {
        const oldLeague = await ctx.db.get(player.currentLeagueId)
        if (oldLeague) {
          if (oldLeague.tierLevel > p.leagueTier) movement = "promoted"
          else if (oldLeague.tierLevel < p.leagueTier) movement = "relegated"
          else movement = "stayed"
        }
        await ctx.db.patch(player._id, {
          elo: p.elo,
          currentLeagueId: finalLeagueId,
        })
      } else {
        const playerId = await ctx.db.insert("players", {
          name: p.name,
          elo: p.elo,
          currentLeagueId: finalLeagueId,
        })
        player = await ctx.db.get(playerId)
        if (!player) throw new Error("Failed to create player")
      }

      await ctx.db.insert("weeklyStandings", {
        weekId: week!._id,
        weekNumber: args.weekNumber,
        playerId: player._id,
        movement,
      })
    }

    // Mark all weeks as not current, then create the new current week
    const allCurrentWeeks = await ctx.db
      .query("weeks")
      .withIndex("by_current", (q) => q.eq("isCurrent", true))
      .collect()

    for (const cw of allCurrentWeeks) {
      await ctx.db.patch(cw._id, { isCurrent: false })
    }

    await ctx.db.insert("weeks", { weekNumber: args.newWeek, isCurrent: true })

    return { success: true, count: args.players.length }
  },
})
