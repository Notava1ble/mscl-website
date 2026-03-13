import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"

function formatTime(ms: number): string {
  if (ms === 0) return "—"
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const millis = ms % 1000
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`
}

// ELO tier config — mirrors StandingsTable coloring
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
]

function getTier(elo: number) {
  return ELO_TIERS.find((t) => elo >= t.min) ?? ELO_TIERS[ELO_TIERS.length - 1]
}

function MovementBadge({ movement }: { movement: string }) {
  switch (movement) {
    case "promoted":
      return (
        <Badge className="border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0 text-[10px] text-emerald-400">
          ↑ Promoted
        </Badge>
      )
    case "relegated":
      return (
        <Badge className="border-red-500/20 bg-red-500/10 px-1.5 py-0 text-[10px] text-red-400">
          ↓ Relegated
        </Badge>
      )
    case "new":
      return (
        <Badge
          variant="outline"
          className="px-1.5 py-0 text-[10px] text-muted-foreground"
        >
          New
        </Badge>
      )
    default:
      return null
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

  // Merge league history into weekly breakdown by weekNumber
  const mergedWeeks = stats
    ? stats.weeklyBreakdown.map((week) => {
        const historyEntry = stats.leagueHistory.find(
          (h) => h.weekNumber === week.weekNumber
        )
        return {
          ...week,
          leagueNumber: historyEntry?.leagueNumber ?? null,
          movement: historyEntry?.movement ?? "stayed",
        }
      })
    : []

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="flex flex-col gap-0 overflow-hidden border-l border-primary/10 p-0 sm:max-w-md"
      >
        {/* Accessibility */}
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
            {/* ── Player Header ── */}
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

              {/* Tier badge inline with ELO in parenthesis */}
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

            {/* ── Summary Stats ── */}
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

            {/* ── Weekly Breakdown ── */}
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
                  {mergedWeeks.map((week, i) => (
                    <div
                      key={i}
                      className="overflow-hidden rounded-sm border border-primary/10 bg-primary/3"
                    >
                      {/* Card header */}
                      <div className="flex items-center justify-between border-b border-primary/10 bg-primary/4 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-minecraft text-xs tracking-wider text-foreground/90 uppercase">
                            Week {week.weekNumber}
                          </span>
                          {week.leagueNumber !== null && (
                            <span className="text-[9px] tracking-wider text-muted-foreground uppercase">
                              · League {week.leagueNumber}
                            </span>
                          )}
                        </div>
                        <MovementBadge movement={week.movement} />
                      </div>

                      {/* Stats row — equal thirds */}
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
                              week.matches > 0
                                ? Math.round(week.totalTimeMs / week.matches)
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

                      {/* Match times — ranked bar chart */}
                      {week.times && week.times.length > 0 && (
                        <MatchTimesChart times={week.times} />
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

// ── Match Times Chart ───────────────────────────────────────────
// Ranked rows sorted fastest → slowest.
// Each row has a proportional fill bar so relative speed is scannable at a glance.

function MatchTimesChart({ times }: { times: number[] }) {
  const sorted = [...times]
    .map((t, originalIndex) => ({ t, originalIndex }))
    .sort((a, b) => a.t - b.t)

  const best = sorted[0].t
  const worst = sorted[sorted.length - 1].t
  const range = worst - best || 1 // guard against all-equal times

  return (
    <div className="border-t border-primary/10 px-3 pt-0.5 pb-3">
      <span className="mb-2 block text-[9px] tracking-wider text-muted-foreground uppercase">
        Match Times
      </span>
      <div className="flex flex-col gap-1.5">
        {sorted.map(({ t }, rank) => {
          const isBest = rank === 0
          // Best = 100% fill, slowest = ~10% so slow times barely show
          const fillPct = 100 - ((t - best) / range) * 90

          return (
            <div key={rank} className="flex items-center gap-2">
              {/* Rank number */}
              <span
                className={cn(
                  "w-4 shrink-0 text-right text-[10px] tabular-nums",
                  isBest ? "text-emerald-400" : "text-muted-foreground/35"
                )}
              >
                {rank + 1}
              </span>

              {/* Bar + label */}
              <div className="relative h-5 flex-1 overflow-hidden rounded-sm bg-primary/5">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-sm",
                    isBest ? "bg-emerald-500/20" : "bg-primary/10"
                  )}
                  style={{ width: `${fillPct}%` }}
                />
                <span
                  className={cn(
                    "absolute inset-0 flex items-center px-2 font-minecraft text-[10px] tracking-wide tabular-nums",
                    isBest ? "text-emerald-400" : "text-muted-foreground"
                  )}
                >
                  {formatTime(t)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────

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
