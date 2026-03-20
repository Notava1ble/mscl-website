import week3Registrations from "./data/week3regs"

const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL
const MY_API_KEY = process.env.WRITER_API_KEY || "test_key_placeholder"

const ENDPOINT = `${CONVEX_SITE_URL}/api/write/weeks/transition`

console.log(`Preparing standings data for week 2...`)

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": MY_API_KEY,
  },
  body: JSON.stringify({
    weekNumber: 2,
    newWeek: 3,
    players: week3Registrations.map((p) => ({
      name: p.name,
      elo: p.elo,
      leagueTier: p.league,
    })),
  }),
})
console.log(await res.json())
