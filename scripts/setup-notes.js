#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function setupNotesTable() {
  console.log('🚀 Setting up Notes table...');
  
  try {
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'create-notes-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`  ${i + 1}. ${statement.substring(0, 50)}...`);
        await prisma.$executeRawUnsafe(statement);
      }
    }
    
    console.log('✅ Notes table created successfully!');
    
    // Test the table by trying to query it
    const testQuery = await prisma.note.findMany({ take: 1 });
    console.log('✅ Table is working correctly!');
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Notes table already exists, skipping creation.');
    } else {
      console.error('❌ Error setting up Notes table:', error.message);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupNotesTable()
  .then(() => {
    console.log('🎉 Notes setup complete! You can now use the notes feature.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });
