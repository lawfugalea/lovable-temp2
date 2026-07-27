// Create or reset a user directly in the production database.
//
//   node scripts/create-production-user.js <email> <strong-password> <name>
//
// Reads DATABASE_URL from the environment, so run it with the production
// .env loaded. It writes to the live database — take a backup first with
// ./scripts/backup-houseflow-db.sh.
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function createProductionUser() {
  console.log('👤 Creating Production User...');
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL is missing! Run this with the production environment loaded.');
    process.exitCode = 1;
    return;
  }

  const email = String(process.argv[2] || '').trim().toLowerCase();
  const password = String(process.argv[3] || '');
  const name = String(process.argv[4] || '').trim();
  if (!email || !password || !name) {
    console.error('Usage: node create-production-user.js <email> <strong-password> <name>');
    process.exitCode = 1;
    return;
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('❌ A valid email address is required.');
    process.exitCode = 1;
    return;
  }
  if (password.length < 12 || password.length > 128 || !/[A-Z]/.test(password)
    || !/[a-z]/.test(password) || !/\d/.test(password)) {
    console.error('❌ Password must be 12-128 characters and include uppercase, lowercase, and a number.');
    process.exitCode = 1;
    return;
  }
  if (name.length < 2 || name.length > 50) {
    console.error('❌ Name must be between 2 and 50 characters.');
    process.exitCode = 1;
    return;
  }
  
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();

    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${name}`);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      console.log('⚠️  User already exists! Updating password...');
      
      const hashedPassword = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { email },
        data: { 
          password: hashedPassword,
          name: name
        }
      });
      
      console.log('✅ User password updated successfully!');
    } else {
      console.log('🆕 Creating new user...');
      
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name
        }
      });
      
      console.log('✅ User created successfully!');
      console.log(`🆔 User ID: ${user.id}`);
    }
    
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

createProductionUser();
