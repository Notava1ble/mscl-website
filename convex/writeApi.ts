import { v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import { internalMutation, type MutationCtx } from "./_generated/server"

type ApiSuccess<T extends Record<string, unknown> = Record<string, never>> = {
  ok: true
} & T

type ApiFailure = {
  ok: false
  status: number
  error: string
}

type ApiResult<T extends Record<string, unknown> = Record<string, never>> =
  | ApiSuccess<T>
  | ApiFailure

type CompetitionDoc = Doc<"competitions">
type PlayerDoc = Doc<"players">
type MatchDoc = Doc<"matches">
type RegistrationDoc = Doc<"registrations">

function fail(status: number, error: string): ApiFailure {
  console.error(`[Write API] ${status} ${error}`)
  return { ok: false, status, error }
}

async function getCompetition(
  ctx: MutationCtx,
  leagueTier: number,
  weekNumber: number
): Promise<CompetitionDoc | null> {
  return await ctx.db
    .query("competitions")
    .withIndex("by_league_and_week", (q) =>
      q.eq("leagueTier", leagueTier).eq("weekNumber", weekNumber)
    )
    .unique()
}

async function getPlayerByDiscordId(
  ctx: MutationCtx,
  discordId: string
): Promise<PlayerDoc | null> {
  for await (const player of ctx.db.query("players")) {
    if (player.discordId === discordId) return player
  }
  return null
}

async function getMatch(
  ctx: MutationCtx,
  competitionId: Id<"competitions">,
  matchNumber: number
): Promise<MatchDoc | null> {
  return await ctx.db
    .query("matches")
    .withIndex("by_competition_match", (q) =>
      q.eq("competitionId", competitionId).eq("matchNumber", matchNumber)
    )
    .unique()
}

async function getRegistration(
  ctx: MutationCtx,
  competitionId: Id<"competitions">,
  playerId: Id<"players">
): Promise<RegistrationDoc | null> {
  return await ctx.db
    .query("registrations")
    .withIndex("by_comp_and_player", (q) =>
      q.eq("competitionId", competitionId).eq("playerId", playerId)
    )
    .unique()
}

async function deleteMatchResultsForMatch(
  ctx: MutationCtx,
  matchId: Id<"matches">
): Promise<number> {
  let deleted = 0

  while (true) {
    const batch = await ctx.db
      .query("matchResults")
      .withIndex("by_match", (q) => q.eq("matchId", matchId))
      .take(128)

    if (batch.length === 0) break

    for (const result of batch) {
      await ctx.db.delete(result._id)
      deleted += 1
    }
  }

  return deleted
}

async function deleteCompetitionData(
  ctx: MutationCtx,
  competitionId: Id<"competitions">
): Promise<{
  deletedRegistrations: number
  deletedMatches: number
  deletedMatchResults: number
}> {
  let deletedMatches = 0
  let deletedMatchResults = 0
  let deletedRegistrations = 0

  while (true) {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_competition_match", (q) =>
        q.eq("competitionId", competitionId)
      )
      .take(64)

    if (matches.length === 0) break

    for (const match of matches) {
      deletedMatchResults += await deleteMatchResultsForMatch(ctx, match._id)
      await ctx.db.delete(match._id)
      deletedMatches += 1
    }
  }

  while (true) {
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_competition", (q) => q.eq("competitionId", competitionId))
      .take(128)

    if (registrations.length === 0) break

    for (const registration of registrations) {
      await ctx.db.delete(registration._id)
      deletedRegistrations += 1
    }
  }

  return { deletedRegistrations, deletedMatches, deletedMatchResults }
}

function buildPlayerPatch(args: {
  uuid?: string
  ign?: string
  lowercaseIgn?: string
  elo?: number
  currentLeagueNumber: number
}) {
  const patch: Partial<Doc<"players">> = {
    currentLeagueNumber: args.currentLeagueNumber,
  }

  if (args.uuid !== undefined) patch.uuid = args.uuid
  if (args.ign !== undefined) patch.ign = args.ign
  if (args.lowercaseIgn !== undefined) patch.lowercaseIgn = args.lowercaseIgn
  if (args.elo !== undefined) patch.elo = args.elo

  return patch
}

