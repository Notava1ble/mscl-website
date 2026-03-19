import fs from "node:fs"
import path from "node:path"

const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL
const MY_API_KEY = process.env.WRITER_API_KEY || "test_key_placeholder"

const ENDPOINT = `${CONVEX_SITE_URL}/api/write/match`

// CONFIGURATION
const WEEK_NUMBER = 2
const DATA_DIR = path.resolve(process.cwd(), "scripts/data/weekTwomatches")
const DRY_RUN = false

const getLeagueTierFromFilename = (filename: string): number => {
  const match = filename.match(/league(\d+)/i)
  return match ? parseInt(match[1], 10) : 1
}

async function run() {
  if (!CONVEX_SITE_URL) {
    console.error(
      "ERROR: PRODUCTION_CONVEX_SITE environment variable is not set."
    )
    process.exit(1)
  }

  console.log(`Scanning directory: ${DATA_DIR}`)
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`ERROR: Directory not found: ${DATA_DIR}`)
    process.exit(1)
  }

  const files = fs
    .readdirSync(DATA_DIR)
    .filter((file) => file.endsWith(".json"))

  if (files.length === 0) {
    console.warn("No .json files found in the directory.")
    return
  }

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file)
    const leagueTier = getLeagueTierFromFilename(file)
    console.log(
      `\n--- Processing file: ${file} (League Tier: ${leagueTier}) ---`
    )

    const fileContent = fs.readFileSync(filePath, "utf-8")
    let matches
    try {
      matches = JSON.parse(fileContent)
    } catch (e) {
      console.error(`Failed to parse JSON in ${file}:`, e)
      continue
    }

    if (!Array.isArray(matches)) {
      console.error(
        `Expected an array of matches in ${file}, but got ${typeof matches}`
      )
      continue
    }

    for (const match of matches) {
      console.log(
        `Ingesting Week ${WEEK_NUMBER}, League ${leagueTier}, Match ${match.matchNumber}...`
      )

      const matchData = {
        weekNumber: WEEK_NUMBER,
        matchNumber: match.matchNumber,
        rankedMatchId: match.matchId,
        leagueTier,
        results: match.results,
      }

      if (DRY_RUN) {
        console.log(
          `[DRY RUN] Would send match data for match ${match.matchNumber}`
        )
        // console.log(JSON.stringify(matchData, null, 2));
        continue
      }

      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": MY_API_KEY,
          },
          body: JSON.stringify(matchData),
        })

        const resultText = await res.text()
        if (!res.ok) {
          console.error(
            `Error ingesting match ${match.matchNumber}: ${res.status} ${res.statusText}`
          )
          console.log(resultText)
        } else {
          console.log(`Successfully ingested match ${match.matchNumber}`)
          try {
            console.log(JSON.parse(resultText))
          } catch {
            console.log(resultText)
          }
        }
      } catch (error) {
        console.error(`Fetch error for match ${match.matchNumber}:`, error)
      }
    }
  }
}

run().catch((error) => {
  console.error("Execution error:", error)
  process.exit(1)
})
