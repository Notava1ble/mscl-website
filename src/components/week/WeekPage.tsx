import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
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

  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number | null>(
    null
  )
  const [selectedLeagueTier, setSelectedLeagueTier] = useState<number | null>(
    null
  )
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isUrlInitialized, setIsUrlInitialized] = useState(false)

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !weeks ||
      !leagues ||
      isUrlInitialized
    ) {
      return
    }

    const searchParams = new URL(window.location.href).searchParams
    const urlWeek = searchParams.get("week")
    const urlLeague = searchParams.get("league")

    const parsedWeek =
      urlWeek && urlWeek !== "latest" ? Number.parseInt(urlWeek, 10) : Number.NaN
    const parsedLeague = urlLeague ? Number.parseInt(urlLeague, 10) : Number.NaN

    if (Number.isFinite(parsedWeek)) {
      const matchedWeek = weeks.find((week) => week.weekNumber === parsedWeek)
      if (matchedWeek) setSelectedWeekNumber(matchedWeek.weekNumber)
    }

    if (Number.isFinite(parsedLeague)) {
      const matchedLeague = leagues.find(
        (league) => league.leagueTier === parsedLeague
      )
      if (matchedLeague) setSelectedLeagueTier(matchedLeague.leagueTier)
    }

    setIsUrlInitialized(true)
  }, [weeks, leagues, isUrlInitialized])

  useEffect(() => {
    if (typeof window === "undefined") return

    const handlePopState = () => {
      if (!weeks || !leagues) return

      const searchParams = new URL(window.location.href).searchParams
      const urlWeek = searchParams.get("week")
      const urlLeague = searchParams.get("league")

      const parsedWeek =
        urlWeek && urlWeek !== "latest"
          ? Number.parseInt(urlWeek, 10)
          : Number.NaN
      const parsedLeague = urlLeague ? Number.parseInt(urlLeague, 10) : Number.NaN

      setSelectedWeekNumber(
        Number.isFinite(parsedWeek) &&
          weeks.some((week) => week.weekNumber === parsedWeek)
          ? parsedWeek
          : null
      )

      setSelectedLeagueTier(
        Number.isFinite(parsedLeague) &&
          leagues.some((league) => league.leagueTier === parsedLeague)
          ? parsedLeague
          : null
      )
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [weeks, leagues])

  const onDrawerChange = (open: boolean) => {
    setIsDrawerOpen(open)
    if (!open) {
      setSelectedPlayerId(null)
      setSelectedMatchId(null)
    }
  }

  const effectiveSelectedWeekNumber =
    (selectedWeekNumber !== null &&
    weeks?.some((week) => week.weekNumber === selectedWeekNumber)
      ? selectedWeekNumber
      : null) ??
    weeks?.find((week) => week.isActive)?.weekNumber ??
    weeks?.[0]?.weekNumber ??
    null

  const effectiveSelectedLeagueTier =
    (selectedLeagueTier !== null &&
    leagues?.some((league) => league.leagueTier === selectedLeagueTier)
      ? selectedLeagueTier
      : null) ??
    leagues?.find((league) => league.leagueTier === 1)?.leagueTier ??
    leagues?.[0]?.leagueTier ??
    null

  const standings = useQuery(
    api.weekView.getWeekStandings,
    effectiveSelectedWeekNumber !== null && effectiveSelectedLeagueTier !== null
      ? {
          weekNumber: effectiveSelectedWeekNumber,
          leagueTier: effectiveSelectedLeagueTier,
        }
      : "skip"
  )

  const matches = useQuery(
    api.weekView.getWeekMatches,
    effectiveSelectedWeekNumber !== null && effectiveSelectedLeagueTier !== null
      ? {
          weekNumber: effectiveSelectedWeekNumber,
          leagueTier: effectiveSelectedLeagueTier,
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

  function pushSelectionToUrl(weekNumber: number, leagueTier: number) {
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set("week", String(weekNumber))
    newUrl.searchParams.set("league", String(leagueTier))
    window.history.pushState({}, "", newUrl.toString())
  }

  function onWeekChange(weekNumber: number) {
    setSelectedWeekNumber(weekNumber)
    setSelectedPlayerId(null)
    setSelectedMatchId(null)
    setIsDrawerOpen(false)

    if (effectiveSelectedLeagueTier !== null) {
      pushSelectionToUrl(weekNumber, effectiveSelectedLeagueTier)
    }
  }

  function onLeagueChange(leagueTier: number) {
    setSelectedLeagueTier(leagueTier)
    setSelectedPlayerId(null)
    setSelectedMatchId(null)
    setIsDrawerOpen(false)

    if (effectiveSelectedWeekNumber !== null) {
      pushSelectionToUrl(effectiveSelectedWeekNumber, leagueTier)
    }
  }

  const selectedPlayer = standings?.find((standing) => standing.playerId === selectedPlayerId)
  const selectedMatch = matches?.find((match) => match._id === selectedMatchId)

  const detailsPanelProps = {
    weekNumber: effectiveSelectedWeekNumber,
    leagueTier: effectiveSelectedLeagueTier,
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
        <div className="mb-4 flex flex-col justify-between gap-4 border-b border-border/40 pb-4 md:flex-row md:items-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Weekly Leaderboards
          </h1>
          <WeekSelector
            weeks={weeks}
            selectedWeekNumber={effectiveSelectedWeekNumber}
            onSelect={onWeekChange}
          />
        </div>

        <div className="mb-8">
          <LeagueSelector
            leagues={leagues}
            selectedLeagueTier={effectiveSelectedLeagueTier}
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
                <div className="h-full overflow-y-auto px-6 py-4 pb-12">
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
