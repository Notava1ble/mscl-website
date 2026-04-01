// This project assumes a fresh database, so read/write models do not include
// legacy-data fallbacks or backfill compatibility paths.
import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"

type DbCtx = MutationCtx | QueryCtx

type RegistrationSnapshot = {
  playerIgn: string
  playerElo: number
  weekNumber: number
  leagueTier: number
}

type MatchResultSnapshot = {
  competitionId: Id<"competitions">
  weekNumber: number
  leagueTier: number
  matchNumber: number
}

export function getLeagueName(leagueTier: number) {
  return `League ${leagueTier}`
}

export async function getPlayerByDiscordId(
  ctx: DbCtx,
  discordId: string
): Promise<Doc<"players"> | null> {
  return await ctx.db
    .query("players")
    .withIndex("by_discord_id", (q) => q.eq("discordId", discordId))
    .unique()
}

export async function getLeagueByTier(
  ctx: DbCtx,
  leagueTier: number
): Promise<Doc<"leagues"> | null> {
  return await ctx.db
    .query("leagues")
    .withIndex("by_league_tier", (q) => q.eq("leagueTier", leagueTier))
    .unique()
}

export async function ensureLeague(
  ctx: MutationCtx,
  leagueTier: number
): Promise<Id<"leagues">> {
  const existing = await getLeagueByTier(ctx, leagueTier)
  if (existing) return existing._id

  return await ctx.db.insert("leagues", {
    leagueTier,
    name: getLeagueName(leagueTier),
  })
}

export async function getWeekSummary(
  ctx: DbCtx,
  weekNumber: number
): Promise<Doc<"weeks"> | null> {
  return await ctx.db
    .query("weeks")
    .withIndex("by_week_number", (q) => q.eq("weekNumber", weekNumber))
    .unique()
}

export async function applyWeekCompetitionDelta(
  ctx: MutationCtx,
  weekNumber: number,
  delta: number
) {
  const existing = await getWeekSummary(ctx, weekNumber)
  if (!existing) {
    return await ctx.db.insert("weeks", {
      weekNumber,
      activeCompetitionCount: Math.max(0, delta),
    })
  }

  return await ctx.db.patch(existing._id, {
    activeCompetitionCount: Math.max(0, existing.activeCompetitionCount + delta),
  })
}

export async function ensureWeekHasActiveCompetition(
  ctx: MutationCtx,
  weekNumber: number
) {
  const existing = await getWeekSummary(ctx, weekNumber)
  if (!existing) {
    return await ctx.db.insert("weeks", {
      weekNumber,
      activeCompetitionCount: 1,
    })
  }

  if (existing.activeCompetitionCount > 0) {
    return existing._id
  }

  await ctx.db.patch(existing._id, { activeCompetitionCount: 1 })
  return existing._id
}

export function buildRegistrationSnapshot(
  player: Pick<Doc<"players">, "ign" | "elo">,
  competition: Pick<Doc<"competitions">, "weekNumber" | "leagueTier">
): RegistrationSnapshot {
  return {
    playerIgn: player.ign,
    playerElo: player.elo ?? 0,
    weekNumber: competition.weekNumber,
    leagueTier: competition.leagueTier,
  }
}

export function buildMatchResultSnapshot(
  competition: Pick<Doc<"competitions">, "_id" | "weekNumber" | "leagueTier">,
  matchNumber: number
): MatchResultSnapshot {
  return {
    competitionId: competition._id,
    weekNumber: competition.weekNumber,
    leagueTier: competition.leagueTier,
    matchNumber,
  }
}

export async function syncPlayerRegistrationSnapshots(
  ctx: MutationCtx,
  playerId: Id<"players">,
  player: Pick<Doc<"players">, "ign" | "elo">
) {
  const registrations = await ctx.db
    .query("registrations")
    .withIndex("by_player", (q) => q.eq("playerId", playerId))
    .collect()

  const playerElo = player.elo ?? 0
  for (const registration of registrations) {
    if (
      registration.playerIgn === player.ign &&
      registration.playerElo === playerElo
    ) {
      continue
    }

    await ctx.db.patch(registration._id, {
      playerIgn: player.ign,
      playerElo,
    })
  }
}
