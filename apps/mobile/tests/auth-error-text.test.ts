import assert from "node:assert/strict"
import { test, describe } from "node:test"
import {
  LOGIN_LOCKED_ERROR,
  UNIFORM_LOGIN_ERROR,
  loginErrorMessage,
} from "../src/lib/auth-errors"

/**
 * A13: the mobile login screen must show the same message for an unknown
 * account, a suspended account and a wrong password, so the UI cannot leak
 * account state. Only the lockout state gets its own (non-revealing) copy.
 */
describe("A13 mobile login error text", () => {
  test("wrong password and suspended account render the same text", () => {
    assert.equal(loginErrorMessage({ code: "UNAUTHORIZED", message: "Invalid email or password" }), UNIFORM_LOGIN_ERROR)
    assert.equal(
      loginErrorMessage({ code: "FORBIDDEN", message: "Your account has been suspended or deactivated" }),
      UNIFORM_LOGIN_ERROR
    )
  })

  test("an unknown-account server message can never reach the screen verbatim", () => {
    // Even if a future server regression sends a specific reason, the client
    // collapses it to the uniform text for 401/403 responses.
    assert.equal(
      loginErrorMessage({ code: "UNAUTHORIZED", message: "No account with that email" }),
      UNIFORM_LOGIN_ERROR
    )
  })

  test("lockout gets a distinct retry-later message", () => {
    assert.equal(loginErrorMessage({ code: "RATE_LIMITED", message: "Too many" }), LOGIN_LOCKED_ERROR)
    assert.equal(loginErrorMessage({ code: "TOO_MANY_REQUESTS" }), LOGIN_LOCKED_ERROR)
  })

  test("a missing error still has a visible message", () => {
    assert.equal(loginErrorMessage(null), UNIFORM_LOGIN_ERROR)
    assert.equal(loginErrorMessage({ message: "   " }), UNIFORM_LOGIN_ERROR)
  })
})
