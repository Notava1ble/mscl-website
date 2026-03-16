import matches from "./data/wk1league5matches"

const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL
const MY_API_KEY = process.env.WRITER_API_KEY || "test_key_placeholder"

const ENDPOINT = `${CONVEX_SITE_URL}/api/write/match`

// CONFIGURATION
const numberOfMatches = Object.keys(matches.matches).length
type matchNumber = 1 | 2 | 3 | 4 | 5 | 6
const leagueTier = 5

const prepareMatchData = (match: typeof matches, matchNumber: matchNumber) => {
  return {
    weekNumber: 1,
    matchNumber: matchNumber,
    leagueTier,
    results: match.matches[`${matchNumber}`]
      .filter((p) => p.played === true)
      .map((res) => ({
        playerName: res.player,
        pointsWon: res.pts,
        placement: res.rank,
        timeMs: res.time * 1000, // convert seconds to ms
      })),
  }
}

for (let i = 1; i <= numberOfMatches; i++) {
  console.log(`Ingesting match ${i}...`)
  const matchData = prepareMatchData(matches, i as matchNumber)

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": MY_API_KEY,
    },
    body: JSON.stringify(matchData),
  })
  console.log(await res.json())
}
