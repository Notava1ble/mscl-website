import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { internal } from "./_generated/api"
import { jsonError, validateApiKey, extractRequestBody } from "./lib/utils"
import {
  PlayersSchema,
  MatchSchema,
  WeekTransitionSchema,
} from "./lib/validators"

const http = httpRouter()

export default http

http.route({
  path: "/api/write/players",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // 1. Validate API key
    const authError = await validateApiKey(request, "WRITER_API_KEY")
    if (authError) return authError

    // 2. Extract and validate body
    const bodyResult = await extractRequestBody(request, PlayersSchema)
    if ("errorResponse" in bodyResult) return bodyResult.errorResponse
    const playersList = bodyResult.data

    // 3. Run mutation
    try {
      const result = await ctx.runMutation(
        internal.players.createOrUpdatePlayers,
        {
          players: playersList.map((p) => ({
            name: p.name,
            elo: p.elo,
            leagueTier: p.leagueTier,
          })),
        }
      )

      console.info(
        `[Success] POST /api/write/players: Created/Updated ${result.count} players`
      )
      return new Response(
        JSON.stringify({ success: true, updated: result.count }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      )
    } catch (err: any) {
      console.error(`[Handler Error] POST /api/write/players:`, err)
      return jsonError(err.message || "Internal server error.", 500)
    }
  }),
})

http.route({
  path: "/api/write/match",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Validate API key
    const authError = await validateApiKey(request, "WRITER_API_KEY")
    if (authError) return authError

    // Extract and validate body
    const bodyResult = await extractRequestBody(request, MatchSchema)
    if ("errorResponse" in bodyResult) return bodyResult.errorResponse
    const matchData = bodyResult.data

    // Run mutation
    try {
      const result = await ctx.runMutation(internal.matches.ingestMatch, {
        weekNumber: matchData.weekNumber,
        matchNumber: matchData.matchNumber,
        leagueTier: matchData.leagueTier,
        rankedMatchId: matchData.rankedMatchId,
        results: matchData.results,
      })

      console.info(
        `[Success] POST /api/write/match: Ingested match ${matchData.matchNumber} for week ${matchData.weekNumber} (Tier ${matchData.leagueTier})`
      )
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      })
    } catch (err: any) {
      console.error(`[Handler Error] POST /api/write/match:`, err)
      return jsonError(err.message || "Internal server error.", 500)
    }
  }),
})

http.route({
  path: "/api/write/weeks/transition",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Validate API key
    const authError = await validateApiKey(request, "WRITER_API_KEY")
    if (authError) return authError

    // Extract and validate body
    const bodyResult = await extractRequestBody(request, WeekTransitionSchema)
    if ("errorResponse" in bodyResult) return bodyResult.errorResponse
    const transitionData = bodyResult.data

    // Run mutation
    try {
      const result = (await ctx.runMutation(internal.weeks.transitionWeek, {
        weekNumber: transitionData.weekNumber,
        newWeek: transitionData.newWeek,
        players: transitionData.players,
      })) as {
        success: boolean
        error?: string
        status?: number
        count?: number
      }

      if (result.success === false) {
        return jsonError(
          result.error || "Transition failed",
          result.status || 400
        )
      }

      console.info(
        `[Success] POST /api/write/weeks/transition: Transitioned week ${transitionData.weekNumber} -> ${transitionData.newWeek} for ${result.count} players`
      )
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      })
    } catch (err: any) {
      console.error(`[Handler Error] POST /api/write/weeks/transition:`, err)
      return jsonError(err.message || "Internal server error.", 500)
    }
  }),
})

// READ API'S

// Return the weeks where the player participated in.
http.route({
  path: "/api/read/players/weeks",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const authError = await validateApiKey(request, "READER_API_KEY")
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const playerName = searchParams.get("playerName")

    if (!playerName) {
      return jsonError("Missing required query parameter 'playerName'", 400)
    }

    try {
      const data = await ctx.runQuery(
        internal.matches.listPlayerWeeksParticipated,
        { playerName }
      )

      const weeks = data.weeks
      return new Response(
        JSON.stringify({
          success: true,
          weeks,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      )
    } catch (err: any) {
      console.error(`[Handler Error] GET /api/read/players/weeks:`, err)
      return jsonError(err.message || "Internal server error.", 500)
    }
  }),
})

