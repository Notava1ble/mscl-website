import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"

function formatTime(ms: number): string {
  if (ms === 0) return "-"
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const millis = ms % 1000
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`
}

const ELO_TIERS = [
  {
    min: 2000,
    label: "Netherite",
    color: "text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-500/10",
  },
  {
    min: 1500,
    label: "Diamond",
    color: "text-sky-300",
    border: "border-sky-400/30",
    bg: "bg-sky-400/10",
  },
  {
    min: 1200,
    label: "Emerald",
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
  },
  {
    min: 900,
    label: "Gold",
    color: "text-yellow-400",
    border: "border-yellow-500/30",
    bg: "bg-yellow-500/10",
  },
  {
    min: 500,
    label: "Iron",
    color: "text-neutral-200",
    border: "border-neutral-400/30",
    bg: "bg-neutral-400/10",
  },
  {
    min: 0,
    label: "Coal",
    color: "text-neutral-500",
    border: "border-neutral-600/30",
    bg: "bg-neutral-600/10",
  },
] as const

function getTier(elo: number) {
  return ELO_TIERS.find((tier) => elo >= tier.min) ?? ELO_TIERS[ELO_TIERS.length - 1]
}

function MovementBadge({
  movement,
}: {
  movement: "promoted" | "demoted" | "none"
}) {
  switch (movement) {
    case "promoted":
      return (
        <Badge className="border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0 text-[10px] text-emerald-400">
          Promoted
        </Badge>
      )
    case "demoted":
      return (
        <Badge className="border-red-500/20 bg-red-500/10 px-1.5 py-0 text-[10px] text-red-400">
          Demoted
        </Badge>
      )
    case "none":
      return (
        <Badge className="border-neutral-500/20 bg-neutral-500/10 px-1.5 py-0 text-[10px] text-neutral-400">
          Stayed
        </Badge>
      )
  }
}

interface PlayerStatsPanelProps {
  playerId: Id<"players"> | null
  open: boolean
  onClose: () => void
}

export function PlayerStatsPanel({
  playerId,
  open,
  onClose,
}: PlayerStatsPanelProps) {
  const stats = useQuery(
    api.playerStats.getPlayerStats,
    playerId ? { playerId } : "skip"
  )

  const tier = stats ? getTier(stats.elo) : null

  const mergedWeeks = stats
    ? stats.weeklyBreakdown.map((week) => {
        const historyEntry = stats.leagueHistory.find(
          (entry) => entry.weekNumber === week.weekNumber
        )

        return {
          ...week,
          leagueNumber: historyEntry?.leagueNumber ?? week.leagueNumber,
          movement: historyEntry?.movement ?? "none",
        }
      })
    : []

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-hidden border-l border-primary/10 p-0 sm:max-w-md"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{stats?.name ?? "Player Stats"}</SheetTitle>
          <SheetDescription>
            {stats
              ? `${stats.currentLeague} · ${stats.elo} ELO`
              : "Loading player data..."}
          </SheetDescription>
        </SheetHeader>

        {!stats ? (
          <LoadingSkeleton />
        ) : (
          <div className="flex h-full flex-col overflow-y-auto">
            <div
              className={cn(
                "border-b border-primary/10 px-6 pt-8 pb-6",
                "bg-linear-to-b from-primary/5 to-transparent"
              )}
            >
              <p className="mb-1 text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
                Player
              </p>
              <h2 className="mb-4 font-minecraft text-2xl leading-none tracking-tight uppercase">
                {stats.name}
              </h2>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-5 items-center rounded-sm border px-2 font-minecraft text-[10px] leading-none tracking-wider uppercase",
                    tier?.color,
                    tier?.border,
                    tier?.bg
                  )}
                >
                  {tier?.label}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  ({stats.elo} ELO)
                </span>
                <span className="text-xs text-muted-foreground/30">·</span>
                <span className="text-xs text-muted-foreground">
                  {stats.currentLeague}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 divide-x divide-primary/10 border-b border-primary/10">
              <StatCell
                label="Matches"
                value={String(stats.summary.totalMatches)}
              />
              <StatCell
                label="Avg Time"
                value={formatTime(stats.summary.avgTimeMs)}
              />
              <StatCell
                label="Best Time"
                value={formatTime(stats.summary.bestTimeMs)}
                highlight
              />
            </div>

            <div className="flex flex-col gap-3 px-6 py-6">
              <h4 className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
                Weekly Breakdown
              </h4>

              {mergedWeeks.length === 0 ? (
                <p className="text-[10px] tracking-wider text-muted-foreground uppercase">
                  No match data yet.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {mergedWeeks.map((week) => (
                    <div
                      key={week.weekNumber}
                      className="overflow-hidden rounded-sm border border-primary/10 bg-primary/3"
                    >
                      <div className="flex items-center justify-between border-b border-primary/10 bg-primary/4 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-minecraft text-xs tracking-wider text-foreground/90 uppercase">
                            Week {week.weekNumber}
                          </span>
                          <span className="text-[9px] tracking-wider text-muted-foreground uppercase">
                            · League {week.leagueNumber}
                          </span>
                        </div>
                        <MovementBadge movement={week.movement} />
                      </div>

                      <div className="grid grid-cols-3 divide-x divide-primary/10 px-0 py-0">
                        <div className="flex flex-col px-3 py-2.5">
                          <span className="text-[9px] tracking-wider text-muted-foreground uppercase">
                            Points
                          </span>
                          <span className="mt-0.5 text-sm font-medium text-primary tabular-nums">
                            {week.totalPoints}
                          </span>
                        </div>
                        <div className="flex flex-col px-3 py-2.5">
                          <span className="text-[9px] tracking-wider text-muted-foreground uppercase">
                            Avg Time
                          </span>
                          <span className="mt-0.5 text-sm tabular-nums">
                            {formatTime(
                              week.timedMatches > 0
                                ? Math.round(week.totalTimeMs / week.timedMatches)
                                : 0
                            )}
                          </span>
                        </div>
                        <div className="flex flex-col px-3 py-2.5">
                          <span className="text-[9px] tracking-wider text-muted-foreground uppercase">
                            Matches
                          </span>
                          <span className="mt-0.5 text-sm text-muted-foreground tabular-nums">
                            {week.matches}
                          </span>
                        </div>
                      </div>

                      {week.matchDetails.length > 0 && (
                        <div className="border-t border-primary/10 px-3 pt-1.5 pb-3">
                          <span className="mb-1.5 block text-[9px] tracking-wider text-muted-foreground uppercase">
                            Match Placements
                          </span>
                          <div className="flex flex-col gap-1">
                            {week.matchDetails.map((match) => (
                              <div
                                key={match.matchId}
                                className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums"
                              >
                                <span className="text-[9px] tracking-wider text-muted-foreground/80 uppercase">
                                  Match {match.matchNumber}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">
                                    {match.dnf
                                      ? "DNF"
                                      : match.placement !== null
                                        ? `#${match.placement}`
                                        : "-"}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground/70">
                                    {formatTime(match.timeMs ?? 0)} · {match.pointsWon} pts
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function StatCell({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-3 py-4">
      <span className="text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
        {label}
      </span>
      <span
        className={cn(
          "text-sm leading-none font-medium tabular-nums",
          highlight && "text-primary"
        )}
      >
        {value}
      </span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-primary/10 px-6 pt-8 pb-6">
        <Skeleton className="h-3 w-12 rounded-sm" />
        <Skeleton className="h-7 w-40 rounded-sm" />
        <Skeleton className="h-5 w-36 rounded-sm" />
      </div>
      <div className="grid grid-cols-3 divide-x divide-primary/10 border-b border-primary/10">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 px-3 py-4">
            <Skeleton className="h-2 w-12 rounded-sm" />
            <Skeleton className="h-4 w-16 rounded-sm" />
          </div>
        ))}
      </div>
      <div className="space-y-3 px-6 py-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-sm" />
        ))}
      </div>
    </div>
  )
}
