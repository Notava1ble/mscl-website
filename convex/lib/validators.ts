import { z } from "zod"

export const PlayersSchema = z.array(
  z.object({
    name: z
      .string("You must provide a name for each player.")
      .min(1, "Name must be at least 1 character long."),
    elo: z
      .int("You must provide an elo for each player.")
      .min(1, "Elo must be at least 1."),
    leagueTier: z
      .int("You must provide a league tier for each player.")
      .min(1, "League tier must be at least 1.")
      .max(6, "League tier must be at most 6."),
  }),
  "You must provide an array of players."
)
