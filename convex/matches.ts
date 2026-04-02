import { v } from "convex/values"
import type { Doc } from "./_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"
import {
  buildMatchWinnerPatch,
  buildMatchResultSnapshot,
  getPlayerByDiscordId as lookupPlayerByDiscordId,
} from "./lib/readModels"

async function getCompetition(
  ctx: MutationCtx | QueryCtx,
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

async function getPlayerByDiscordId(
  ctx: MutationCtx | QueryCtx,
  discordId: string
) {
  return await lookupPlayerByDiscordId(ctx, discordId)
}

export const ingestMatch = internalMutation({
  args: {
    matchNumber: v.number(),
    weekNumber: v.number(),
    leagueTier: v.number(),
    rankedMatchId: v.string(),
    results: v.array(
      v.object({
        discordId: v.string(),
        pointsWon: v.number(),
        timeMs: v.union(v.number(), v.null()),
        placement: v.union(v.number(), v.null()),
        dnf: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const competition = await getCompetition(
      ctx,
      args.weekNumber,
      args.leagueTier
    )
    if (!competition) {
      throw new Error("Competition not found")
    }

    let match = await ctx.db
      .query("matches")
      .withIndex("by_competition_match", (q) =>
        q
          .eq("competitionId", competition._id)
          .eq("matchNumber", args.matchNumber)
      )
      .unique()

    if (!match) {
      const matchId = await ctx.db.insert("matches", {
        competitionId: competition._id,
        matchNumber: args.matchNumber,
        rankedMatchId: args.rankedMatchId,
        winnerPlayerId: null,
        winnerName: null,
      })
      match = await ctx.db.get(matchId)
    } else if (match.rankedMatchId !== args.rankedMatchId) {
      await ctx.db.patch(match._id, { rankedMatchId: args.rankedMatchId })
    }

    if (!match) {
      throw new Error("Failed to create match")
    }

    const playersForWinner: Array<{
      player: Doc<"players">
      placement: number | null
    }> = []
    for (const result of args.results) {
      const player = await getPlayerByDiscordId(ctx, result.discordId)

      if (!player) {
        throw new Error(`Player not found for discordId ${result.discordId}`)
      }

      playersForWinner.push({
        player,
        placement: result.placement,
      })

      const existingResult = await ctx.db
        .query("matchResults")
        .withIndex("by_match_and_player", (q) =>
          q.eq("matchId", match._id).eq("playerId", player._id)
        )
        .unique()

      if (existingResult) {
        await ctx.db.patch(existingResult._id, {
          ...buildMatchResultSnapshot(competition, match.matchNumber),
          timeMs: result.timeMs,
          dnf: result.dnf,
          placement: result.placement,
          pointsWon: result.pointsWon,
        })
      } else {
        await ctx.db.insert("matchResults", {
          matchId: match._id,
          playerId: player._id,
          ...buildMatchResultSnapshot(competition, match.matchNumber),
          timeMs: result.timeMs,
          dnf: result.dnf,
          placement: result.placement,
          pointsWon: result.pointsWon,
        })
      }
    }

    await ctx.db.patch(match._id, buildMatchWinnerPatch(playersForWinner))

    return {
      success: true,
      competitionId: competition._id,
      matchId: match._id,
      resultsInserted: args.results.length,
    }
  },
})

export const adjustMatch = internalMutation({
  args: {
    matchNumber: v.number(),
    leagueTier: v.number(),
    weekNumber: v.number(),
    discordId: v.string(),
    points: v.number(),
  },
  handler: async (ctx, args) => {
    const competition = await getCompetition(
      ctx,
      args.weekNumber,
      args.leagueTier
    )
    if (!competition) {
      throw new Error("Competition not found")
    }

    const match = await ctx.db
      .query("matches")
      .withIndex("by_competition_match", (q) =>
        q
          .eq("competitionId", competition._id)
          .eq("matchNumber", args.matchNumber)
      )
      .unique()
    if (!match) {
      throw new Error("Match not found")
    }

    const player = await getPlayerByDiscordId(ctx, args.discordId)
    if (!player) {
      throw new Error("Player not found")
    }

    const result = await ctx.db
      .query("matchResults")
      .withIndex("by_match_and_player", (q) =>
        q.eq("matchId", match._id).eq("playerId", player._id)
      )
      .unique()
    if (!result) {
      throw new Error("Match result not found")
    }

    await ctx.db.patch(result._id, { pointsWon: args.points })

    return {
      success: true,
      matchId: match._id,
      playerId: player._id,
      points: args.points,
    }
  },
})

// This query assumes that a player only plays in one competition per week. If not, it will throw an error.
export const listPlayerMatches = internalQuery({
  args: {
    discordId: v.string(),
    weekNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const player = await getPlayerByDiscordId(ctx, args.discordId)
    if (!player) {
      throw new Error("Player not found")
    }

    const matchResults = await ctx.db
      .query("matchResults")
      .withIndex("by_week_and_player", (q) =>
        q.eq("weekNumber", args.weekNumber).eq("playerId", player._id)
      )
      .collect()

    if (matchResults.length === 0) {
      return {
        playerName: player.ign,
        weekNumber: args.weekNumber,
        leagueTier: player.currentLeagueNumber,
        matches: [],
      }
    }

    const competitionId = matchResults[0].competitionId
    const leagueTier = matchResults[0].leagueTier
    const allSameComp = matchResults.every(
      (r) => r.competitionId === competitionId
    )
    if (!allSameComp)
      throw new Error(
        `Player has results across multiple competitions in week ${args.weekNumber}`
      )

    // Only get the matches this player played in.
    const matchIds = [...new Set(matchResults.map((r) => r.matchId))]
    const matchesById = new Map(
      (await Promise.all(matchIds.map((id) => ctx.db.get(id))))
        .filter(Boolean)
        .map((m) => [m!._id, m!])
    )

    const matches = matchResults
      .sort((a, b) => a.matchNumber - b.matchNumber)
      .map((result) => ({
        rankedMatchId: matchesById.get(result.matchId)?.rankedMatchId ?? null,
        pointsWon: result.pointsWon,
        timeMs: result.timeMs,
        placement: result.placement,
        dnf: result.dnf,
      }))

    return {
      playerName: player.ign,
      weekNumber: args.weekNumber,
      currentLeagueNumber: player.currentLeagueNumber,
      weekLeagueNumber: leagueTier,
      matches,
    }
  },
})
