#!/usr/bin/env node
/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const store = await prisma.store.findUnique({
      where: { domain: 'smart.com.mt' },
      select: { id: true, name: true, domain: true, createdAt: true, updatedAt: true },
    });

    const storeId = store?.id || null;

    const products = storeId
      ? await prisma.priceProduct.count({ where: { storeId } })
      : 0;

    const offers = storeId
      ? await prisma.priceOffer.count({ where: { storeId } })
      : 0;

    const latest = storeId
      ? await prisma.priceOffer.findFirst({
          where: { storeId },
          orderBy: { scrapedAt: 'desc' },
          include: { product: { select: { name: true } } },
        })
      : null;

    console.log({
      store,
      products,
      offers,
      latestSample: latest?.product?.name,
      latestPriceCents: latest?.priceCents,
      latestAt: latest?.scrapedAt,
    });
  } catch (e) {
    console.error('check-prices error:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
