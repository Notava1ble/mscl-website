import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

interface League {
  leagueTier: number
  name: string
}

interface LeagueSelectorProps {
  leagues: League[] | undefined
  selectedLeagueTier: number | null
  onSelect: (leagueTier: number) => void
}

export function LeagueSelector({
  leagues,
  selectedLeagueTier,
  onSelect,
}: LeagueSelectorProps) {
  if (!leagues || selectedLeagueTier === null) {
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
    <Tabs
      value={String(selectedLeagueTier)}
      onValueChange={(value) => onSelect(Number(value))}
    >
      <TabsList variant="line" className="flex-wrap">
        {leagues.map((league) => (
          <TabsTrigger
            key={league.leagueTier}
            value={String(league.leagueTier)}
            className="font-minecraft text-xs tracking-wider uppercase"
          >
            {league.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
