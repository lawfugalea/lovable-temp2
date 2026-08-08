#!/usr/bin/env node
/**
 * Establish the blast radius of the next-auth 4.24.15 email-normalisation fix
 * before deploying it.
 *
 * The advisory (Auth.js: "Email normalizer validates the address before Unicode
 * normalization, allowing a homoglyph @ bypass") is about the built-in Email
 * provider. Clankeep signs in through the Credentials provider and does its own
 * comparison — `src/pages/api/auth/[...nextauth].ts` lowercases and trims the
 * submitted address, and Prisma looks it up against a unique column — so the
 * patched normaliser is not expected to sit in the login path at all.
 *
 * "Not expected to" is the reason this script exists. It costs one read-only
 * query to turn that into a fact, and the alternative way to find out is a
 * customer who cannot log in.
 *
 * Reports three things:
 *
 *   1. addresses that are not already Unicode-normalised (NFKC), i.e. the ones
 *      whose canonical form changes under the new normaliser;
 *   2. distinct addresses that collide once normalised and lowercased, which
 *      would be a pre-existing duplicate-account problem rather than a new one;
 *   3. addresses containing a non-ASCII character anywhere, the population the
 *      advisory concerns at all.
 *
 * Read-only: one SELECT, no writes, safe against production. Reads DATABASE_URL
 * from the environment like the rest of the app.
 *
 *   node scripts/check-email-normalization.mjs
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function isAscii(value) {
  return [...value].every((character) => character.codePointAt(0) <= 0x7f)
}

try {
  const users = await prisma.user.findMany({ select: { id: true, email: true } })

  const unnormalised = []
  const nonAscii = []
  const byCanonical = new Map()

  for (const user of users) {
    const email = user.email ?? ''
    const canonical = email.normalize('NFKC').toLowerCase()

    if (email.normalize('NFKC') !== email) unnormalised.push(user)
    if (!isAscii(email)) nonAscii.push(user)

    if (!byCanonical.has(canonical)) byCanonical.set(canonical, [])
    byCanonical.get(canonical).push(user)
  }

  const collisions = [...byCanonical.entries()].filter(([, group]) => group.length > 1)

  console.log(`Accounts examined: ${users.length}`)
  console.log(`Not NFKC-normalised: ${unnormalised.length}`)
  console.log(`Containing non-ASCII characters: ${nonAscii.length}`)
  console.log(`Distinct addresses colliding after normalise+lowercase: ${collisions.length}`)

  // Addresses are personal data, so print them only when there is something to
  // act on and an operator therefore needs to know who to contact.
  for (const user of unnormalised) {
    console.log(`  not normalised: ${user.email} (user ${user.id})`)
  }
  for (const [canonical, group] of collisions) {
    console.log(`  collision on ${canonical}: ${group.map((u) => `${u.email} (${u.id})`).join(', ')}`)
  }

  if (unnormalised.length === 0 && collisions.length === 0) {
    console.log('\nNo account changes canonical form under the patched normaliser. Safe to deploy.')
    process.exit(0)
  }

  console.error(
    '\nAt least one account changes canonical form, or two accounts collide once\n' +
    'normalised. Contact these users, or confirm the credentials path is unaffected,\n' +
    'before deploying the next-auth upgrade.',
  )
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
