import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Id } from "../../../convex/_generated/dataModel"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"

interface StandingRow {
  rank: number
  playerId: Id<"players">
  name: string
  totalPoints: number
  movement?: "promoted" | "relegated" | "stayed" | "new" | null
}

interface StandingsTableProps {
  standings: StandingRow[] | undefined
  selectedPlayerId: string | null
  onPlayerClick: (playerId: string) => void
}

export function StandingsTable({
  standings,
  selectedPlayerId,
  onPlayerClick,
}: StandingsTableProps) {
  if (!standings) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    )
  }

  if (standings.length === 0) {
    return <div className="text-sm text-muted-foreground">No records found</div>
  }

  return (
    <div className="flex flex-col font-minecraft">
      {standings.map((row) => {
        const isSelected = selectedPlayerId === row.playerId

        return (
          <button
            type="button"
            key={row.playerId}
            onClick={() => onPlayerClick(row.playerId)}
            aria-pressed={isSelected}
            className={cn(
              "flex w-full items-center justify-between rounded-xl px-4 py-2 text-left transition-colors hover:bg-muted/50",
              isSelected && "border border-border bg-muted/50"
            )}
          >
            <div className="flex items-center gap-4">
              <span className="w-6 text-center text-muted-foreground">
                {row.rank}
              </span>
              <span
                className={cn(
                  "flex items-center gap-1 font-medium",
                  row.movement === "promoted" && "text-green-400",
                  row.movement === "relegated" && "text-destructive"
                )}
              >
                {row.movement === "promoted" && (
                  <ArrowUpIcon className="size-4" />
                )}
                {row.movement === "relegated" && (
                  <ArrowDownIcon className="size-4" />
                )}
                {row.name}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-muted-foreground tabular-nums">
                {row.totalPoints} pts
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
