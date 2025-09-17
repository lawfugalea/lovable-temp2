# Notes V2 - Keep-Style Notes System

This document describes the new Keep-style notes system that replaces the existing notes functionality with Google Keep-inspired features including real-time collaboration, offline support, OCR, and push notifications.

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Environment variables configured

### 2. Install Dependencies
```bash
npm install
```

### 3. Generate VAPID Keys (for Push Notifications)
```bash
npx web-push generate-vapid-keys
```
Add the generated keys to your `.env` file:
```
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:admin@yourdomain.com
CRON_SECRET=your_random_secret_for_cron_jobs
```

### 4. Database Migration
```bash
# Run the migration script to transform existing notes
npm run notes:migrate

# Rollback if needed
npm run notes:rollback
```

### 5. Start Services
```bash
# Terminal 1: Start the main application
npm run dev

# Terminal 2: Start the Yjs WebSocket server for real-time collaboration
npm run yjs:server
```

## 📋 Features

### Core Features
- **Keep-Style UI**: Material Design 3 inspired interface with color-coded notes
- **Real-time Collaboration**: Multiple users can edit the same note simultaneously
- **Offline Support**: Full offline functionality with Dexie.js and IndexedDB
- **OCR Text Extraction**: Automatic text extraction from attached images using Tesseract.js
- **Smart Search**: Search across note content, titles, and OCR-extracted text
- **Labels & Filtering**: Organize notes with custom labels and advanced filtering
- **Pin & Archive**: Pin important notes and archive completed ones
- **Push Notifications**: Time-based reminders with web push notifications

### Technical Features
- **Progressive Web App (PWA)**: Installable with offline capabilities
- **Service Worker**: Background sync and caching
- **Web Push API**: Cross-platform push notifications
- **Yjs Integration**: Conflict-free replicated data types (CRDTs)
- **TipTap Editor**: Rich text editing with collaboration support

## 🔧 Configuration

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://..."

# VAPID Keys (for push notifications)
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:admin@yourdomain.com"

# Cron Job Security
CRON_SECRET="your_random_secret"

# Feature Flags
NOTES_V2_ENABLED=true
```

### Feature Flags
Control the rollout of Notes V2:
```typescript
// In src/lib/featureFlags.ts
export const NOTES_V2_ENABLED = process.env.NOTES_V2_ENABLED === 'true'
```

## 📱 iOS Push Notifications

iOS Safari has limited support for push notifications. For iOS users:

1. **Add to Home Screen**: Users must install the web app to their home screen
2. **Enable Notifications**: After installation, notifications can be enabled in Safari settings
3. **iOS 16.4+**: Full push notification support requires iOS 16.4 or later

### iOS Setup Instructions for Users
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Open the installed app
5. Grant notification permissions when prompted

## 🔄 Migration Process

### Data Migration
The migration script (`scripts/notes-migrate.ts`) handles:

1. **Backup**: Creates JSON backups of existing notes
2. **Transform**: Maps old schema to new Keep-style schema
3. **Verify**: Validates data integrity
4. **Cutover**: Switches to new system
5. **Rollback**: Restores from backup if needed

### Schema Changes
- **New Fields**: `type`, `body`, `checklist`, `pinned`, `archived`, `ocrText`, `ownerId`
- **New Models**: `Label`, `NoteLabel`, `Attachment`, `Share`, `Reminder`
- **Legacy Support**: Old fields preserved during migration period

## 🛠️ API Endpoints

### Notes API
- `GET /api/notes` - List notes with filtering and search
- `POST /api/notes` - Create new note
- `GET /api/notes/[id]` - Get specific note
- `PUT /api/notes/[id]` - Update note
- `DELETE /api/notes/[id]` - Delete note

### Labels API
- `GET /api/labels` - List all labels
- `POST /api/labels` - Create new label
- `PUT /api/labels/[id]` - Update label
- `DELETE /api/labels/[id]` - Delete label

### Reminders API
- `GET /api/reminders` - List reminders
- `POST /api/reminders` - Create reminder
- `PUT /api/reminders/[id]` - Update reminder
- `DELETE /api/reminders/[id]` - Delete reminder
- `POST /api/reminders/dispatch` - Process due reminders (cron job)

### Push Notifications API
- `POST /api/push/subscribe` - Subscribe to push notifications
- `POST /api/push/send` - Send push notification
- `POST /api/push/test` - Test push notifications

## 🔄 Real-time Collaboration

### Yjs Integration
- **WebSocket Server**: `scripts/y-websocket.ts` provides real-time sync
- **Client Library**: `src/lib/realtime.ts` handles Y.Doc connections
- **Awareness**: Shows who's currently editing each note
- **Persistence**: Automatic IndexedDB persistence for offline support

### Collaboration Features
- Live cursor positions
- Real-time text editing
- User presence indicators
- Conflict-free merging

## 📱 Offline Support

### Dexie.js Integration
- **Local Database**: `src/lib/dexie.ts` provides offline storage
- **Sync Queue**: Pending operations queued for when online
- **Optimistic UI**: Immediate feedback with background sync
- **Conflict Resolution**: Automatic merge on reconnection

## 🔍 OCR Text Extraction

### Tesseract.js Integration
- **Web Worker**: `src/lib/ocrWorker.ts` processes images
- **Automatic Extraction**: Text extracted from attached images
- **Search Integration**: OCR text included in search results
- **Background Processing**: Non-blocking image processing

## 🎨 UI Components

### Core Components
- `NotesGrid` - Grid layout for notes
- `NotesList` - List layout for notes  
- `NoteCard` - Individual note display
- `NoteEditor` - Rich text editor with collaboration
- `LabelsBar` - Label management
- `SearchBar` - Note search functionality
- `Filters` - Advanced filtering options

### Design System
- **Material Design 3**: Following Google's latest design guidelines
- **Color Palette**: 12 Keep-inspired note colors
- **Responsive Design**: Mobile-first approach
- **Accessibility**: WCAG 2.1 AA compliant

## 🚨 Rollback Procedure

If issues arise with Notes V2:

### 1. Immediate Rollback
```bash
# Disable Notes V2
export NOTES_V2_ENABLED=false

