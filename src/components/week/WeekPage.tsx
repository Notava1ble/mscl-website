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

function WeekContent() {
  const weeks = useQuery(api.weekView.getAllWeeks)
  const leagues = useQuery(api.leagues.listLeagues)

  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null)
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)

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
    } else {
      setSelectedPlayerId(playerId)
      setSelectedMatchId(null)
    }
  }

  function handleMatchClick(matchId: string) {
    if (selectedMatchId === matchId) {
      setSelectedMatchId(null)
    } else {
      setSelectedMatchId(matchId)
      setSelectedPlayerId(null)
    }
  }

  function onWeekChange(id: string) {
    setSelectedWeekId(id)
    setSelectedPlayerId(null)
    setSelectedMatchId(null)
  }

  function onLeagueChange(id: string) {
    setSelectedLeagueId(id)
    setSelectedPlayerId(null)
    setSelectedMatchId(null)
  }

  const selectedPlayer = standings?.find((s) => s.playerId === selectedPlayerId)

  return (
    <div className="min-h-screen bg-background pt-28 pb-24 font-sans text-foreground">
      <div className="container mx-auto max-w-350 px-4 md:px-8">
        {/* Header section */}
        <div className="mb-4 flex justify-between pb-2">
          <h1 className="text-4xl font-bold">Weekly Leaderboards</h1>
          <WeekSelector
            weeks={weeks}
            selectedWeekId={effectiveSelectedWeekId}
            onSelect={onWeekChange}
          />
        </div>

        <LeagueSelector
          leagues={leagues}
          selectedLeagueId={effectiveSelectedLeagueId}
          onSelect={onLeagueChange}
        />

        {/* Wrap everything in a flex row */}
        <div className="mt-4 flex min-h-150 items-start gap-8 pt-2 pb-12 lg:gap-16">
          {/* Scrollable columns */}
          <div className="flex flex-row items-start gap-8 overflow-x-auto lg:gap-16">
            {/* Standings */}
            <div className="flex w-[320px] shrink-0 flex-col gap-4">
              <StandingsTable
                standings={standings}
                selectedPlayerId={selectedPlayerId}
                onPlayerClick={handlePlayerClick}
              />
            </div>

            {/* Matches */}
            <div className="flex w-75 shrink-0 flex-col gap-2">
              <MatchesList
                matches={matches}
                selectedMatchId={selectedMatchId}
                onMatchClick={handleMatchClick}
              />
            </div>
          </div>

          {/* Details Panel */}
          <div className="sticky top-24 w-125 shrink-0 lg:flex-1">
            <DetailsPanel
              weekId={effectiveSelectedWeekId}
              playerId={selectedPlayerId}
              matchId={selectedMatchId}
              playerStats={
                selectedPlayer
                  ? {
                      name: selectedPlayer.name,
                      totalPoints: selectedPlayer.totalPoints,
                      rank: selectedPlayer.rank,
                    }
                  : null
              }
            />
          </div>
        </div>
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