// Return the leagues where the player is currently at, or at specific week.
http.route({
  path: "/api/read/players/league",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const authError = await validateApiKey(request, "READER_API_KEY")
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const playerName = searchParams.get("playerName")
    const week = searchParams.get("week")

    if (!playerName) {
      return jsonError("Missing required query parameter 'playerName'", 400)
    }

    try {
      const weekNumber = week ? Number(week) : undefined
      if (week && !Number.isFinite(weekNumber)) {
        return jsonError("Query parameter 'week' must be a number", 400)
      }

      const data = await ctx.runQuery(internal.matches.getPlayerLeagueAtWeek, {
        playerName,
        weekNumber,
      })

      console.info(
        `[Success] GET /api/read/players/league: Resolved league for player ${playerName}${week ? ` (requested week ${week})` : ""}`
      )

      return new Response(
        JSON.stringify({
          success: true,
          playerName: data.playerName,
          leagueNumber: data.leagueNumber,
          weekNumber: weekNumber,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      )
    } catch (err: any) {
      console.error(`[Handler Error] GET /api/read/players/league:`, err)
      return jsonError(err.message || "Internal server error.", 500)
    }
  }),
})

// Return the total placement/points for a week.
http.route({
  path: "/api/read/players/week/summary",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const authError = await validateApiKey(request, "READER_API_KEY")
    if (authError) return authError

    const { searchParams } = new URL(request.url)

    const playerName = searchParams.get("playerName")
    const week = searchParams.get("week")

    if (!playerName || !week) {
      return jsonError(
        "Missing required query parameters 'playerName' and 'week'",
        400
      )
    }

    try {
      const data = await ctx.runQuery(internal.matches.listPlayerMatches, {
        playerName,
        weekNumber: Number(week),
      })

      const totalPoints = data.matches.reduce((sum: number, m: any) => {
        return sum + m.pointsWon
      }, 0)

      const avgPlacement =
        data.matches.length === 0
          ? null
          : data.matches.reduce((sum: number, m: any) => sum + m.placement, 0) /
            data.matches.length

      console.info(
        `[Success] GET /api/read/players/week/summary: Retrieved summary for player ${playerName} week ${week}`
      )

      return new Response(
        JSON.stringify({
          success: true,
          points: totalPoints,
          avgPlacement,
          matchesCount: data.matches.length,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      )
    } catch (err: any) {
      console.error(`[Handler Error] GET /api/read/players/week/summary:`, err)
      return jsonError(err.message || "Internal server error.", 500)
    }
  }),
})

http.route({
  path: "/api/read/players/match",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const authError = await validateApiKey(request, "READER_API_KEY")
    if (authError) return authError

    const { searchParams } = new URL(request.url)

    const playerName = searchParams.get("playerName")
    const week = searchParams.get("week")
    const match = searchParams.get("match")

    if (!playerName || !week || !match) {
      return jsonError("Missing required query parameters", 400)
    }

    try {
      const result = await ctx.runQuery(internal.matches.getPlayerMatchResult, {
        playerName,
        weekNumber: Number(week),
        matchNumber: Number(match),
      })

      // Return a 404 if not found
      if (!result) {
        return jsonError("Match not found", 404)
      }

      console.info(
        `[Success] GET /api/read/players/match: Retrieved match ${match} for player ${playerName} week ${week}`
      )
      return new Response(
        JSON.stringify({
          success: true,
          playerName,
          weekNumber: week,
          matchNumber: result.matchNumber,
          pointsWon: result.pointsWon,
          placement: result.placement,
          rankedMatchId: result.rankedMatchId,
          timeMs: result.timeMs,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      )
    } catch (err: any) {
      console.error(`[Handler Error] GET /api/read/players/match:`, err)
      return jsonError(err.message || "Internal server error.", 500)
    }
  }),
})

// REMOVED SPLITS API

// Gets player matches for specific week.
http.route({
  path: "/api/read/players/matches",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Validate API key
    const authError = await validateApiKey(request, "READER_API_KEY")
    if (authError) return authError

    // Search params
    const { searchParams } = new URL(request.url)
    const playerName = searchParams.get("playerName")

    if (!playerName) {
      return jsonError("Missing required query parameter 'playerName'", 400)
    }

    const weekNumber = searchParams.get("week")

    try {
      const data = await ctx.runQuery(internal.matches.listPlayerMatches, {
        playerName,
        weekNumber: weekNumber ? Number(weekNumber) : undefined,
      })
      console.info(
        `[Success] GET /api/read/players/matches: Retrieved ${data.matches.length} matches for player ${playerName} and week ${weekNumber || "(current)"}`
      )
      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      })
    } catch (err: any) {
      console.error(`[Handler Error] GET /api/read/players/matches:`, err)
      return jsonError(err.message || "Internal server error.", 500)
    }
  }),
})
