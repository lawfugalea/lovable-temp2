// Script to create a user in production database
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function createProductionUser() {
  console.log('👤 Creating Production User...');
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL is missing! Please set it in CapRover environment variables.');
    return;
  }
  
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    
    // Get user details from command line arguments or use defaults
    const email = process.argv[2] || 'admin@example.com';
    const password = process.argv[3] || 'admin123';
    const name = process.argv[4] || 'Admin User';
    
    console.log(`📧 Email: ${email}`);
    console.log(`🔒 Password: ${password}`);
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
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    console.error('Full error:', error);
  }
}

createProductionUser();
