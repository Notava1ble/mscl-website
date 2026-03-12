import { z } from "zod"

/**
 * Utility functions for Convex HTTP actions.
 */

export function jsonError(
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

export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
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

export function extractApiKey(request: Request): string | null {
  const xApiKey = request.headers.get("x-api-key")
  if (xApiKey) return xApiKey
  return null
}

/**
 * Validates the API key from the request header against an environment variable.
 * Returns a Response if validation fails, or null if successful.
 */
export async function validateApiKey(
  request: Request,
  envVarName: string
): Promise<Response | null> {
  const providedKey = extractApiKey(request)
  if (!providedKey) {
    return jsonError("Missing API key. Provide it via 'x-api-key' header.", 401)
  }

  const expectedKey = process.env[envVarName] ?? ""
  if (!expectedKey) {
    console.error(`${envVarName} environment variable is not set`)
    return jsonError("Server misconfiguration. Contact the API owner.", 500)
  }

  const isValid = await timingSafeEqual(providedKey, expectedKey)
  if (!isValid) {
    return jsonError("Invalid API key.", 403)
  }

  return null
}

/**
 * Checks content type and extracts the JSON body, validating it against a schema.
 * Returns the data if successful, or a Response if validation fails.
 */
export async function extractRequestBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<{ data: T } | { errorResponse: Response }> {
  // 1. Check Content-Type
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    return {
      errorResponse: jsonError(
        "Invalid Content-Type. Expected: application/json",
        415,
        { received: contentType || "(none)" }
      ),
    }
  }

  // 2. Parse JSON
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return { errorResponse: jsonError("Invalid JSON body.", 400) }
  }

  // 3. Validate Schema
  const parseResult = schema.safeParse(body)
  if (!parseResult.success) {
    return {
      errorResponse: jsonError("Invalid body payload.", 400, {
        issues: parseResult.error.issues,
      }),
    }
  }

  return { data: parseResult.data }
}
