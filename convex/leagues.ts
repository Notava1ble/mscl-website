import { query } from "./_generated/server"

export const listLeagues = query({
  args: {},
  handler: async (ctx) => {
    const [players, competitions] = await Promise.all([
      ctx.db.query("players").collect(),
      ctx.db.query("competitions").collect(),
    ])

    const tiers = new Set<number>()

    for (const player of players) {
      tiers.add(player.currentLeagueNumber)
    }

    for (const competition of competitions) {
      tiers.add(competition.leagueTier)
    }

    return Array.from(tiers)
      .sort((a, b) => a - b)
      .map((leagueTier) => ({
        leagueTier,
        name: `League ${leagueTier}`,
      }))
  },
})
