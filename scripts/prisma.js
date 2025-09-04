const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const { PrismaClient } = require('@prisma/client');

/**
 * For scripts, ALWAYS prefer DIRECT_URL (postgresql://...), falling back to DATABASE_URL.
 * This bypasses Prisma Accelerate/Data Proxy which can block heavy ETL writes.
 */
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

module.exports = { prisma };