import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import MatchData from "./MatchData"

export function DetailsPanel({
  weekId,
  playerId,
  matchId,
  rankedMatchId,
  playerStats,
  showBorder = true,
}: {
  weekId: string | null
  playerId: string | null
  matchId: string | null
  rankedMatchId: string | null
  playerStats: { name: string; totalPoints: number; rank: number } | null
  showBorder?: boolean
}) {
  if (playerId && weekId && playerStats) {
    return (
      <div
        className={cn(
          "bg-muted/10 p-6 lg:p-8",
          showBorder && "rounded-3xl border border-border"
        )}
      >
        <PlayerDetails
          weekId={weekId as Id<"weeks">}
          playerId={playerId as Id<"players">}
          stats={playerStats}
        />
      </div>
    )
  }

  if (matchId) {
    return (
      <div
        className={cn(
          "flex min-h-75 flex-col items-center justify-center bg-muted/10 p-6",
          showBorder && "rounded-3xl border border-border"
        )}
      >
        <MatchData matchId={rankedMatchId} />
      </div>
    )
  }

  return null
}

function PlayerDetails({
  weekId,
  playerId,
  stats,
}: {
  weekId: Id<"weeks">
  playerId: Id<"players">
  stats: { name: string; totalPoints: number; rank: number }
}) {
  const placements = useQuery(api.weekView.getPlayerWeekPlacements, {
    weekId,
    playerId,
  })

  if (placements === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-50" />
        <Skeleton className="h-4 w-37.5" />
        <div className="mt-8 flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col font-minecraft">
      <div className="mb-6 flex flex-col gap-2 border-b border-border/50 pb-6">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-muted-foreground">
            #{stats.rank}
          </span>
          <a
            className="text-xl tracking-widest text-foreground hover:underline"
            href={`https://mcsrranked.com/stats/${stats.name}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {stats.name}
          </a>
        </div>
        <p className="space-x-2 text-sm text-foreground">
          <span className="font-bold">{stats.totalPoints}</span>
          <span>total points -</span>
          <span>{placements.length} matches</span>
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {placements.map((p) => {
          const placementText =
            p.placement === 1
              ? "1st"
              : p.placement === 2
                ? "2nd"
                : p.placement === 3
                  ? "3rd"
                  : `${p.placement}th`

          const isPodium = p.placement <= 3
          const isWinner = p.placement === 1

          return (
            <div key={p.matchId} className="flex flex-row items-center">
              <span className="w-32 text-sm text-muted-foreground capitalize max-md:w-20">
                Match {p.matchNumber}
              </span>
              <span
                className={`w-20 text-sm font-bold tracking-tight ${isWinner ? "text-yellow-500" : isPodium ? "text-foreground" : "text-muted-foreground"}`}
              >
                {p.pointsWon === 0 ? "DNF" : placementText}
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">
                +{p.pointsWon} points
              </span>
            </div>
          )
        })}
        {placements.length === 0 && (
          <div className="py-4 text-sm text-muted-foreground opacity-50">
            No match records found...
          </div>
        )}
      </div>
    </div>
  )
}
