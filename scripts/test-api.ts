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

const ENDPOINT = `${CONVEX_SITE_URL}/my-endpoint`

async function testEndpoint() {
  console.log(`Testing endpoint: ${ENDPOINT}\n`)

  // 1. Test Successful Request
  console.log("--- Test 1: Successful Request ---")
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": MY_API_KEY,
      },
      body: JSON.stringify({
        message: "Hello from test script!",
        timestamp: Date.now(),
      }),
    })
    const data = await response.json()
    console.log(`Status: ${response.status}`)
    console.log("Response:", JSON.stringify(data, null, 2))
  } catch (err) {
    console.error("Test 1 failed:", err)
  }

  // 2. Test Missing API Key
  console.log("\n--- Test 2: Missing API Key ---")
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ test: "no key" }),
    })
    const data = await response.json()
    console.log(`Status: ${response.status}`)
    console.log("Response:", JSON.stringify(data, null, 2))
  } catch (err) {
    console.error("Test 2 failed:", err)
  }

  // 3. Test Invalid API Key
  console.log("\n--- Test 3: Invalid API Key ---")
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "invalid_key_123",
      },
      body: JSON.stringify({ test: "invalid key" }),
    })
    const data = await response.json()
    console.log(`Status: ${response.status}`)
    console.log("Response:", JSON.stringify(data, null, 2))
  } catch (err) {
    console.error("Test 3 failed:", err)
  }

  // 4. Test Invalid Content-Type
  console.log("\n--- Test 4: Invalid Content-Type ---")
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "x-api-key": MY_API_KEY,
      },
      body: "Not JSON",
    })
    const data = await response.json()
    console.log(`Status: ${response.status}`)
    console.log("Response:", JSON.stringify(data, null, 2))
  } catch (err) {
    console.error("Test 4 failed:", err)
  }
}

testEndpoint()
