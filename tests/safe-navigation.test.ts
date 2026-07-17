import test from "node:test"
import assert from "node:assert/strict"
import { resolveSafeAppPath } from "../src/lib/safe-navigation"

const origin = "https://houseflow.example"

test("safe navigation accepts same-origin application paths", () => {
  assert.equal(resolveSafeAppPath("/notes?view=shared#today", origin), "/notes?view=shared#today")
  assert.equal(resolveSafeAppPath("/invites/accept?token=abc", origin), "/invites/accept?token=abc")
})

test("safe navigation rejects external and backslash redirect forms", () => {
  for (const candidate of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/%5Cevil.example",
    "",
  ]) {
    assert.equal(resolveSafeAppPath(candidate, origin), "/dashboard")
  }
})

test("safe navigation keeps redirects inside a configured base path", () => {
  assert.equal(resolveSafeAppPath("/notes", origin, "/houseflow"), "/houseflow/notes")
  assert.equal(resolveSafeAppPath("/houseflow/notes", origin, "/houseflow"), "/houseflow/notes")
  assert.equal(resolveSafeAppPath("/../admin", origin, "/houseflow"), "/houseflow/dashboard")
})