export const createOrRestartCompetition = internalMutation({
  args: {
    leagueTier: v.number(),
    weekNumber: v.number(),
    maxTimeLimitMs: v.number(),
    startingTime: v.number(),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    ApiResult<{
      competitionId: Id<"competitions">
      action: "created" | "restarted"
      deletedRegistrations?: number
      deletedMatches?: number
      deletedMatchResults?: number
    }>
  > => {
    const existingCompetition = await getCompetition(
      ctx,
      args.leagueTier,
      args.weekNumber
    )

    if (existingCompetition?.status === "ended") {
      return fail(403, "Week already finalized.")
    }

    if (existingCompetition?.status === "active") {
      const deleted = await deleteCompetitionData(ctx, existingCompetition._id)
      await ctx.db.patch(existingCompetition._id, {
        startingTime: args.startingTime,
        maxTimeLimitMs: args.maxTimeLimitMs,
        status: "active",
      })

      return {
        ok: true,
        action: "restarted",
        competitionId: existingCompetition._id,
        ...deleted,
      }
    }

    const competitionId = await ctx.db.insert("competitions", {
      leagueTier: args.leagueTier,
      weekNumber: args.weekNumber,
      status: "active",
      maxTimeLimitMs: args.maxTimeLimitMs,
      startingTime: args.startingTime,
    })

    return {
      ok: true,
      action: "created",
      competitionId,
    }
  },
})

export const updateCompetitionStatus = internalMutation({
  args: {
    leagueTier: v.number(),
    weekNumber: v.number(),
    status: v.union(v.literal("active"), v.literal("ended")),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    ApiResult<{ competitionId: Id<"competitions">; status: "active" | "ended" }>
  > => {
    const competition = await getCompetition(
      ctx,
      args.leagueTier,
      args.weekNumber
    )
    if (!competition) {
      return fail(404, "Competition not found.")
    }

    await ctx.db.patch(competition._id, { status: args.status })
    return { ok: true, competitionId: competition._id, status: args.status }
  },
})

export const registerPlayer = internalMutation({
  args: {
    leagueTier: v.number(),
    weekNumber: v.number(),
    discordId: v.string(),
    uuid: v.string(),
    ign: v.string(),
    elo: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    ApiResult<{
      competitionId: Id<"competitions">
      playerId: Id<"players">
      registrationCreated: boolean
    }>
  > => {
    const competition = await getCompetition(
      ctx,
      args.leagueTier,
      args.weekNumber
    )
    if (!competition) {
      return fail(404, "Competition not found.")
    }

    const normalizedLowercaseIgn = args.ign.toLowerCase()
    let player = await getPlayerByDiscordId(ctx, args.discordId)

    if (player) {
      await ctx.db.patch(
        player._id,
        buildPlayerPatch({
          uuid: args.uuid,
          ign: args.ign,
          lowercaseIgn: normalizedLowercaseIgn,
          elo: args.elo,
          currentLeagueNumber: args.leagueTier,
        })
      )
    } else {
      const playerId = await ctx.db.insert("players", {
        discordId: args.discordId,
        currentLeagueNumber: args.leagueTier,
        uuid: args.uuid,
        ign: args.ign,
        lowercaseIgn: normalizedLowercaseIgn,
        ...(args.elo !== undefined ? { elo: args.elo } : {}),
      })
      player = await ctx.db.get(playerId)
      if (!player) {
        return fail(500, "Player could not be created.")
      }
    }

    const existingRegistration = await getRegistration(
      ctx,
      competition._id,
      player._id
    )

    let registrationCreated = false
    if (!existingRegistration) {
      await ctx.db.insert("registrations", {
        competitionId: competition._id,
        playerId: player._id,
        manualAdjustmentPoints: 0,
        computedSeedPoints: 0,
        totalPoints: 0,
      })
      registrationCreated = true
    }

    return {
      ok: true,
      competitionId: competition._id,
      playerId: player._id,
      registrationCreated,
    }
  },
})

export const unregisterPlayer = internalMutation({
  args: {
    leagueTier: v.number(),
    weekNumber: v.number(),
    discordId: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    ApiResult<{
      competitionId: Id<"competitions">
      playerId: Id<"players">
      deletedMatchResults: number
    }>
  > => {
    const competition = await getCompetition(
      ctx,
      args.leagueTier,
      args.weekNumber
    )
    if (!competition) {
      return fail(404, "Competition not found.")
    }

    const player = await getPlayerByDiscordId(ctx, args.discordId)
    if (!player) {
      return fail(404, "Player not found.")
    }

    const registration = await getRegistration(ctx, competition._id, player._id)
    if (!registration) {
      return fail(404, "Registration not found.")
    }

    await ctx.db.delete(registration._id)

    let deletedMatchResults = 0
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_competition_match", (q) =>
        q.eq("competitionId", competition._id)
      )
      .take(256)

    for (const match of matches) {
      const matchResult = await ctx.db
        .query("matchResults")
        .withIndex("by_match_and_player", (q) =>
          q.eq("matchId", match._id).eq("playerId", player._id)
        )
        .unique()

      if (matchResult) {
        await ctx.db.delete(matchResult._id)
        deletedMatchResults += 1
      }
    }

    return {
      ok: true,
      competitionId: competition._id,
      playerId: player._id,
      deletedMatchResults,
    }
  },
})

export const createEmptyMatch = internalMutation({
  args: {
    leagueTier: v.number(),
    weekNumber: v.number(),
    matchNumber: v.number(),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    ApiResult<{
      competitionId: Id<"competitions">
      matchId: Id<"matches">
      created: boolean
    }>
  > => {
    const competition = await getCompetition(
      ctx,
      args.leagueTier,
      args.weekNumber
    )
    if (!competition) {
      return fail(404, "Competition not found.")
    }

    const existingMatch = await getMatch(ctx, competition._id, args.matchNumber)
    if (existingMatch) {
      return {
        ok: true,
        competitionId: competition._id,
        matchId: existingMatch._id,
        created: false,
      }
    }

    const matchId = await ctx.db.insert("matches", {
      competitionId: competition._id,
      matchNumber: args.matchNumber,
    })

    return {
      ok: true,
      competitionId: competition._id,
      matchId,
      created: true,
    }
  },
})

export const clearMatchResults = internalMutation({
  args: {
    leagueTier: v.number(),
    weekNumber: v.number(),
    matchNumber: v.number(),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    ApiResult<{
      competitionId: Id<"competitions">
      matchId: Id<"matches">
      deleted: number
    }>
  > => {
    const competition = await getCompetition(
      ctx,
      args.leagueTier,
      args.weekNumber
    )
    if (!competition) {
      return fail(404, "Competition not found.")
    }

    const match = await getMatch(ctx, competition._id, args.matchNumber)
    if (!match) {
      return fail(404, "Match not found.")
    }

    const deleted = await deleteMatchResultsForMatch(ctx, match._id)
    return {
      ok: true,
      competitionId: competition._id,
      matchId: match._id,
      deleted,
    }
  },
})

export const importMatchData = internalMutation({
  args: {
    leagueTier: v.number(),
    weekNumber: v.number(),
    matchNumber: v.number(),
    rankedMatchId: v.string(),
    results: v.array(
      v.object({
        discordId: v.string(),
        timeMs: v.union(v.number(), v.null()),
        dnf: v.boolean(),
        placement: v.union(v.number(), v.null()),
        pointsWon: v.number(),
      })
    ),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    ApiResult<{
      competitionId: Id<"competitions">
      matchId: Id<"matches">
      upserted: number
    }>
  > => {
    const competition = await getCompetition(
      ctx,
      args.leagueTier,
      args.weekNumber
    )
    if (!competition) {
      return fail(404, "Competition not found.")
    }

    const duplicateDiscordId = args.results.find(
      (result, index) =>
        args.results.findIndex(
          (entry) => entry.discordId === result.discordId
        ) !== index
    )
    if (duplicateDiscordId) {
      return fail(
        400,
        `Duplicate result for discordId ${duplicateDiscordId.discordId}.`
      )
    }

    let match = await getMatch(ctx, competition._id, args.matchNumber)
    if (match) {
      if (match.rankedMatchId !== args.rankedMatchId) {
        await ctx.db.patch(match._id, { rankedMatchId: args.rankedMatchId })
        match = await ctx.db.get(match._id)
      }
    } else {
      const matchId = await ctx.db.insert("matches", {
        competitionId: competition._id,
        matchNumber: args.matchNumber,
        rankedMatchId: args.rankedMatchId,
      })
      match = await ctx.db.get(matchId)
    }

    if (!match) {
      return fail(500, "Match could not be created.")
    }

    for (const result of args.results) {
      const player = await getPlayerByDiscordId(ctx, result.discordId)
      if (!player) {
        return fail(404, `Player not found for discordId ${result.discordId}.`)
      }

      const existingResult = await ctx.db
        .query("matchResults")
        .withIndex("by_match_and_player", (q) =>
          q.eq("matchId", match._id).eq("playerId", player._id)
        )
        .unique()

      if (existingResult) {
        await ctx.db.patch(existingResult._id, {
          timeMs: result.timeMs,
          dnf: result.dnf,
          placement: result.placement,
          pointsWon: result.pointsWon,
        })
      } else {
        await ctx.db.insert("matchResults", {
          matchId: match._id,
          playerId: player._id,
          timeMs: result.timeMs,
          dnf: result.dnf,
          placement: result.placement,
          pointsWon: result.pointsWon,
        })
      }
    }

    return {
      ok: true,
      competitionId: competition._id,
      matchId: match._id,
      upserted: args.results.length,
    }
  },
})

export const updateSingleResult = internalMutation({
  args: {
    leagueTier: v.number(),
    weekNumber: v.number(),
    matchNumber: v.number(),
    discordId: v.string(),
    timeMs: v.union(v.number(), v.null()),
    dnf: v.boolean(),
  },
  handler: async (
    ctx,
    args
  ): Promise<ApiResult<{ matchResultId: Id<"matchResults"> }>> => {
    const competition = await getCompetition(
      ctx,
      args.leagueTier,
      args.weekNumber
    )
    if (!competition) {
      return fail(404, "Competition not found.")
    }

    const match = await getMatch(ctx, competition._id, args.matchNumber)
    if (!match) {
      return fail(404, "Match not found.")
    }

    const player = await getPlayerByDiscordId(ctx, args.discordId)
    if (!player) {
      return fail(404, "Player not found.")
    }

    const matchResult = await ctx.db
      .query("matchResults")
      .withIndex("by_match_and_player", (q) =>
        q.eq("matchId", match._id).eq("playerId", player._id)
      )
      .unique()

    if (!matchResult) {
      return fail(404, "Match result not found.")
    }

    await ctx.db.patch(matchResult._id, {
      timeMs: args.timeMs,
      dnf: args.dnf,
    })

    return { ok: true, matchResultId: matchResult._id }
  },
})

export const setPointAdjustment = internalMutation({
  args: {
    leagueTier: v.number(),
    weekNumber: v.number(),
    discordId: v.string(),
    manualAdjustmentPoints: v.number(),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    ApiResult<{
      registrationId: Id<"registrations">
      manualAdjustmentPoints: number
    }>
  > => {
    const competition = await getCompetition(
      ctx,
      args.leagueTier,
      args.weekNumber
    )
    if (!competition) {
      return fail(404, "Competition not found.")
    }

    const player = await getPlayerByDiscordId(ctx, args.discordId)
    if (!player) {
      return fail(404, "Player not found.")
    }

    const registration = await getRegistration(ctx, competition._id, player._id)
    if (!registration) {
      return fail(404, "Registration not found.")
    }

    await ctx.db.patch(registration._id, {
      manualAdjustmentPoints: args.manualAdjustmentPoints,
    })

    return {
      ok: true,
      registrationId: registration._id,
      manualAdjustmentPoints: args.manualAdjustmentPoints,
    }
  },
})

export const processMovements = internalMutation({
  args: {
    leagueTier: v.number(),
    weekNumber: v.number(),
    promotedDiscordIds: v.array(v.string()),
    demotedDiscordIds: v.array(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    ApiResult<{
      competitionId: Id<"competitions">
      promotedCount: number
      demotedCount: number
      unchangedCount: number
    }>
  > => {
    const competition = await getCompetition(
      ctx,
      args.leagueTier,
      args.weekNumber
    )
    if (!competition) {
      return fail(404, "Competition not found.")
    }

    const overlap = args.promotedDiscordIds.filter((discordId) =>
      args.demotedDiscordIds.includes(discordId)
    )
    if (overlap.length > 0) {
      return fail(
        400,
        `discordId ${overlap[0]} cannot be promoted and demoted.`
      )
    }

    const promotedSet = new Set(args.promotedDiscordIds)
    const demotedSet = new Set(args.demotedDiscordIds)
    const touchedPlayerIds = new Set<Id<"players">>()

    for (const discordId of Array.from(promotedSet)) {
      const player = await getPlayerByDiscordId(ctx, discordId)
      if (!player) {
        return fail(404, `Player not found for discordId ${discordId}.`)
      }

      const registration = await getRegistration(
        ctx,
        competition._id,
        player._id
      )
      if (!registration) {
        return fail(404, `Registration not found for discordId ${discordId}.`)
      }

      await ctx.db.patch(player._id, {
        currentLeagueNumber: Math.max(1, args.leagueTier - 1),
      })
      await ctx.db.patch(registration._id, { movementStatus: "promoted" })
      touchedPlayerIds.add(player._id)
    }

    for (const discordId of Array.from(demotedSet)) {
      const player = await getPlayerByDiscordId(ctx, discordId)
      if (!player) {
        return fail(404, `Player not found for discordId ${discordId}.`)
      }

      const registration = await getRegistration(
        ctx,
        competition._id,
        player._id
      )
      if (!registration) {
        return fail(404, `Registration not found for discordId ${discordId}.`)
      }

      await ctx.db.patch(player._id, {
        currentLeagueNumber: args.leagueTier + 1,
      })
      await ctx.db.patch(registration._id, { movementStatus: "demoted" })
      touchedPlayerIds.add(player._id)
    }

    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_competition", (q) =>
        q.eq("competitionId", competition._id)
      )
      .take(512)

    let unchangedCount = 0
    for (const registration of registrations) {
      if (touchedPlayerIds.has(registration.playerId)) continue
      await ctx.db.patch(registration._id, { movementStatus: "none" })
      unchangedCount += 1
    }

    return {
      ok: true,
      competitionId: competition._id,
      promotedCount: promotedSet.size,
      demotedCount: demotedSet.size,
      unchangedCount,
    }
  },
})
