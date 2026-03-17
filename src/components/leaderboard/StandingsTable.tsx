import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import type { Id } from "../../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"

interface StandingRow {
  rank: number
  playerId: Id<"players">
  name: string
  elo: number
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
      <div className="flex flex-col gap-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-sm" />
        ))}
      </div>
    )
  }

  if (standings.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="font-minecraft text-sm tracking-wider text-muted-foreground uppercase">
          No players in this league
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className="w-12 text-muted-foreground">#</TableHead>
          <TableHead className="text-muted-foreground">Player</TableHead>
          <TableHead className="text-right text-muted-foreground">
            ELO
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {standings.map((row) => (
          <TableRow
            key={row.playerId}
            onClick={() => onPlayerClick(row.playerId)}
            data-state={
              selectedPlayerId === row.playerId ? "selected" : undefined
            }
            className="cursor-pointer border-border transition-colors"
          >
            <TableCell className="font-minecraft text-xs text-muted-foreground">
              {row.rank}
            </TableCell>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell
              className={cn(
                "text-right tabular-nums",
                "text-neutral-500", // coal
                row.elo >= 500 && "text-neutral-200", // iron
                row.elo >= 900 && "text-yellow-500", // gold
                row.elo >= 1200 && "text-emerald-500", // emerald
                row.elo >= 1500 && "text-sky-300", // diamond
                row.elo >= 2000 && "text-purple-600" // deep purple
              )}
            >
              {row.elo}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
