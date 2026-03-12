/**
 * Test script for Convex HTTP APIs
 * Run with: bun scripts/test-api.ts
 */

const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL
const MY_API_KEY = process.env.WRITER_API_KEY || "test_key_placeholder"

if (!CONVEX_SITE_URL) {
  console.error("Error: CONVEX_SITE_URL environment variable is not set.")
  process.exit(1)
}

const ENDPOINT = `${CONVEX_SITE_URL}/api/write/players`

interface TestOptions {
  name: string
  method?: string
  headers?: Record<string, string>
  body?: any
  expectedStatus: number
}

async function runTest({
  name,
  method = "POST",
  headers = {},
  body,
  expectedStatus,
}: TestOptions) {
  console.log(`\n--- Test: ${name} ---`)

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": MY_API_KEY,
    ...headers,
  }

  // If header is explicitly null, remove it
  for (const key in finalHeaders) {
    if ((finalHeaders as any)[key] === null) {
      delete (finalHeaders as any)[key]
    }
  }

  try {
    const response = await fetch(ENDPOINT, {
      method,
      headers: finalHeaders,
      body:
        body !== undefined
          ? typeof body === "string"
            ? body
            : JSON.stringify(body)
          : undefined,
    })

    const data = await response
      .json()
      .catch(() => ({ error: "Could not parse JSON" }))
    const passed = response.status === expectedStatus

    console.log(`Status: ${response.status} (Expected: ${expectedStatus})`)
    console.log(`Result: ${passed ? "✅ PASSED" : "❌ FAILED"}`)
    console.log("Body:", JSON.stringify(data, null, 2))
    if (!passed) {
      console.log("Response:", JSON.stringify(data, null, 2))
    }
    return passed
  } catch (err) {
    console.error(`Test "${name}" execution error:`, err)
    return false
  }
}

async function runAllTests() {
  console.log(`Testing endpoint: ${ENDPOINT}\n`)
  let passedCount = 0
  let totalCount = 0

  const tests: TestOptions[] = [
    // 1. Success Cases
    // {
    //   name: "Successful Request (Valid array)",
    //   body: [{ name: "ValidPlayer", elo: 1500, leagueTier: 1 }],
    //   expectedStatus: 200,
    // },
    {
      name: "Successful Request (Empty array)",
      body: [],
      expectedStatus: 200,
    },

    // 2. Authentication
    {
      name: "Missing API Key",
      headers: { "x-api-key": null as any },
      body: [],
      expectedStatus: 401,
    },
    {
      name: "Invalid API Key",
      headers: { "x-api-key": "wrong_key" },
      body: [],
      expectedStatus: 403,
    },

    // 3. Content-Type & JSON
    {
      name: "Missing Content-Type",
      headers: { "Content-Type": null as any },
      body: "[]",
      expectedStatus: 415,
    },
    {
      name: "Invalid Content-Type",
      headers: { "Content-Type": "text/plain" },
      body: "[]",
      expectedStatus: 415,
    },
    {
      name: "Invalid JSON Body",
      body: "{ invalid json",
      expectedStatus: 400,
    },

    // 4. Schema Validation - Structural
    {
      name: "Invalid Body Structure (Object instead of Array)",
      body: { players: [] },
      expectedStatus: 400,
    },

    // 5. Schema Validation - Field Constraints
    {
      name: "Missing 'name' field",
      body: [{ elo: 1500, leagueTier: 1 }],
      expectedStatus: 400,
    },
    {
      name: "Empty 'name' string",
      body: [{ name: "", elo: 1500, leagueTier: 1 }],
      expectedStatus: 400,
    },
    {
      name: "Invalid 'elo' (0)",
      body: [{ name: "Player", elo: 0, leagueTier: 1 }],
      expectedStatus: 400,
    },
    {
      name: "Invalid 'elo' (Negative)",
      body: [{ name: "Player", elo: -100, leagueTier: 1 }],
      expectedStatus: 400,
    },
    {
      name: "Invalid 'elo' (Non-number)",
      body: [{ name: "Player", elo: "1500", leagueTier: 1 }],
      expectedStatus: 400,
    },
    {
      name: "Invalid 'leagueTier' (0 - Below min)",
      body: [{ name: "Player", elo: 1500, leagueTier: 0 }],
      expectedStatus: 400,
    },
    {
      name: "Invalid 'leagueTier' (7 - Above max)",
      body: [{ name: "Player", elo: 1500, leagueTier: 7 }],
      expectedStatus: 400,
    },
    {
      name: "Invalid 'leagueTier' (Decimal)",
      body: [{ name: "Player", elo: 1500, leagueTier: 1.5 }],
      expectedStatus: 400,
    },
  ]

  for (const test of tests) {
    totalCount++
    if (await runTest(test)) {
      passedCount++
    }
  }

  console.log(`\n--- Summary ---`)
  console.log(`Total: ${totalCount}`)
  console.log(`Passed: ${passedCount}`)
  console.log(`Failed: ${totalCount - passedCount}`)

  if (passedCount === totalCount) {
    console.log("\n✨ All tests passed!")
  } else {
    console.log("\n❌ Some tests failed.")
    process.exit(1)
  }
}

runAllTests()
