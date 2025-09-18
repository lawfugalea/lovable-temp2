const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function organizeCroatiaNote() {
  try {
    console.log('🔍 Finding Croatia Packing note...\n');

    // Find the Croatia Packing note
    const note = await prisma.note.findFirst({
      where: {
        title: {
          contains: 'Croatia',
          mode: 'insensitive'
        }
      },
      include: {
        checklistItems: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!note) {
      console.log('❌ Croatia Packing note not found');
      return;
    }

    console.log('📝 Found Croatia Packing note with', note.checklistItems.length, 'items');

    // Define category mappings based on keywords
    const categoryMappings = {
      'Luggage': ['luggage', 'bag', 'backpack', '20kilo', '10kilo', 'doona', 'oyster'],
      'Hailey Daily Needs': ['hailey', 'thermos', 'bottle', 'milk', 'nappies', 'wet wipes', 'nappy cream', 'sleep sack', 'deer', 'muslins', 'dummy', 'ella'],
      'Nathan Daily Needs': ['nathan', 'reading books', 'friends to sleep', 'cutlery'],
      'Shared Items': ['camera', 'sanitizer', 'detergent', 'vinegar', 'toys', 'teethers', 'meds', 'room temp']
    };

    console.log('\n🏷️ Organizing items into categories...\n');

    let updatedCount = 0;

    for (const item of note.checklistItems) {
      if (item.category) {
        console.log(`⏭️  Skipping "${item.text}" - already has category: ${item.category}`);
        continue;
      }

      const itemText = item.text.toLowerCase();
      let assignedCategory = null;

      // Find matching category
      for (const [category, keywords] of Object.entries(categoryMappings)) {
        if (keywords.some(keyword => itemText.includes(keyword))) {
          assignedCategory = category;
          break;
        }
      }

      if (assignedCategory) {
        await prisma.checklistItem.update({
          where: { id: item.id },
          data: { category: assignedCategory }
        });
        
        console.log(`✅ "${item.text}" → 📁 ${assignedCategory}`);
        updatedCount++;
      } else {
        console.log(`⚪ "${item.text}" → 📋 Items (no category match)`);
      }
    }

    console.log(`\n🎉 Successfully organized ${updatedCount} items into categories!`);
    console.log('\n📊 Summary:');
    
    // Show final category breakdown
    const updatedNote = await prisma.note.findFirst({
      where: { id: note.id },
      include: {
        checklistItems: {
          orderBy: { order: 'asc' }
        }
      }
    });

    const grouped = updatedNote.checklistItems.reduce((groups, item) => {
      const category = item.category || 'Items';
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
      return groups;
    }, {});

    Object.entries(grouped).forEach(([category, items]) => {
      const icon = category === 'Items' ? '📋' : '📁';
      console.log(`${icon} ${category}: ${items.length} items`);
    });

    console.log('\n💡 Now you can:');
    console.log('• See organized categories in your note');
    console.log('• Drag items between categories');
    console.log('• Create new categories');
    console.log('• Check off items as you pack!');

  } catch (error) {
    console.error('❌ Error organizing note:', error);
  } finally {
    await prisma.$disconnect();
  }
}

organizeCroatiaNote();
