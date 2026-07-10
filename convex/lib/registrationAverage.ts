import type { Doc } from "../_generated/dataModel"

type MatchResultForAverage = Pick<Doc<"matchResults">, "dnf" | "timeMs">

/**
 * Computes a registration's average over its imported match results.
 * A DNF (or a legacy result without a time) is treated as the competition cap.
 */
export function calculateRegistrationAverageTimeMs(
  results: MatchResultForAverage[],
  maxTimeLimitMs: number
): number | null {
  if (results.length === 0) return null

  const totalTimeMs = results.reduce(
    (total, result) =>
      total +
      (result.dnf || result.timeMs === null ? maxTimeLimitMs : result.timeMs),
    0
  )

  return totalTimeMs / results.length
}
