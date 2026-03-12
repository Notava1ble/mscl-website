import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"

const http = httpRouter()

// ── Helpers ────────────────────────────────────────────────────────────────

function jsonError(
  message: string,
  status: number,
  details?: Record<string, unknown>
) {
  return new Response(JSON.stringify({ error: message, status, ...details }), {
    status,
    headers: {
      "Content-Type": "application/json",
      // Expose allowed methods on every error so clients can self-correct
      "Access-Control-Allow-Origin": "*",
    },
  })
}

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.generateKey(
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const [aHmac, bHmac] = await Promise.all([
    crypto.subtle.sign("HMAC", key, encoder.encode(a)),
    crypto.subtle.sign("HMAC", key, encoder.encode(b)),
  ])
  const aBytes = new Uint8Array(aHmac)
  const bBytes = new Uint8Array(bHmac)
  let diff = 0
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i]
  return diff === 0
}

// Extracts the API key from any common location the caller might use
function extractApiKey(request: Request): string | null {
  // 1. x-api-key header (most common for API keys)
  const xApiKey = request.headers.get("x-api-key")
  console.log("xApiKey", xApiKey)
  console.log("request", request.headers)
  if (xApiKey) return xApiKey
  return null
}

// ── Route ──────────────────────────────────────────────────────────────────

http.route({
  path: "/my-endpoint",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    // ── 1. Check Content-Type ────────────────────────────────────────────
    const contentType = request.headers.get("content-type") ?? ""
    if (!contentType.includes("application/json")) {
      return jsonError(
        "Invalid Content-Type. Expected: application/json",
        415,
        { received: contentType || "(none)" }
      )
    }

    // ── 2. Validate API key ──────────────────────────────────────────────
    const providedKey = extractApiKey(request)

    if (!providedKey) {
      return jsonError(
        "Missing API key. Provide it via 'x-api-key' header, 'Authorization: Bearer <key>' header, or '?api_key=' query param.",
        401
      )
    }

    const expectedKey = process.env.WRITER_API_KEY ?? ""
    if (!expectedKey) {
      console.error("MY_API_KEY environment variable is not set")
      return jsonError("Server misconfiguration. Contact the API owner.", 500)
    }

    const isValid = await timingSafeEqual(providedKey, expectedKey)
    if (!isValid) {
      return jsonError("Invalid API key.", 403)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonError(
        "Invalid JSON body. Ensure the request body is valid JSON.",
        400
      )
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return jsonError(
        "Body must be a JSON object, not an array or primitive.",
        400
      )
    }

    // ── 4. Your logic here ───────────────────────────────────────────────
    try {
      const result = { success: true, received: body }
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      })
    } catch (err) {
      console.error("Handler error:", err)
      return jsonError("Internal server error.", 500)
    }
  }),
})

export default http
