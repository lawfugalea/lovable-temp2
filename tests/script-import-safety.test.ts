import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

/**
 * The unit suite must not need a database.
 *
 * `.github/workflows/ci.yml` states that `npm test` is "deliberately made up of
 * pure unit tests", but nothing enforced it, and the first time CI ever ran the
 * suite it failed: tests/supermarket-adapters.test.ts requires
 * scripts/sync-supermarket-prices.js for its pure parsing helpers, that file
 * requires scripts/prisma.js, and scripts/prisma.js used to construct a
 * PrismaClient at module load. With no .env on a runner, `url` resolved to
 * undefined and the whole test file died on
 * `PrismaClientConstructorValidationError`.
 *
 * It passed on a developer machine for a reason worth remembering: the generated
 * client loads the project's .env itself, relative to the schema path recorded at
 * generate time, so a real .env sitting in the repo hid the problem no matter
 * which directory the tests ran from.
 *
 * This test fails if a script goes back to connecting at import time.
 */

const ROOT = path.resolve(__dirname, '..')

/** Scripts that unit tests import for their pure helpers. */
const IMPORT_SAFE_SCRIPTS = ['scripts/prisma.js', 'scripts/sync-supermarket-prices.js']

test('importing a script never constructs a Prisma client', () => {
  const prismaModule = require(path.join(ROOT, 'node_modules/@prisma/client'))
  const original = prismaModule.PrismaClient

  Object.defineProperty(prismaModule, 'PrismaClient', {
    value: function ConstructionTrap() {
      throw new Error('A Prisma client was constructed at import time')
    },
    configurable: true,
    writable: true,
  })

  try {
    for (const script of IMPORT_SAFE_SCRIPTS) {
      const resolved = path.join(ROOT, script)
      delete require.cache[require.resolve(resolved)]
      assert.doesNotThrow(
        () => require(resolved),
        `${script} constructs a Prisma client at import, so it cannot be required without a database URL`,
      )
    }
  } finally {
    Object.defineProperty(prismaModule, 'PrismaClient', {
      value: original,
      configurable: true,
      writable: true,
    })
  }
})

test('the lazy client still exposes the model API it is asked for', () => {
  // Guards the proxy in scripts/prisma.js: a naive lazy wrapper that forgets to
  // bind methods breaks `prisma.$transaction([...])` at runtime, in a worker,
  // where nobody is watching.
  const { prisma } = require(path.join(ROOT, 'scripts/prisma.js'))
  assert.equal(typeof prisma.$transaction, 'function')
  assert.equal(typeof prisma.$disconnect, 'function')
  assert.equal(typeof prisma.store.upsert, 'function')
})
