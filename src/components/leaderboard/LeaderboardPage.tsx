import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { CustomButton } from "@/components/ui-custom/Button"
import { PlayerStatsDetails } from "./PlayerStatsDetails"
import ConvexClientProvider from "@/components/ConvexClientProvider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const ELO_TIERS = [
  { min: 2000, color: "text-purple-400" },
  { min: 1500, color: "text-sky-300" },
  { min: 1200, color: "text-emerald-400" },
  { min: 900, color: "text-yellow-400" },
  { min: 500, color: "text-neutral-200" },
  { min: 0, color: "text-neutral-500" },
] as const

type SelectedPlayerSnapshot = {
  playerId: string
  rank: number
  name: string
  elo: number
}

function getTierColor(elo: number) {
  const tier = ELO_TIERS.find((t) => elo >= t.min)
  return tier ? tier.color : "text-neutral-500"
}

function LeaderboardContent() {
  const leagues = useQuery(api.leagues.listLeagues)
  const [selectedLeagueTier, setSelectedLeagueTier] = useState<number | null>(
    null
  )
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [selectedPlayerSnapshot, setSelectedPlayerSnapshot] =
    useState<SelectedPlayerSnapshot | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const leagueTiers = useMemo(
    () => new Set((leagues ?? []).map((league) => league.leagueTier)),
    [leagues]
  )

  useEffect(() => {
    if (!leagues || leagues.length === 0 || selectedLeagueTier !== null) return

    const params = new URLSearchParams(window.location.search)
    const tierParam = params.get("league")
    const parsedTier = tierParam ? Number(tierParam) : Number.NaN

    setSelectedLeagueTier(
      Number.isFinite(parsedTier) && leagueTiers.has(parsedTier)
        ? parsedTier
        : leagues[0].leagueTier
    )
  }, [leagues, selectedLeagueTier, leagueTiers])

  const onLeagueSelect = useCallback((leagueTier: number) => {
    setSelectedLeagueTier(leagueTier)

    const params = new URLSearchParams(window.location.search)
    params.set("league", String(leagueTier))
    history.pushState({}, "", `?${params.toString()}`)
  }, [])

  const standings = useQuery(
    api.leaderboard.getLeagueStandings,
    selectedLeagueTier !== null ? { leagueTier: selectedLeagueTier } : "skip"
  )

  const selectedLeague = useMemo(
    () => leagues?.find((league) => league.leagueTier === selectedLeagueTier),
    [leagues, selectedLeagueTier]
  )

  const filteredStandings = useMemo(() => {
    if (!standings) return []
    if (!searchQuery.trim()) return standings
    const query = searchQuery.toLowerCase().trim()
    return standings.filter((p) => p.name.toLowerCase().includes(query))
  }, [standings, searchQuery])

  const selectedPlayer = useMemo(
    () => standings?.find((p) => p.playerId === selectedPlayerId),
    [standings, selectedPlayerId]
  )

  const playerOptions = useMemo(() => {
    if (!selectedPlayerId) return filteredStandings
    if (filteredStandings.some((p) => p.playerId === selectedPlayerId)) {
      return filteredStandings
    }

    const currentSelectedPlayer =
      standings?.find((p) => p.playerId === selectedPlayerId) ??
      selectedPlayerSnapshot

    return currentSelectedPlayer
      ? [currentSelectedPlayer, ...filteredStandings]
      : filteredStandings
  }, [filteredStandings, selectedPlayerId, selectedPlayerSnapshot, standings])

  const selectedPlayerDisplay =
    selectedPlayer !== undefined
      ? `#${selectedPlayer.rank} ${selectedPlayer.name}`
      : selectedPlayerSnapshot !== null
        ? `#${selectedPlayerSnapshot.rank} ${selectedPlayerSnapshot.name}`
        : null

  const handlePlayerSelect = useCallback(
    (playerId: string) => {
      const player =
        standings?.find((p) => p.playerId === playerId) ??
        selectedPlayerSnapshot

      setSelectedPlayerId(playerId)
      setSelectedPlayerSnapshot(
        player
          ? {
              playerId: player.playerId,
              rank: player.rank,
              name: player.name,
              elo: player.elo,
            }
          : null
      )
    },
    [selectedPlayerSnapshot, standings]
  )

  return (
    <section className="w-full px-4 pt-24 pb-24 md:px-6 lg:pr-[20rem] xl:pr-[21rem]">
      <div className="grid grid-cols-1 gap-8">
        <div className="order-2 flex flex-col lg:order-1">
          <PlayerStatsDetails playerId={selectedPlayerId as Id<"players">} />
        </div>

        <aside className="order-1 flex flex-col gap-6 lg:fixed lg:inset-y-0 lg:right-0 lg:z-30 lg:h-screen lg:w-[18.5rem] lg:self-start lg:overflow-hidden lg:border-l lg:border-primary/10 lg:bg-background lg:px-5 lg:pt-24 lg:pb-6 xl:w-[19.5rem]">
          <div className="shrink-0 border-b border-primary/10 pb-5">
            <label className="mb-2 block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Select League
            </label>
            <Select
              value={
                selectedLeagueTier !== null ? String(selectedLeagueTier) : ""
              }
              onValueChange={(val) => onLeagueSelect(Number(val))}
            >
              <SelectTrigger className="w-full cursor-pointer font-minecraft text-xs tracking-wider uppercase">
                <SelectValue placeholder="Loading Leagues...">
                  {selectedLeague?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {leagues?.map((l) => (
                  <SelectItem
                    key={l.leagueTier}
                    value={String(l.leagueTier)}
                    className="cursor-pointer font-minecraft text-xs tracking-wider uppercase"
                  >
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedLeague && (
              <div className="mt-4 border-t border-primary/5 pt-3">
                <a
                  href={`/week?league=${selectedLeague.leagueTier}&week=latest`}
                  className="block"
                >
                  <CustomButton
                    variant="outline"
                    size="sm"
                    minecraft={true}
                    className="w-full text-xs"
                  >
                    View Weekly Matches
                  </CustomButton>
                </a>
              </div>
            )}
          </div>

          {/* Desktop Player List (hidden on mobile) */}
          <div className="hidden min-h-0 flex-1 flex-col gap-3 md:flex">
            <div className="flex items-center justify-between border-b border-primary/5 pb-2">
              <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Players ({filteredStandings.length})
              </span>
              <span className="text-[9px] text-muted-foreground/60 uppercase">
                Rank / ELO
              </span>
            </div>

            {/* Search Box */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-primary/15 bg-card/50 px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground/60 focus:border-primary/30 focus:outline-hidden"
              />
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
              {!standings ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full rounded-md" />
                ))
              ) : playerOptions.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="font-minecraft text-xs tracking-wider text-muted-foreground uppercase">
                    No players found
                  </p>
                </div>
              ) : (
                playerOptions.map((player) => {
                  const color = getTierColor(player.elo)
                  const isSelected = selectedPlayerId === player.playerId
                  return (
                    <button
                      key={player.playerId}
                      onClick={() => handlePlayerSelect(player.playerId)}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-left transition-all duration-200",
                        isSelected
                          ? "translate-x-1 border-primary/40 bg-primary/10 text-foreground"
                          : "border-transparent bg-transparent text-muted-foreground hover:border-primary/10 hover:bg-primary/5 hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-5 font-minecraft text-[10px] text-muted-foreground/60">
                          #{player.rank}
                        </span>
                        <span className="truncate text-sm font-medium">
                          {player.name}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "pl-2 text-xs font-semibold tabular-nums",
                          color
                        )}
                      >
                        {player.elo}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Mobile Player Dropdown (hidden on desktop) */}
          <div className="flex flex-col gap-2 rounded-xl border border-primary/10 bg-card p-4 md:hidden">
            <label className="block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Select Player
            </label>
            {/* Search Input for Mobile */}
            <input
              type="text"
              placeholder="Filter players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-2 w-full rounded-md border border-primary/15 bg-card/50 px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground/60 focus:border-primary/30 focus:outline-hidden"
            />
            <Select
              value={selectedPlayerId ?? ""}
              onValueChange={(val) => {
                if (val) handlePlayerSelect(val)
              }}
              disabled={playerOptions.length === 0}
            >
              <SelectTrigger className="w-full cursor-pointer text-xs font-medium">
                <SelectValue
                  placeholder={
                    !standings
                      ? "Loading Players..."
                      : playerOptions.length === 0
                        ? "No Players Found"
                        : "Select Player"
                  }
                >
                  {selectedPlayerDisplay ?? "Select Player"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {playerOptions.map((p) => (
                  <SelectItem
                    key={p.playerId}
                    value={p.playerId}
                    className="cursor-pointer text-xs"
                  >
                    #{p.rank} {p.name} ({p.elo} ELO)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </aside>
      </div>
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
