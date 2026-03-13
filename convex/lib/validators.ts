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
  weekNumber: z.number().int().min(1),
  matchNumber: z.number().int().min(1),
  leagueTier: z.number().int().min(1).max(6),
  results: z.array(
    z.object({
      playerName: z.string().min(1),
      pointsWon: z.number(),
      timeMs: z.number(),
    })
  ),
})

export const WeekTransitionSchema = z.object({
  weekNumber: z.number().int().min(1),
  overwrite: z.boolean().default(false),
  players: z.array(
    z.object({
      name: z.string().min(1),
      elo: z.number().int().min(0),
      leagueTier: z.number().int().min(1).max(6),
    })
  ),
})
