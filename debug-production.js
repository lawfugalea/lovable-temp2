// Debug script to test production database connection
const { PrismaClient } = require('@prisma/client');

async function debugProduction() {
  console.log('🔍 Debugging Production Database Connection...');
  
  // Check environment variables
  console.log('\n📋 Environment Variables:');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('DIRECT_URL:', process.env.DIRECT_URL ? '✅ Set' : '❌ Missing');
  console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing');
  console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL ? '✅ Set' : '❌ Missing');
  
  if (!process.env.DATABASE_URL) {
    console.log('\n❌ DATABASE_URL is missing! Please set it in CapRover environment variables.');
    return;
  }
  
  try {
    const prisma = new PrismaClient();
    
    // Test database connection
    console.log('\n🔌 Testing Database Connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Check if users table exists and has data
    console.log('\n👥 Checking Users Table...');
    const userCount = await prisma.user.count();
    console.log(`📊 Total users in database: ${userCount}`);
    
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, activeHouseholdId: true }
      });
      console.log('👤 Users found:');
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.name || 'No name'}) - Household: ${user.activeHouseholdId || 'None'}`);
      });
    } else {
      console.log('❌ No users found in database! You need to create a user first.');
    }
    
    // Check households
    console.log('\n🏠 Checking Households...');
    const householdCount = await prisma.household.count();
    console.log(`📊 Total households: ${householdCount}`);
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('\n❌ Database Error:', error.message);
    console.error('Full error:', error);
  }
}

debugProduction();
