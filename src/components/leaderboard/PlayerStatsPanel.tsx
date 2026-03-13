import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

function formatTime(ms: number): string {
  if (ms === 0) return "—"
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const millis = ms % 1000
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`
}

function movementBadge(movement: string) {
  switch (movement) {
    case "promoted":
      return (
        <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
          ↑ Promoted
        </Badge>
      )
    case "relegated":
      return (
        <Badge className="border-red-500/20 bg-red-500/10 text-red-400">
          ↓ Relegated
        </Badge>
      )
    case "new":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          New
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          — Stayed
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

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-minecraft text-lg tracking-wider uppercase">
            {stats?.name ?? "Player Stats"}
          </SheetTitle>
          <SheetDescription>
            {stats
              ? `${stats.currentLeague} · ${stats.elo} ELO`
              : "Loading player data..."}
          </SheetDescription>
        </SheetHeader>

        {!stats ? (
          <div className="flex flex-col gap-3 px-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full rounded-sm" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6 px-4 pb-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatBox
                label="Matches"
                value={String(stats.summary.totalMatches)}
              />
              <StatBox
                label="Avg Time"
                value={formatTime(stats.summary.avgTimeMs)}
              />
              <StatBox
                label="Best Time"
                value={formatTime(stats.summary.bestTimeMs)}
              />
            </div>

            <Separator className="bg-primary/10" />

            {/* League History */}
            <div>
              <h4 className="mb-3 font-minecraft text-xs tracking-wider text-muted-foreground uppercase">
                League History
              </h4>
              {stats.leagueHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {stats.leagueHistory.map((entry, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-sm border border-primary/5 px-3 py-2"
                    >
                      <span className="text-sm">Week {entry.weekNumber}</span>
                      {movementBadge(entry.movement)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator className="bg-primary/10" />

            {/* Weekly Breakdown */}
            <div>
              <h4 className="mb-3 font-minecraft text-xs tracking-wider text-muted-foreground uppercase">
                Weekly Breakdown
              </h4>
              {stats.weeklyBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No match data yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {stats.weeklyBreakdown.map((week, i) => (
                    <div
                      key={i}
                      className="rounded-sm border border-primary/5 px-3 py-2"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-minecraft text-xs uppercase">
                          Week {week.weekNumber}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {week.matches} match{week.matches !== 1 && "es"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span>
                          <span className="text-muted-foreground">Pts: </span>
                          <span className="text-primary tabular-nums">
                            {week.totalPoints}
                          </span>
                        </span>
                        <span>
                          <span className="text-muted-foreground">Avg: </span>
                          <span className="tabular-nums">
                            {formatTime(
                              week.matches > 0
                                ? Math.round(week.totalTimeMs / week.matches)
                                : 0
                            )}
                          </span>
                        </span>
                      </div>
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

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-primary/5 px-3 py-2 text-center">
      <div className="font-minecraft text-[10px] tracking-wider text-muted-foreground uppercase">
        {label}
      </div>
      <div className="mt-1 text-sm tabular-nums">{value}</div>
    </div>
  )
}
