import { useState, useEffect, useCallback } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { motion } from "framer-motion"
import { CustomButton } from "@/components/ui-custom/Button"
import { LeagueSelector } from "./LeagueSelector"
import { StandingsTable } from "./StandingsTable"
import { PlayerStatsPanel } from "./PlayerStatsPanel"
import ConvexClientProvider from "@/components/ConvexClientProvider"

function LeaderboardContent() {
  const leagues = useQuery(api.leagues.listLeagues)
  const currentWeek = useQuery(api.weeks.getCurrentWeek)
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [playerPanelOpen, setPlayerPanelOpen] = useState(false)

  // Auto-select league: prefer URL param, fall back to first league
  useEffect(() => {
    if (!leagues || leagues.length === 0 || selectedLeagueId) return

    const params = new URLSearchParams(window.location.search)
    const tierParam = params.get("league")

    const matched = tierParam
      ? leagues.find((l) => String(l.tierLevel) === tierParam)
      : null

    setSelectedLeagueId(matched ? matched._id : leagues[0]._id)
  }, [leagues, selectedLeagueId])

  const onLeagueSelect = useCallback(
    (leagueId: string) => {
      setSelectedLeagueId(leagueId)
      setSelectedPlayerId(null)

      const league = leagues?.find((l) => l._id === leagueId)
      if (league) {
        const params = new URLSearchParams(window.location.search)
        params.set("league", String(league.tierLevel))
        history.pushState({}, "", `?${params.toString()}`)
      }
    },
    [leagues]
  )

  const standings = useQuery(
    api.leaderboard.getLeagueStandings,
    selectedLeagueId ? { leagueId: selectedLeagueId as Id<"leagues"> } : "skip"
  )

  const selectedLeague = leagues?.find((l) => l._id === selectedLeagueId)

  function handlePlayerClick(playerId: string) {
    setSelectedPlayerId(playerId)
    setPlayerPanelOpen(true)
  }

  return (
    <section className="container mx-auto px-6 pt-28 pb-24">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <h1 className="font-minecraft text-4xl tracking-tight uppercase md:text-6xl">
          Leaderboard
        </h1>
        <p className="mt-2 text-muted-foreground">
          Browse leagues, view standings, and explore player stats.
        </p>
      </motion.div>

      {/* League Tabs + Actions */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <LeagueSelector
          leagues={leagues}
          selectedLeagueId={selectedLeagueId}
          onSelect={onLeagueSelect}
        />
        {selectedLeague && (
          <a href={`/week?league=${selectedLeague.tierLevel}&week=latest`}>
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
      </motion.div>

      {/* Standings Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <StandingsTable
          standings={standings}
          selectedPlayerId={selectedPlayerId}
          onPlayerClick={handlePlayerClick}
        />
      </motion.div>

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
