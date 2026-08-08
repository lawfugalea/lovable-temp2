const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

/**
 * Shared Prisma client for the scripts in this directory.
 *
 * For scripts, ALWAYS prefer DIRECT_URL (postgresql://...), falling back to
 * DATABASE_URL. This bypasses Prisma Accelerate/Data Proxy which can block heavy
 * ETL writes.
 *
 * The client is built on first use rather than at require() time. It used to be
 * constructed at module load, which meant merely importing anything downstream of
 * this file required a database URL to exist. tests/supermarket-adapters.test.ts
 * requires scripts/sync-supermarket-prices.js for its pure parsing helpers, and
 * that pulls in this file, so the whole test file died on
 * validatePrismaClientOptions on any machine without a .env — which is every CI
 * runner. It passed locally only because dotenv above finds a real .env here.
 * The workflow says `npm test` is deliberately made up of pure unit tests; this
 * is what makes that true rather than accidental.
 *
 * The proxy is indistinguishable from the client for real callers: every access
 * goes through to a single lazily-created instance, so `prisma.store.upsert(...)`
 * and `prisma.$transaction([...])` behave exactly as before.
 */
let client = null;

function getClient() {
  if (!client) {
    const { PrismaClient } = require('@prisma/client');
    client = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DIRECT_URL || process.env.DATABASE_URL,
        },
      },
    });
  }
  return client;
}

const prisma = new Proxy(
  {},
  {
    get(_target, property) {
      const instance = getClient();
      const value = instance[property];
      // Methods must stay bound to the client, or `prisma.$transaction(...)`
      // and `prisma.$disconnect()` lose their `this`.
      return typeof value === 'function' ? value.bind(instance) : value;
    },
    has(_target, property) {
      return property in getClient();
    },
  },
);

module.exports = { prisma };
