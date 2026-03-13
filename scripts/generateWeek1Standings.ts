import standings from "./data/wk1standings"

const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL
const MY_API_KEY = process.env.WRITER_API_KEY || "test_key_placeholder"

const ENDPOINT = `${CONVEX_SITE_URL}/api/write/weeks/transition`

console.log(`Preparing standings data for week 1...`)

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": MY_API_KEY,
  },
  body: JSON.stringify({
    weekNumber: 1,
    newWeek: 2,
    players: standings.map((p) => ({
      name: p.player,
      elo: p.elo,
      leagueTier: p.league,
    })),
  }),
})
console.log(await res.json())
