/* scripts/delete-smart-data.js */
/* eslint-disable no-console */
const { prisma } = require('./prisma');

async function deleteSmartData() {
  try {
    const store = await prisma.store.findUnique({
      where: { domain: 'www.smart.com.mt' },
    });

    if (!store) {
      console.log('No store found for www.smart.com.mt. Nothing to delete.');
      return;
    }

    // Delete offers first (due to foreign key constraints)
    const deletedOffers = await prisma.priceOffer.deleteMany({
      where: { product: { storeId: store.id } },
    });

    // Then delete products
    const deletedProducts = await prisma.priceProduct.deleteMany({
      where: { storeId: store.id },
    });

    // Finally, delete the store
    const deletedStore = await prisma.store.delete({
      where: { id: store.id },
    });

    console.log(`Deleted ${deletedOffers.count} offers, ${deletedProducts.count} products, and the store.`);
  } catch (e) {
    console.error('Error deleting data:', e);
  } finally {
    await prisma.$disconnect();
  }
}

deleteSmartData();