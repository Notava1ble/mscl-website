import { v } from "convex/values"
import { internalMutation, internalQuery, query } from "./_generated/server"
import {
  ensureLeague,
  syncPlayerRegistrationSnapshots,
} from "./lib/readModels"

export const listPlayersInLeague = query({
  args: {
    leagueTier: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_league", (q) =>
        q.eq("currentLeagueNumber", args.leagueTier)
      )
      .collect()
  },
})

export const getPlayerByName = internalQuery({
  args: {
    ign: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_ign", (q) => q.eq("ign", args.ign))
      .unique()
  },
})

export const createOrUpdatePlayers = internalMutation({
  args: {
    players: v.array(
      v.object({
        discordId: v.string(),
        uuid: v.string(),
        ign: v.string(),
        elo: v.optional(v.number()),
        leagueTier: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const player of args.players) {
      const lowercaseIgn = player.ign.toLowerCase()
      await ensureLeague(ctx, player.leagueTier)

      const existingByDiscord = await ctx.db
        .query("players")
        .withIndex("by_discord_id", (q) => q.eq("discordId", player.discordId))
        .unique()

      if (existingByDiscord) {
        await ctx.db.patch(existingByDiscord._id, {
          uuid: player.uuid,
          ign: player.ign,
          lowercaseIgn,
          elo: player.elo,
          currentLeagueNumber: player.leagueTier,
        })
        const updatedPlayer = await ctx.db.get(existingByDiscord._id)
        if (updatedPlayer) {
          await syncPlayerRegistrationSnapshots(ctx, updatedPlayer._id, updatedPlayer)
        }
        continue
      }

      const existingByIgn = await ctx.db
        .query("players")
        .withIndex("by_lowercase_ign", (q) =>
          q.eq("lowercaseIgn", lowercaseIgn)
        )
        .unique()

      if (existingByIgn) {
        await ctx.db.patch(existingByIgn._id, {
          discordId: player.discordId,
          uuid: player.uuid,
          ign: player.ign,
          lowercaseIgn,
          elo: player.elo,
          currentLeagueNumber: player.leagueTier,
        })
        continue
      }

      await ctx.db.insert("players", {
        discordId: player.discordId,
        uuid: player.uuid,
        ign: player.ign,
        lowercaseIgn,
        currentLeagueNumber: player.leagueTier,
        ...(player.elo !== undefined ? { elo: player.elo } : {}),
      })
    }

    return { success: true, count: args.players.length }
  },
})
