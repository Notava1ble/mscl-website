import Players from "./data/players"

const CONVEX_SITE_URL = process.env.PRODUCTION_CONVEX_SITE
const MY_API_KEY = process.env.WRITER_API_KEY || "test_key_placeholder"

const ENDPOINT = `${CONVEX_SITE_URL}/api/write/players`

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": MY_API_KEY,
  },
  body: JSON.stringify(
    Players.map((p) => ({
      name: p.name,
      elo: p.elo,
      leagueTier: p.league,
    }))
  ),
})

console.log(await res.json())
