import assert from "node:assert/strict"
import { verifyTurnstileToken, isTurnstileEnabled } from "../../lib/security/turnstile"

async function main() {
  const results: string[] = []

  delete process.env.TURNSTILE_ENABLED
  delete process.env.TURNSTILE_SECRET_KEY
  results.push(`flag-off enabled=${isTurnstileEnabled()} result=${JSON.stringify(await verifyTurnstileToken(null))}`)

  process.env.TURNSTILE_ENABLED = "true"
  delete process.env.TURNSTILE_SECRET_KEY
  {
    const r = await verifyTurnstileToken("whatever")
    results.push(`enabled-no-secret result=${JSON.stringify(r)}`)
    assert.equal(r.success, false)
    assert.equal(r.status, 500)
  }

  process.env.TURNSTILE_SECRET_KEY = "dummy-test-secret"
  {
    const r = await verifyTurnstileToken("")
    results.push(`enabled-empty-token result=${JSON.stringify(r)}`)
    assert.equal(r.success, false)
    assert.equal(r.status, 400)
  }

  console.log(results.join("\n"))
  console.log("ALL ASSERTIONS PASSED")
}

main().catch((e) => {
  console.error("FAILED", e)
  process.exit(1)
})
