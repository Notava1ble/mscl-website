import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  isMobile?: boolean
}

export function LeagueSelector({
  leagues,
  selectedLeagueId,
  onSelect,
  isMobile,
}: LeagueSelectorProps) {
  if (!leagues || !selectedLeagueId) {
    return (
      <div className="flex gap-2">
        <Skeleton className="h-10 w-[180px] rounded-md" />
      </div>
    )
  }

  if (leagues.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No leagues available.</p>
    )
  }

  const selectedLeague = leagues.find((l) => l._id === selectedLeagueId)

  if (isMobile) {
    return (
      <div className="w-full">
        <Select
          value={selectedLeagueId}
          onValueChange={(val) => val && onSelect(val)}
        >
          <SelectTrigger className="mx-auto w-full font-minecraft text-xs tracking-wider uppercase">
            <SelectValue placeholder="Select League">
              {selectedLeague?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {leagues.map((league) => (
              <SelectItem
                key={league._id}
                value={league._id}
                className="font-minecraft text-xs tracking-wider uppercase"
              >
                {league.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <Tabs value={selectedLeagueId} onValueChange={onSelect}>
      <TabsList variant="line" className="flex-wrap bg-transparent">
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
