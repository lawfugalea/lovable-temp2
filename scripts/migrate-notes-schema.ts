import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateNotesSchema() {
  console.log('Starting notes schema migration...')
  
  try {
    // First, let's check if we can query notes at all
    console.log('Checking database connection...')
    
    // Get all existing notes using the new schema
    const notes = await prisma.note.findMany({
      select: {
        id: true,
        title: true,
        content: true,
        ownerId: true,
        householdId: true,
        color: true,
        isPinned: true,
        visibility: true
      }
    })
    
    console.log(`Found ${notes.length} notes to migrate`)
    
    if (notes.length === 0) {
      console.log('No notes found to migrate')
      return
    }
    
    for (const note of notes) {
      console.log(`Checking note: ${note.id} - ${note.title}`)
      
      // Check if note has all required fields
      const needsUpdate = !note.content || !note.ownerId || !note.householdId
      
      if (needsUpdate) {
        console.log(`  - Note needs migration`)
        
        // Set default values for missing fields
        await prisma.note.update({
          where: { id: note.id },
          data: {
            content: note.content || '',
            ownerId: note.ownerId || 'unknown',
            householdId: note.householdId || 'unknown',
            color: note.color || 'yellow',
            isPinned: note.isPinned || false,
            visibility: note.visibility || 'HOUSEHOLD'
          }
        })
        
        console.log(`  - Successfully migrated note: ${note.id}`)
      } else {
        console.log(`  - Note is already up to date`)
      }
    }
    
    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

migrateNotesSchema()
  .catch((error) => {
    console.error('Migration script failed:', error)
    process.exit(1)
  })
