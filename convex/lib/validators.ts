import { z } from "zod"

const positiveInt = (field: string) =>
  z.int(`${field} must be an integer.`).min(1, `${field} must be at least 1.`)

const nonEmptyString = (field: string) =>
  z.string(`${field} must be a string.`).min(1, `${field} must not be empty.`)

export const CompetitionSchema = z.object({
  leagueTier: positiveInt("leagueTier"),
  weekNumber: positiveInt("weekNumber"),
  maxTimeLimitMs: z
    .number("maxTimeLimitMs must be a number.")
    .nonnegative("maxTimeLimitMs must be at least 0."),
  startingTime: z.number("startingTime must be a number."),
})

export const CompetitionStatusSchema = z.object({
  leagueTier: positiveInt("leagueTier"),
  weekNumber: positiveInt("weekNumber"),
  status: z.enum(["active", "ended"], {
    error: "status must be either 'active' or 'ended'.",
  }),
})

export const RegisterPlayerSchema = z.object({
  leagueTier: positiveInt("leagueTier"),
  weekNumber: positiveInt("weekNumber"),
  discordId: nonEmptyString("discordId"),
  uuid: z.string("uuid must be a string.").min(1),
  ign: z.string("ign must be a string.").min(1),
  elo: z.number("elo must be a number.").optional(),
})

export const UnregisterPlayerSchema = z.object({
  leagueTier: positiveInt("leagueTier"),
  weekNumber: positiveInt("weekNumber"),
  discordId: nonEmptyString("discordId"),
})

export const UpdatePlayerLeagueSchema = z.object({
  discordId: nonEmptyString("discordId"),
  leagueTier: positiveInt("leagueTier"),
})

export const CreateEmptyMatchSchema = z.object({
  leagueTier: positiveInt("leagueTier"),
  weekNumber: positiveInt("weekNumber"),
  matchNumber: positiveInt("matchNumber"),
})

export const ClearMatchResultsSchema = CreateEmptyMatchSchema

export const MatchResultImportSchema = z.object({
  discordId: nonEmptyString("results[].discordId"),
  timeMs: z.union([z.number("results[].timeMs must be a number."), z.null()]),
  dnf: z.boolean("results[].dnf must be a boolean."),
  placement: z.union([
    z
      .int("results[].placement must be an integer.")
      .min(1, "results[].placement must be at least 1."),
    z.null(),
  ]),
  pointsWon: z.number("results[].pointsWon must be a number."),
})

export const ImportMatchSchema = z.object({
  leagueTier: positiveInt("leagueTier"),
  weekNumber: positiveInt("weekNumber"),
  matchNumber: positiveInt("matchNumber"),
  rankedMatchId: nonEmptyString("rankedMatchId"),
  results: z.array(MatchResultImportSchema, "results must be an array."),
})

export const UpdateSingleResultSchema = z.object({
  leagueTier: positiveInt("leagueTier"),
  weekNumber: positiveInt("weekNumber"),
  matchNumber: positiveInt("matchNumber"),
  discordId: nonEmptyString("discordId"),
  timeMs: z.union([z.number("timeMs must be a number."), z.null()]),
  dnf: z.boolean("dnf must be a boolean."),
})

export const PointAdjustmentSchema = z.object({
  leagueTier: positiveInt("leagueTier"),
  weekNumber: positiveInt("weekNumber"),
  discordId: nonEmptyString("discordId"),
  manualAdjustmentPoints: z.number("manualAdjustmentPoints must be a number."),
})

export const MovementSchema = z
  .object({
    leagueTier: positiveInt("leagueTier"),
    weekNumber: positiveInt("weekNumber"),
    promotedDiscordIds: z.array(
      z.string("promotedDiscordIds entries must be strings.").min(1),
      "promotedDiscordIds must be an array."
    ),
    demotedDiscordIds: z.array(
      z.string("demotedDiscordIds entries must be strings.").min(1),
      "demotedDiscordIds must be an array."
    ),
  })
  .superRefine((value, ctx) => {
    const demotedLookup = new Set(value.demotedDiscordIds)
    const overlap = value.promotedDiscordIds.filter((discordId) =>
      demotedLookup.has(discordId)
    )
    if (overlap.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: "A discordId cannot be both promoted and demoted.",
        path: ["promotedDiscordIds"],
      })
    }
  })
