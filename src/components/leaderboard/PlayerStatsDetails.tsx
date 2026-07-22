import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "convex/react"
import { Clock, Trophy, Zap } from "lucide-react"
import type { ReactNode } from "react"
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
  return (
    ELO_TIERS.find((tier) => elo >= tier.min) ?? ELO_TIERS[ELO_TIERS.length - 1]
  )
}

function MovementBadge({
  movement,
}: {
  movement: "promoted" | "demoted" | "none"
}) {
  switch (movement) {
    case "promoted":
      return (
        <Badge className="border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] tracking-wider text-emerald-400 uppercase">
          Promoted
        </Badge>
      )
    case "demoted":
      return (
        <Badge className="border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-[10px] tracking-wider text-red-400 uppercase">
          Demoted
        </Badge>
      )
    case "none":
      return (
        <Badge className="border-neutral-500/20 bg-neutral-500/10 px-2.5 py-0.5 text-[10px] tracking-wider text-neutral-400 uppercase">
          Stayed
        </Badge>
      )
  }
}

interface PlayerStatsDetailsProps {
  playerId: Id<"players"> | null
}

export function PlayerStatsDetails({ playerId }: PlayerStatsDetailsProps) {
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

  if (!playerId) {
    return (
      <div className="flex h-full min-h-87.5 flex-col items-center justify-center rounded-xl border border-dashed border-primary/20 bg-card px-6 py-12 text-center">
        <Trophy className="mb-4 h-12 w-12 text-muted-foreground/45" />
        <h3 className="font-minecraft text-lg tracking-wider text-muted-foreground uppercase">
          No Player Selected
        </h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground/80">
          Select a player from the league list on the right to inspect their
          match history, speedrun times, and league status.
        </p>
      </div>
    )
  }

  if (!stats) {
    return <LoadingSkeleton />
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="relative overflow-hidden rounded-xl border border-primary/10 bg-card px-6 py-5 md:px-8 md:py-6">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-semibold tracking-[0.25em] text-muted-foreground uppercase">
              Player Profile
            </p>
            <h2 className="font-minecraft text-3xl tracking-tight text-foreground uppercase md:text-4xl">
              {stats.name}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "inline-flex h-6 items-center rounded-md border px-2.5 font-minecraft text-xs leading-none tracking-wider uppercase",
                  tier?.color,
                  tier?.border,
                  tier?.bg
                )}
              >
                {tier?.label}
              </span>
              <span className="font-minecraft text-sm text-muted-foreground tabular-nums">
                {stats.elo} ELO
              </span>
              <span className="text-muted-foreground/30">/</span>
              <span className="text-sm font-medium text-muted-foreground">
                {stats.currentLeague}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:ml-auto sm:max-w-xl sm:min-w-[20rem]">
            <ProfileMetric
              icon={<Zap className="h-3.5 w-3.5 text-yellow-500" />}
              label="Matches Played"
              value={String(stats.summary.totalMatches)}
            />
            <ProfileMetric
              icon={<Clock className="h-3.5 w-3.5 text-sky-400" />}
              label="Average Time"
              value={formatTime(stats.summary.avgTimeMs)}
            />
            <ProfileMetric
              icon={<Trophy className="h-3.5 w-3.5 text-emerald-400" />}
              label="Best Time"
              value={formatTime(stats.summary.bestTimeMs)}
              highlight
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="pl-1 text-[11px] font-semibold tracking-[0.3em] text-muted-foreground uppercase">
          Weekly breakdown
        </h4>

        {mergedWeeks.length === 0 ? (
          <div className="rounded-xl border border-primary/10 bg-card py-8 text-center">
            <p className="font-minecraft text-xs tracking-wider text-muted-foreground uppercase">
              No match data recorded yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {mergedWeeks.map((week, index) => {
              const isFinalOddWeek =
                mergedWeeks.length % 2 === 1 && index === mergedWeeks.length - 1

              return (
                <div
                  key={week.weekNumber}
                  className={cn(
                    "overflow-hidden rounded-xl border border-primary/10 bg-card",
                    isFinalOddWeek && "md:col-span-2"
                  )}
                >
                  <div className="flex items-center justify-between border-b border-primary/10 bg-card/50 px-4 py-2 md:px-5">
                    <div className="flex items-center gap-3">
                      <span className="font-minecraft text-sm tracking-wider text-foreground uppercase">
                        Week {week.weekNumber}
                      </span>
                      <span className="text-xs text-muted-foreground/70">
                        / League {week.leagueNumber}
                      </span>
                    </div>
                    <MovementBadge movement={week.movement} />
                  </div>

                  <div className="grid grid-cols-3 divide-x divide-primary/10 border-b border-primary/10 px-0 py-0">
                    <div className="flex flex-col px-4 py-2 md:px-5">
                      <span className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Points Won
                      </span>
                      <span className="mt-1 font-minecraft text-sm text-primary tabular-nums">
                        {week.totalPoints} pts
                      </span>
                    </div>
                    <div className="flex flex-col px-4 py-2 md:px-5">
                      <span className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Average Time
                      </span>
                      <span className="mt-1 text-xs font-medium text-foreground tabular-nums">
                        {formatTime(Math.round(week.averageTimeMs ?? 0))}
                      </span>
                    </div>
                    <div className="flex flex-col px-4 py-2 md:px-5">
                      <span className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Matches
                      </span>
                      <span className="mt-1 text-xs text-muted-foreground tabular-nums">
                        {week.matches} Matches
                      </span>
                    </div>
                  </div>

                  {week.matchDetails.length > 0 && (
                    <div className="px-4 py-3 md:px-5">
                      <span className="mb-2 block text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Match Placements
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {week.matchDetails.map((match) => (
                          <div
                            key={match.matchId}
                            className="flex items-center justify-between rounded-md border border-primary/10 bg-card/20 px-3 py-1.5 text-xs"
                          >
                            <span className="font-minecraft text-[10px] tracking-wider text-muted-foreground uppercase">
                              Match {match.matchNumber}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "font-minecraft font-semibold",
                                  match.missed
                                    ? "text-muted-foreground"
                                    : match.placement === 1
                                      ? "text-yellow-500"
                                      : match.placement === 2
                                        ? "text-slate-300"
                                        : match.placement === 3
                                          ? "text-amber-600"
                                          : "text-foreground"
                                )}
                              >
                                {match.missed
                                  ? "Missed"
                                  : match.dnf
                                    ? "DNF"
                                    : match.placement !== null
                                      ? `#${match.placement}`
                                      : "-"}
                              </span>
                              {!match.missed && (
                                <>
                                  <span className="text-[11px] text-muted-foreground/80 tabular-nums">
                                    {formatTime(match.timeMs ?? 0)}
                                  </span>
                                  <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary/80 tabular-nums">
                                    +{match.pointsWon} pts
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

interface ProfileMetricProps {
  icon: ReactNode
  label: string
  value: string
  highlight?: boolean
}

function ProfileMetric({ icon, label, value, highlight }: ProfileMetricProps) {
  return (
    <div className="min-w-0 rounded-md border border-primary/10 bg-primary/3 px-2.5 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-[8px] font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </span>
        <div className="shrink-0 rounded bg-muted p-1">{icon}</div>
      </div>
      <span
        className={cn(
          "block truncate font-minecraft text-sm leading-none tracking-tight tabular-nums md:text-base",
          highlight ? "font-semibold text-emerald-400" : "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-4 rounded-xl border border-primary/10 bg-primary/3 px-6 py-8 md:px-8">
        <Skeleton className="h-3 w-16 rounded-sm bg-primary/10" />
        <Skeleton className="h-8 w-48 rounded-sm bg-primary/10" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-md bg-primary/10" />
          <Skeleton className="h-6 w-16 rounded-md bg-primary/10" />
        </div>
        <div className="grid grid-cols-1 gap-3 border-t border-primary/10 pt-5 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-lg border border-primary/10 bg-primary/2 px-4 py-3"
            >
              <Skeleton className="h-3 w-20 rounded bg-primary/10" />
              <Skeleton className="h-5 w-24 rounded bg-primary/10" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-3.5 w-28 rounded bg-primary/10" />
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-primary/10 bg-primary/2"
          >
            <div className="h-10 bg-primary/5 px-6" />
            <div className="grid h-16 grid-cols-3 border-b border-primary/10" />
            <div className="space-y-2 p-6">
              <Skeleton className="h-3 w-24 rounded bg-primary/10" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-8 rounded bg-primary/10" />
                <Skeleton className="h-8 rounded bg-primary/10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
