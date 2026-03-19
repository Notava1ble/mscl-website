import { useState, useEffect } from "react"
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

  useEffect(() => {
    if (weeks && weeks.length > 0 && !selectedWeekId) {
      const current = weeks.find((w) => w.isCurrent)
      setSelectedWeekId(current ? current._id : weeks[0]._id)
    }
  }, [weeks, selectedWeekId])

  useEffect(() => {
    if (leagues && leagues.length > 0 && !selectedLeagueId) {
      setSelectedLeagueId(leagues[0]._id)
    }
  }, [leagues, selectedLeagueId])

  const standings = useQuery(
    api.weekView.getWeekStandings,
    selectedWeekId && selectedLeagueId
      ? {
          weekId: selectedWeekId as Id<"weeks">,
          leagueId: selectedLeagueId as Id<"leagues">,
        }
      : "skip"
  )

  const matches = useQuery(
    api.weekView.getWeekMatches,
    selectedWeekId && selectedLeagueId
      ? {
          weekId: selectedWeekId as Id<"weeks">,
          leagueId: selectedLeagueId as Id<"leagues">,
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
      <div className="container mx-auto max-w-[1400px] px-4 md:px-8">
        {/* Header section */}
        <div className="mb-4 flex justify-between pb-2">
          <h1 className="text-4xl font-bold">Weekly Leaderboards</h1>
          <WeekSelector
            weeks={weeks}
            selectedWeekId={selectedWeekId}
            onSelect={onWeekChange}
          />
        </div>

        <LeagueSelector
          leagues={leagues}
          selectedLeagueId={selectedLeagueId}
          onSelect={onLeagueChange}
        />

        {/* 3-Column Horizontal Layout matching the image */}
        <div className="scrollbar-thin scrollbar-thumb-muted-foreground/20 mt-4 flex min-h-[600px] flex-row items-start gap-8 overflow-x-auto pt-2 pb-12 lg:gap-16">
          {/* Column 1: League Tabs + Standings */}
          <div className="flex w-[320px] shrink-0 flex-col gap-4">
            <StandingsTable
              standings={standings}
              selectedPlayerId={selectedPlayerId}
              onPlayerClick={handlePlayerClick}
            />
          </div>

          {/* Column 2: Matches List */}
          <div className="flex w-[300px] shrink-0 flex-col gap-2">
            <MatchesList
              matches={matches}
              selectedMatchId={selectedMatchId}
              onMatchClick={handleMatchClick}
            />
          </div>

          {/* Column 3: Details Panel */}
          <div className="w-[500px] shrink-0 lg:flex-1">
            <DetailsPanel
              weekId={selectedWeekId}
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
