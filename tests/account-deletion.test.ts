import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/**
 * App Store review guideline 5.1.1(v) requires in-app account deletion from any
 * app that offers account creation. The risk once two clients can erase an
 * account is that they drift into erasing different amounts — a browser delete
 * that removes attachment files and hands over household ownership, and an app
 * delete that quietly leaves either behind. These tests hold both to one
 * implementation.
 */

const shared = readFileSync('src/lib/account-deletion.ts', 'utf8')
const webRoute = readFileSync('src/pages/api/account/delete.ts', 'utf8')
const mobileRoute = readFileSync('src/pages/api/mobile/v1/account/delete.ts', 'utf8')

test('both delete routes erase through the one shared implementation', () => {
  for (const [name, route] of [['web', webRoute], ['mobile', mobileRoute]] as const) {
    assert.match(route, /deleteUserAccount/, `${name} route does not call the shared erasure`)
    assert.doesNotMatch(route, /prisma\.user\.delete/, `${name} route erases on its own instead of sharing`)
    assert.doesNotMatch(route, /household\.delete/, `${name} route cascades households on its own`)
  }
})

test('deletion requires the password and refuses demo accounts on both clients', () => {
  assert.match(shared, /bcrypt\.compare/)
  assert.match(shared, /Password is incorrect/)
  for (const [name, route] of [['web', webRoute], ['mobile', mobileRoute]] as const) {
    assert.match(route, /rejectDemoUser/, `${name} route allows demo accounts to be deleted`)
    assert.match(route, /req\.body\?\.password/, `${name} route does not take a password`)
  }
})

test('each client authenticates deletion with its own credential', () => {
  assert.match(webRoute, /getUserIdOr401/)
  assert.doesNotMatch(webRoute, /requireMobileIdentity/)
  assert.match(mobileRoute, /requireMobileIdentity/)
  assert.doesNotMatch(mobileRoute, /getUserIdOr401|getServerSession/)
})

test('deletion is POST-only, rate limited, and removes attachment files', () => {
  assert.match(shared, /consumeLoginAttempt/)
  assert.match(shared, /collectAttachmentFilenamesForUser/)
  assert.match(shared, /deleteNoteAttachmentFiles/)
  for (const [name, route] of [['web', webRoute], ['mobile', mobileRoute]] as const) {
    assert.match(route, /req\.method !== 'POST'/, `${name} route does not restrict the method`)
  }
})

test('household ownership is handed over before a household is erased', () => {
  // Deleting the only owner must not silently destroy a household that other
  // people still belong to.
  assert.match(shared, /role: 'OWNER', userId: \{ not: userId \}/)
  assert.match(shared, /FOR UPDATE/)
})
