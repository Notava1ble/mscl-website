import { useState, useEffect, useCallback } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { CustomButton } from "@/components/ui-custom/Button"
import { LeagueSelector } from "./LeagueSelector"
import { StandingsTable } from "./StandingsTable"
import { PlayerStatsPanel } from "./PlayerStatsPanel"
import ConvexClientProvider from "@/components/ConvexClientProvider"

function LeaderboardContent() {
  const leagues = useQuery(api.leagues.listLeagues)
  const [selectedLeagueTier, setSelectedLeagueTier] = useState<number | null>(
    null
  )
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [playerPanelOpen, setPlayerPanelOpen] = useState(false)

  useEffect(() => {
    if (!leagues || leagues.length === 0 || selectedLeagueTier !== null) return

    const params = new URLSearchParams(window.location.search)
    const tierParam = params.get("league")
    const parsedTier = tierParam ? Number(tierParam) : Number.NaN

    const matched = Number.isFinite(parsedTier)
      ? leagues.find((league) => league.leagueTier === parsedTier)
      : null

    setSelectedLeagueTier(matched?.leagueTier ?? leagues[0].leagueTier)
  }, [leagues, selectedLeagueTier])

  const onLeagueSelect = useCallback((leagueTier: number) => {
    setSelectedLeagueTier(leagueTier)
    setSelectedPlayerId(null)

    const params = new URLSearchParams(window.location.search)
    params.set("league", String(leagueTier))
    history.pushState({}, "", `?${params.toString()}`)
  }, [])

  const standings = useQuery(
    api.leaderboard.getLeagueStandings,
    selectedLeagueTier !== null ? { leagueTier: selectedLeagueTier } : "skip"
  )

  const selectedLeague = leagues?.find(
    (league) => league.leagueTier === selectedLeagueTier
  )

  function handlePlayerClick(playerId: string) {
    setSelectedPlayerId(playerId)
    setPlayerPanelOpen(true)
  }

  return (
    <section className="container mx-auto px-6 pt-28 pb-24">
      {/* Page Header */}
      <div className="mb-10">
        <h1 className="font-minecraft text-4xl tracking-tight uppercase md:text-6xl">
          Leaderboard
        </h1>
        <p className="mt-2 text-muted-foreground">
          Browse leagues, view standings, and explore player stats.
        </p>
        <p className="mt-2 text-muted-foreground">
          (This is meant for development/testing the database. There will be
          bugs, missing data, and weird edge cases. This view will be removed
          entirely and merged with the weekly leaderboards as soon as I get all
          the data for the first two weeks.)
        </p>
      </div>

      {/* League Tabs + Actions */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <LeagueSelector
          leagues={leagues}
          selectedLeagueTier={selectedLeagueTier}
          onSelect={onLeagueSelect}
        />
        {selectedLeague && (
          <a href={`/week?league=${selectedLeague.leagueTier}&week=latest`}>
            <CustomButton
              variant="outline"
              size="sm"
              minecraft={true}
              className="text-xs"
            >
              View Weekly Matches
            </CustomButton>
          </a>
        )}
      </div>

      {/* Standings Table */}
      <div>
        <StandingsTable
          standings={standings}
          selectedPlayerId={selectedPlayerId}
          onPlayerClick={handlePlayerClick}
        />
      </div>

      {/* Player Stats Panel */}
      <PlayerStatsPanel
        playerId={selectedPlayerId ? (selectedPlayerId as Id<"players">) : null}
        open={playerPanelOpen}
        onClose={() => {
          setPlayerPanelOpen(false)
          setSelectedPlayerId(null)
        }}
      />
    </section>
  )
}

export function LeaderboardPage() {
  return (
    <ConvexClientProvider>
      <LeaderboardContent />
    </ConvexClientProvider>
  )
}
