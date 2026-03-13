import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import type { Id } from "../../../convex/_generated/dataModel"

interface League {
  _id: Id<"leagues">
  name: string
  tierLevel: number
}

interface LeagueSelectorProps {
  leagues: League[] | undefined
  selectedLeagueId: string | null
  onSelect: (leagueId: string) => void
}

export function LeagueSelector({
  leagues,
  selectedLeagueId,
  onSelect,
}: LeagueSelectorProps) {
  if (!leagues || !selectedLeagueId) {
    return (
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-md" />
        ))}
      </div>
    )
  }

  if (leagues.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No leagues available.</p>
    )
  }

  return (
    <Tabs value={selectedLeagueId} onValueChange={onSelect}>
      <TabsList variant="line" className="flex-wrap">
        {leagues.map((league) => (
          <TabsTrigger
            key={league._id}
            value={league._id}
            className="font-minecraft text-xs tracking-wider uppercase"
          >
            {league.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
