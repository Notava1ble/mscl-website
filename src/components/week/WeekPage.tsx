import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import ConvexClientProvider from "@/components/ConvexClientProvider"
import { WeekSelector } from "./WeekSelector"
import { LeagueSelector } from "./LeagueSelector"
import { StandingsTable } from "./StandingsTable"
import { MatchesList } from "./MatchesList"
import { DetailsPanel } from "./DetailsPanel"
import { useIsMobile } from "@/hooks/use-mobile"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

function WeekContent() {
  const isMobile = useIsMobile()
  const weeks = useQuery(api.weekView.getAllWeeks)
  const leagues = useQuery(api.leagues.listLeagues)

  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null)
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const onDrawerChange = (open: boolean) => {
    setIsDrawerOpen(open)
    if (!open) {
      setSelectedPlayerId(null)
      setSelectedMatchId(null)
    }
  }

  const effectiveSelectedWeekId =
    (selectedWeekId && weeks?.some((w) => w._id === selectedWeekId)
      ? selectedWeekId
      : null) ??
    weeks?.find((w) => w.isCurrent)?._id ??
    weeks?.[0]?._id ??
    null

  const effectiveSelectedLeagueId =
    (selectedLeagueId && leagues?.some((l) => l._id === selectedLeagueId)
      ? selectedLeagueId
      : null) ??
    leagues?.[0]?._id ??
    null

  const standings = useQuery(
    api.weekView.getWeekStandings,
    effectiveSelectedWeekId && effectiveSelectedLeagueId
      ? {
          weekId: effectiveSelectedWeekId as Id<"weeks">,
          leagueId: effectiveSelectedLeagueId as Id<"leagues">,
        }
      : "skip"
  )

  const matches = useQuery(
    api.weekView.getWeekMatches,
    effectiveSelectedWeekId && effectiveSelectedLeagueId
      ? {
          weekId: effectiveSelectedWeekId as Id<"weeks">,
          leagueId: effectiveSelectedLeagueId as Id<"leagues">,
        }
      : "skip"
  )

  function handlePlayerClick(playerId: string) {
    if (selectedPlayerId === playerId) {
      setSelectedPlayerId(null)
      if (isMobile) setIsDrawerOpen(false)
    } else {
      setSelectedPlayerId(playerId)
      setSelectedMatchId(null)
      if (isMobile) setIsDrawerOpen(true)
    }
  }

  function handleMatchClick(matchId: string) {
    if (selectedMatchId === matchId) {
      setSelectedMatchId(null)
      if (isMobile) setIsDrawerOpen(false)
    } else {
      setSelectedMatchId(matchId)
      setSelectedPlayerId(null)
      if (isMobile) setIsDrawerOpen(true)
    }
  }

  function onWeekChange(id: string) {
    setSelectedWeekId(id)
    setSelectedPlayerId(null)
    setSelectedMatchId(null)
    setIsDrawerOpen(false)
  }

  function onLeagueChange(id: string) {
    setSelectedLeagueId(id)
    setSelectedPlayerId(null)
    setSelectedMatchId(null)
    setIsDrawerOpen(false)
  }

  const selectedPlayer = standings?.find((s) => s.playerId === selectedPlayerId)

  const selectedMatch = matches?.find((m) => m._id === selectedMatchId)

  const detailsPanelProps = {
    weekId: effectiveSelectedWeekId,
    playerId: selectedPlayerId,
    matchId: selectedMatchId,
    rankedMatchId: selectedMatch?.rankedMatchId ?? null,
    playerStats: selectedPlayer
      ? {
          name: selectedPlayer.name,
          totalPoints: selectedPlayer.totalPoints,
          rank: selectedPlayer.rank,
        }
      : null,
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 font-sans text-foreground md:pt-28">
      <div className="container mx-auto max-w-7xl px-4 md:px-8">
        {/* Header section */}
        <div className="mb-4 flex flex-col justify-between gap-4 border-b border-border/40 pb-4 md:flex-row md:items-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Weekly Leaderboards
          </h1>
          <WeekSelector
            weeks={weeks}
            selectedWeekId={effectiveSelectedWeekId}
            onSelect={onWeekChange}
          />
        </div>

        <div className="mb-8">
          <LeagueSelector
            leagues={leagues}
            selectedLeagueId={effectiveSelectedLeagueId}
            onSelect={onLeagueChange}
            isMobile={isMobile}
          />
        </div>

        {isMobile ? (
          <div className="mt-4 flex flex-col gap-6">
            <Tabs defaultValue="standings" className="w-full">
              <TabsList className="mb-4 w-full justify-start rounded-none border-b bg-transparent p-0">
                <TabsTrigger
                  value="standings"
                  className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Standings
                </TabsTrigger>
                <TabsTrigger
                  value="matches"
                  className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Matches
                </TabsTrigger>
              </TabsList>
              <TabsContent value="standings" className="mt-0">
                <StandingsTable
                  standings={standings}
                  selectedPlayerId={selectedPlayerId}
                  onPlayerClick={handlePlayerClick}
                />
              </TabsContent>
              <TabsContent value="matches" className="mt-0">
                <MatchesList
                  matches={matches}
                  selectedMatchId={selectedMatchId}
                  onMatchClick={handleMatchClick}
                />
              </TabsContent>
            </Tabs>

            <Drawer open={isDrawerOpen} onOpenChange={onDrawerChange}>
              <DrawerContent>
                <DrawerHeader className="border-b border-border/40 px-6 pb-4">
                  <DrawerTitle className="font-minecraft text-xl">
                    {selectedPlayerId ? "Player Details" : "Match Details"}
                  </DrawerTitle>
                </DrawerHeader>
                <div className="px-6 py-4 pb-12">
                  <DetailsPanel {...detailsPanelProps} showBorder={false} />
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        ) : (
          <div className="mt-4 flex min-h-150 items-start gap-8 lg:gap-16">
            <div className="flex flex-1 flex-row items-start gap-8 lg:gap-16">
              <div className="flex w-[320px] shrink-0 flex-col gap-4">
                <StandingsTable
                  standings={standings}
                  selectedPlayerId={selectedPlayerId}
                  onPlayerClick={handlePlayerClick}
                />
              </div>

              <div className="flex w-75 shrink-0 flex-col gap-2">
                <MatchesList
                  matches={matches}
                  selectedMatchId={selectedMatchId}
                  onMatchClick={handleMatchClick}
                />
              </div>
            </div>

            <div className="sticky top-24 w-125 shrink-0">
              <DetailsPanel {...detailsPanelProps} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function WeekPage() {
  return (
    <ConvexClientProvider>
      <WeekContent />
    </ConvexClientProvider>
  )
}
