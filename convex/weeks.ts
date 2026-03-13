import { query, internalMutation } from "./_generated/server"
import { v } from "convex/values"

export const getCurrentWeek = query({
  handler: async (ctx) => {
    const currentWeek = await ctx.db
      .query("weeks")
      .withIndex("by_current", (q) => q.eq("isCurrent", true))
      .first()
    return currentWeek
  },
})

export const transitionWeek = internalMutation({
  args: {
    weekNumber: v.number(),
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
    // Check if the week already exists
    let newWeek = await ctx.db
      .query("weeks")
      .withIndex("by_week_number", (q) => q.eq("weekNumber", args.weekNumber))
      .first()

    if (newWeek) {
      if (!args.overwrite) {
        throw new Error(
          `Week ${args.weekNumber} already exists. Pass overwrite=true to replace its standings. BEWARE THAT THIS CAN RESULT IN LOSS OF DATA IF NOT USED CAREFULLY!`
        )
      } else {
        // Overwrite mode: delete existing standings for this week
        const existingStandings = await ctx.db
          .query("weeklyStandings")
          .withIndex("by_week_and_player", (q) => q.eq("weekId", newWeek!._id))
          .collect()

        for (const st of existingStandings) {
          await ctx.db.delete(st._id)
        }
      }
    } else {
      // Mark current weeks as not current
      const currentWeeks = await ctx.db
        .query("weeks")
        .withIndex("by_current", (q) => q.eq("isCurrent", true))
        .collect()

      for (const cw of currentWeeks) {
        await ctx.db.patch(cw._id, { isCurrent: false })
      }

      // Create new week
      const weekId = await ctx.db.insert("weeks", {
        weekNumber: args.weekNumber,
        isCurrent: true,
      })
      newWeek = await ctx.db.get(weekId)
      if (!newWeek) throw new Error("Failed to create new week")
    }

    // Cache the resolved league IDs to avoid repeated unneeded queries
    const leagueCache = new Map<
      number,
      import("./_generated/dataModel").Id<"leagues">
    >()

    const getLeagueId = async (tier: number) => {
      let leagueId = leagueCache.get(tier)
      if (!leagueId) {
        const league = await ctx.db
          .query("leagues")
          .withIndex("by_tier_level", (q) => q.eq("tierLevel", tier))
          .first()
        if (league) {
          leagueId = league._id
        } else {
          leagueId = await ctx.db.insert("leagues", {
            name: `Tier ${tier}`,
            tierLevel: tier,
          })
        }
        leagueCache.set(tier, leagueId)
      }
      return leagueId
    }

    // 2. Process all players for the transition
    for (const p of args.players) {
      const finalLeagueId = await getLeagueId(p.leagueTier)

      let player = await ctx.db
        .query("players")
        .withIndex("by_name", (q) => q.eq("name", p.name))
        .first()

      let movement: "promoted" | "relegated" | "stayed" | "new" = "new"

      if (player) {
        // Compare tiers
        const oldLeague = await ctx.db.get(player.currentLeagueId)
        if (oldLeague) {
          if (oldLeague.tierLevel > p.leagueTier) {
            // Lower number = higher tier (usually)
            movement = "promoted"
          } else if (oldLeague.tierLevel < p.leagueTier) {
            movement = "relegated"
          } else {
            movement = "stayed"
          }
        }

        // Update existing player
        await ctx.db.patch(player._id, {
          elo: p.elo,
          currentLeagueId: finalLeagueId,
        })
      } else {
        // Create new player
        const playerId = await ctx.db.insert("players", {
          name: p.name,
          elo: p.elo,
          currentLeagueId: finalLeagueId,
        })
        player = await ctx.db.get(playerId)
        if (!player) throw new Error("Failed to create player")
      }

      // Insert standing record
      await ctx.db.insert("weeklyStandings", {
        weekId: newWeek._id,
        playerId: player._id,
        movement,
      })
    }

    return { success: true, count: args.players.length }
  },
})
