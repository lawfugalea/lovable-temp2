/* clear-all-notes.js */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

async function clearAllNotes() {
  try {
    console.log('🗑️  Starting to clear all notes data...');
    
    // Check if memos-data directory exists
    const memosDataDir = path.join(__dirname, 'memos-data');
    if (!fs.existsSync(memosDataDir)) {
      console.log('📁 No memos-data directory found. Nothing to clear.');
      return;
    }
    
    // Check if memos database file exists
    const dbPath = path.join(memosDataDir, 'memos_prod.db');
    if (!fs.existsSync(dbPath)) {
      console.log('📄 No memos database file found. Nothing to clear.');
      return;
    }
    
    // Get file size before deletion for reporting
    const stats = fs.statSync(dbPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`📊 Found memos database: ${fileSizeMB} MB`);
    
    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, 'memos-data-backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Create timestamp for backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `memos_prod_backup_${timestamp}.db`);
    
    // Create backup before deletion
    console.log('💾 Creating backup...');
    fs.copyFileSync(dbPath, backupPath);
    console.log(`✅ Backup created: ${backupPath}`);
    
    // Delete the database file
    console.log('🗑️  Deleting memos database...');
    fs.unlinkSync(dbPath);
    console.log('✅ Memos database deleted successfully');
    
    // Check for any other files in memos-data directory
    const files = fs.readdirSync(memosDataDir);
    if (files.length > 0) {
      console.log('📁 Other files found in memos-data directory:');
      files.forEach(file => {
        const filePath = path.join(memosDataDir, file);
        const fileStats = fs.statSync(filePath);
        console.log(`   - ${file} (${(fileStats.size / 1024).toFixed(2)} KB)`);
      });
      
      console.log('⚠️  Note: Only the database file was deleted. Other files remain.');
    } else {
      console.log('📁 memos-data directory is now empty');
    }
    
    console.log('\n🎉 All notes have been cleared successfully!');
    console.log('📝 To restore notes, you can:');
    console.log('   1. Copy a backup file back to memos-data/memos_prod.db');
    console.log('   2. Start fresh with a new memos instance');
    console.log(`   3. Your backup is saved at: ${backupPath}`);
    
  } catch (error) {
    console.error('❌ Error clearing notes:', error.message);
    process.exit(1);
  }
}

// Run the script
clearAllNotes();
