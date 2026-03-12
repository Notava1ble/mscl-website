import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { internal } from "./_generated/api"
import { jsonError, validateApiKey, extractRequestBody } from "./lib/utils"
import { PlayersSchema } from "./lib/validators"

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
      console.error("Handler error:", err)
      return jsonError(err.message || "Internal server error.", 500)
    }
  }),
})
