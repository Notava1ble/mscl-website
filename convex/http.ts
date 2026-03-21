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