# Restart the application
npm run dev
```

### 2. Data Rollback
```bash
# Restore from backup
npm run notes:rollback
```

### 3. Full Rollback
1. Set `NOTES_V2_ENABLED=false`
2. Run `npm run notes:rollback`
3. Restart all services
4. Verify old notes system is working

## 🧪 Testing

### Manual Testing Checklist
- [ ] Migration moves 100% of old notes
- [ ] Two browsers can edit the same note simultaneously
- [ ] Presence bubbles are visible during collaboration
- [ ] Image attachment triggers OCR text extraction
- [ ] Search finds OCR-extracted text
- [ ] Offline create/edit works, syncs on reconnect
- [ ] PWA installs correctly
- [ ] Push notifications work on desktop/Android
- [ ] iOS shows "Add to Home Screen" CTA
- [ ] iOS push notifications work after home screen install

### Automated Testing
```bash
# Run the test suite
npm test

# Run specific test categories
npm run test:api
npm run test:components
npm run test:integration
```

## 📊 Monitoring

### Key Metrics
- Migration success rate
- Real-time collaboration uptime
- Push notification delivery rate
- Offline sync success rate
- OCR processing accuracy

### Logging
- Migration logs: `logs/notes-migration.log`
- Collaboration logs: `logs/yjs-server.log`
- Push notification logs: `logs/push-notifications.log`

## 🔐 Security

### Authentication
- NextAuth.js integration
- Session-based access control
- User-specific data isolation

### Authorization
- Note ownership verification
- Collaboration permission checks
- API endpoint protection

### Data Protection
- Encrypted push notification payloads
- Secure WebSocket connections
- Input validation and sanitization

## 🚀 Deployment

### Production Setup
1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Deploy application
5. Set up cron job for reminder dispatch
6. Configure push notification service

### Cron Job Setup
```bash
# Add to crontab for reminder dispatch (every 5 minutes)
*/5 * * * * curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/reminders/dispatch
```

## 📞 Support

For issues or questions:
1. Check the logs in the `logs/` directory
2. Verify environment variables are set correctly
3. Test individual components using the API endpoints
4. Check browser console for client-side errors

## 🔄 Updates

### Version History
- **v2.0.0**: Initial Keep-style implementation
- **v2.1.0**: Added OCR text extraction
- **v2.2.0**: Enhanced offline support
- **v2.3.0**: iOS push notification support

### Future Enhancements
- Voice notes with transcription
- Handwriting recognition
- Advanced reminder types
- Team collaboration features
- API rate limiting
- Advanced search filters