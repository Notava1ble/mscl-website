import { z } from "zod"

export const PlayersSchema = z.array(
  z.object({
    name: z
      .string("You must provide a name for each player.")
      .min(1, "Name must be at least 1 character long."),
    elo: z
      .int("You must provide an elo for each player.")
      .min(0, "Elo must be at least 0."),
    leagueTier: z
      .int("You must provide a league tier for each player.")
      .min(1, "League tier must be at least 1.")
      .max(6, "League tier must be at most 6."),
  }),
  "You must provide an array of players."
)

export const MatchSchema = z.object({
  weekNumber: z
    .int("weekNumber must be an integer.")
    .min(1, "weekNumber must be at least 1."),
  matchNumber: z
    .int("matchNumber must be an integer.")
    .min(1, "matchNumber must be at least 1."),
  leagueTier: z
    .int("leagueTier must be an integer.")
    .min(1, "leagueTier must be at least 1.")
    .max(6, "leagueTier must be at most 6."),
  rankedMatchId: z.string("rankedMatchId must be a string."),
  results: z.array(
    z.object({
      playerName: z
        .string("playerName must be a string.")
        .min(1, "playerName must be at least 1 character long."),
      pointsWon: z.number("pointsWon must be a number."),
      timeMs: z.number("timeMs must be a number."),
      placement: z
        .int("placement must be an integer.")
        .min(1, "placement must be at least 1."),
    }),
    "results must be an array."
  ),
})

export const WeekTransitionSchema = z.object({
  weekNumber: z
    .int("weekNumber must be an integer.")
    .min(1, "weekNumber must be at least 1."),
  newWeek: z
    .int("newWeek must be an integer.")
    .min(1, "newWeek must be at least 1."),
  players: z.array(
    z.object({
      name: z
        .string("name must be a string.")
        .min(1, "name must be at least 1 character long."),
      elo: z.int("elo must be an integer.").min(0, "elo must be at least 0."),
      leagueTier: z
        .int("leagueTier must be an integer.")
        .min(1, "leagueTier must be at least 1.")
        .max(6, "leagueTier must be at most 6."),
    }),
    "players must be an array."
  ),
})
