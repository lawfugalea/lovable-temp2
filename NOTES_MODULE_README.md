# Houseflow Notes Module

A collaborative notes module built with BlockNote + Liveblocks for real-time editing, featuring PWA support and offline functionality.

## Features

- **Rich Text Editor**: BlockNote with toolbar, headings, checklists, and formatting
- **Real-time Collaboration**: Liveblocks integration with presence indicators and cursors
- **Color-coded Notes**: 8 different color themes for organization
- **Pin/Unpin Notes**: Pin important notes to the top
- **Visibility Controls**: Private, Household, or Read-only access levels
- **Auto-save**: Debounced saving every 2 seconds and on blur
- **PWA Support**: Offline caching and sync when back online
- **Masonry Grid Layout**: Beautiful responsive grid for note cards
- **Quick Capture**: Fast note creation from the list view

## Setup Instructions

### 1. Environment Variables

Add these environment variables to your `.env` file:

```env
# Liveblocks Configuration
LIVEBLOCKS_SECRET_KEY=your_liveblocks_secret_key_here
LIVEBLOCKS_PUBLIC_KEY=your_liveblocks_public_key_here

# NextAuth (if not already configured)
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
```

### 2. Liveblocks Setup

1. Sign up at [liveblocks.io](https://liveblocks.io)
2. Create a new project
3. Get your secret key from the dashboard
4. Add the keys to your environment variables

### 3. Database Migration

Run the Prisma migration to add the Notes table:

```bash
# Generate Prisma client
npx prisma generate

# Create and apply migration (if you have database permissions)
npx prisma migrate dev --name add_notes_module

# Or manually run the SQL if migration fails:
# The Note model is already added to schema.prisma
```

### 4. Install Dependencies

The required dependencies are already installed:

```bash
npm install @blocknote/core @blocknote/react @blocknote/mantine @liveblocks/client @liveblocks/react @liveblocks/node
```

### 5. Service Worker Registration

The notes module includes a service worker for offline functionality. To register it, add this to your main service worker or create a new one:

```javascript
// In your main sw.js or create a new service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw-notes.js');
}
```

## File Structure

```
src/
├── pages/
│   ├── api/
│   │   ├── liveblocks-auth.ts          # Liveblocks authentication
│   │   └── notes/
│   │       ├── index.ts                # GET/POST /api/notes
│   │       └── [id].ts                 # GET/PUT/DELETE /api/notes/[id]
│   └── notes/
│       ├── index.tsx                   # Notes list page
│       └── [id].tsx                    # Note editor page
├── lib/
│   └── liveblocks.ts                   # Liveblocks configuration
├── hooks/
│   └── useOfflineNotes.ts              # Offline functionality hook
└── styles/
    └── globals.css                     # Updated with BlockNote styles

public/
└── sw-notes.js                         # Service worker for offline support

prisma/
└── schema.prisma                       # Updated with Note model
```

## API Endpoints

### GET /api/notes
Returns all notes for the user's active household.

**Response:**
```json
[
  {
    "id": "note_id",
    "title": "Note Title",
    "contentJson": [...],
    "color": "yellow",
    "isPinned": false,
    "visibility": "HOUSEHOLD",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "owner": {
      "id": "user_id",
      "name": "User Name",
      "email": "user@example.com"
    }
  }
]
```

### POST /api/notes
Creates a new note.

**Request Body:**
```json
{
  "title": "Note Title",
  "contentJson": [...],
  "color": "yellow",
  "visibility": "HOUSEHOLD"
}
```

### GET /api/notes/[id]
Returns a specific note by ID.

### PUT /api/notes/[id]
Updates a note.

**Request Body:**
```json
{
  "title": "Updated Title",
  "contentJson": [...],
  "color": "blue",
  "isPinned": true,
  "visibility": "PRIVATE"
}
```

### DELETE /api/notes/[id]
Deletes a note.

## Usage

### Notes List Page (`/notes`)

- View all notes in a masonry grid layout
- Search notes by title or content
- Filter by color
- Pin/unpin notes
- Quick capture new notes
- Responsive design for mobile and desktop

### Note Editor Page (`/notes/[id]`)

- Rich text editing with BlockNote
- Real-time collaboration with Liveblocks
- Auto-save functionality
- Color picker for note themes
- Visibility controls (Private/Household/Read-only)
- Pin/unpin functionality
- Presence indicators showing other users

## Offline Support

The module includes comprehensive offline support:

- **Offline Storage**: Notes are cached in localStorage when offline
- **Sync on Reconnect**: Changes sync automatically when back online
- **Service Worker**: Caches API responses and provides offline fallbacks
- **Background Sync**: Queues changes for sync when connection is restored

## Styling

The module uses your existing Tailwind design system with:

- Warm, cozy color palette
- Rounded corners (`rounded-3xl`)
- Soft shadows and gradients
- Smooth animations and transitions
- Mobile-responsive design

## Security

- **Authentication**: All API routes require valid NextAuth session
- **Authorization**: Users can only access notes from their active household
- **Visibility Controls**: Private notes are only accessible by the owner
- **Input Validation**: All inputs are validated and sanitized

## Performance

- **Debounced Auto-save**: Prevents excessive API calls
- **Optimistic Updates**: UI updates immediately for better UX
- **Lazy Loading**: Components load only when needed
- **Efficient Caching**: Smart caching strategies for offline support

## Troubleshooting

### Common Issues

1. **Liveblocks Connection Failed**
   - Check your LIVEBLOCKS_SECRET_KEY environment variable
   - Ensure the key is correct and has proper permissions

2. **Database Migration Failed**
   - Check database permissions
   - Run `npx prisma generate` first
   - Manually apply the Note model to your database if needed

3. **Offline Functionality Not Working**
   - Ensure service worker is registered
   - Check browser console for service worker errors
   - Verify localStorage is available

4. **Auto-save Not Working**
   - Check network connectivity
   - Verify API endpoints are accessible
   - Check browser console for errors

### Development Tips

- Use browser dev tools to inspect Liveblocks presence
- Check Network tab for API call timing
- Use Application tab to inspect localStorage and service worker
- Test offline functionality by disabling network in dev tools

## Contributing

When making changes to the notes module:

1. Test both online and offline functionality
2. Verify real-time collaboration works
3. Check mobile responsiveness
4. Ensure proper error handling
5. Update this README if adding new features

## License

This module is part of the Houseflow application and follows the same license terms.
