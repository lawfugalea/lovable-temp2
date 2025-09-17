# 🏠 HouseFlow - Complete Setup Documentation

> **Your Family's Cozy Home Hub** - A comprehensive family management application

## 📋 Table of Contents

1. [Quick Overview](#-quick-overview)
2. [What HouseFlow Does](#-what-houseflow-does)
3. [Technical Architecture](#-technical-architecture)
4. [Key Features](#-key-features)
5. [Project Structure](#-project-structure)
6. [Getting Started](#-getting-started)
7. [Environment Setup](#-environment-setup)
8. [Database Schema](#-database-schema)
9. [API Endpoints](#-api-endpoints)
10. [Deployment](#-deployment)
11. [SEO & Analytics](#-seo--analytics)
12. [Troubleshooting](#-troubleshooting)

---

## 🚀 Quick Overview

**HouseFlow** is a modern family management web application built with Next.js that helps families organize their daily lives through:

- 📝 **Collaborative Notes** - Real-time family note-taking
- 🛒 **Smart Shopping Lists** - With price tracking from external stores
- 💊 **Medicine Tracking** - Family health and medication management
- 💰 **Family Budgeting** - Shared financial planning
- 👪 **Household Management** - Invite and manage family members

**Live at:** `https://galeahub.online`

---

## 🎯 What HouseFlow Does

### For Families
- **Stay Organized**: Share notes, shopping lists, and important information
- **Health Management**: Track medications, fever journals, and health data
- **Smart Shopping**: Compare prices and manage household shopping
- **Budget Together**: Plan and track family finances
- **Real-time Collaboration**: Work together on shared tasks

### For Developers
- **Modern Stack**: Next.js 15, TypeScript, Tailwind CSS
- **Real-time Features**: WebSocket-based collaboration
- **Rich Text Editing**: TipTap editor with advanced features
- **PWA Ready**: Progressive Web App capabilities
- **SEO Optimized**: Complete search engine optimization

---

## 🏗️ Technical Architecture

### Frontend
- **Framework**: Next.js 15 (Pages Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom "cozy" theme
- **UI Components**: Custom components + Lucide React icons
- **Rich Text**: TipTap editor with collaboration features
- **State Management**: SWR for data fetching
- **Real-time**: WebSocket connections for live collaboration

### Backend
- **API**: Next.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with credentials provider
- **File Upload**: Formidable for image handling
- **Push Notifications**: Web Push API
- **Email**: Resend for transactional emails

### Infrastructure
- **Deployment**: Docker + CapRover
- **Database**: PostgreSQL (production)
- **CDN**: Static assets served from public folder
- **Monitoring**: Google Analytics 4 ready

---

## ✨ Key Features

### 📝 Notes System
- **Real-time Collaboration**: Multiple users can edit simultaneously
- **Rich Text Editing**: Bold, italic, lists, links, images
- **Color Themes**: Beautiful note colors and organization
- **OCR Text Extraction**: Search text from uploaded images
- **Labels & Categories**: Organize notes with tags
- **Pinning & Archiving**: Keep important notes accessible

### 🛒 Shopping Lists
- **Smart Price Tracking**: Integrates with Smart.com.mt for price comparison
- **Multiple Lists**: Create different lists for different stores
- **Real-time Updates**: Family members see changes instantly
- **Templates**: Save common shopping patterns
- **Categories**: Organize items by store sections

### 💊 Medicine Tracking
- **Child Profiles**: Track medications for each family member
- **Dosage Scheduling**: Set up medication reminders
- **Fever Journals**: Record temperature readings
- **Reaction Tracking**: Monitor side effects and allergies
- **Push Notifications**: Get reminded when it's time for medicine
- **Health Reports**: Generate PDF reports for doctors

### 💰 Family Budgeting
- **Income Tracking**: Record family income sources
- **Expense Categories**: Organize spending by category
- **Savings Goals**: Set and track financial targets
- **Visual Charts**: See spending patterns with graphs
- **Bill Reminders**: Never miss important payments

### 👪 Household Management
- **Member Invites**: Email-based invitation system
- **Role Management**: Owner and member permissions
- **Family Profiles**: Manage family member information
- **Activity Tracking**: See who did what and when

---

## 📁 Project Structure

```
houseflow/
├── 📄 Configuration Files
│   ├── package.json              # Dependencies and scripts
│   ├── next.config.js            # Next.js configuration
│   ├── tailwind.config.js        # Tailwind CSS theme
│   ├── tsconfig.json             # TypeScript configuration
│   └── Dockerfile                # Docker deployment
│
├── 🗄️ Database
│   └── prisma/
│       ├── schema.prisma         # Database schema
│       └── migrations/           # Database migration files
│
├── 🌐 Public Assets
│   └── public/
│       ├── logo.png              # App logo
│       ├── manifest.json         # PWA manifest
│       ├── robots.txt            # SEO robots file
│       └── smart-images/         # Scraped product images
│
├── 💻 Source Code
│   └── src/
│       ├── components/           # Reusable UI components
│       │   ├── ModernAppShell.tsx    # Main app layout
│       │   ├── ModernTiptapEditor.tsx # Rich text editor
│       │   ├── SEO.tsx               # SEO component
│       │   └── ui/                   # UI component library
│       │
│       ├── pages/                # Next.js pages and API routes
│       │   ├── index.tsx         # Homepage
│       │   ├── notes/            # Notes pages
│       │   ├── shopping.tsx      # Shopping page
│       │   ├── medicine.tsx      # Medicine tracking
│       │   ├── finances.tsx      # Budgeting
│       │   ├── privacy.tsx       # Privacy policy
│       │   ├── terms.tsx         # Terms of service
│       │   └── api/              # API endpoints
│       │
│       ├── lib/                  # Utility libraries
│       │   ├── prisma.ts         # Database client
│       │   ├── analytics.ts      # Google Analytics
│       │   └── useHouseholdId.ts # Custom hooks
│       │
│       └── styles/               # CSS and styling
│           ├── globals.css       # Global styles
│           └── notes.css         # Notes-specific styles
│
└── 🛠️ Scripts & Tools
    └── scripts/
        ├── scrape-smart.js       # Price scraping script
        ├── update-version.js     # Version management
        └── notes-migrate.ts      # Database migrations
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd houseflow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

4. **Set up the database**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

---

## ⚙️ Environment Setup

### Required Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/houseflow"
DIRECT_URL="postgresql://user:password@localhost:5432/houseflow"

# Authentication
NEXTAUTH_URL="https://galeahub.online"
NEXTAUTH_SECRET="your-secret-key"

# Email (Resend)
RESEND_API_KEY="re_your-api-key"

# Push Notifications
VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
VAPID_EMAIL="your-email@example.com"

# SEO & Analytics
NEXT_PUBLIC_SITE_URL="https://galeahub.online"
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
```

### Optional Environment Variables

```env
# Google Search Console
NEXT_PUBLIC_GSC_VERIFICATION="your-verification-code"

# Development
NODE_ENV="development"
```

---

## 🗄️ Database Schema

### Core Models

#### User
```prisma
model User {
  id                     String         @id @default(cuid())
  name                   String?
  email                  String         @unique
  password               String
  activeHouseholdId      String?
  createdAt              DateTime       @default(now())
  updatedAt              DateTime       @updatedAt
  
  // Relations
  ownedHouseholds        Household[]
  memberships            Membership[]
  notesCreated           Note[]
  pushSubscriptions      PushSubscription[]
}
```

#### Household
```prisma
model Household {
  id             String         @id @default(cuid())
  name           String
  ownerId        String?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  
  // Relations
  owner          User?
  members        Membership[]
  shoppingLists  ShoppingList[]
  children       Child[]
  notes          Note[]
}
```

#### Note
```prisma
model Note {
  id          String   @id @default(cuid())
  type        NoteType @default(TEXT)
  title       String
  body        String?
  color       String   @default("yellow")
  pinned      Boolean  @default(false)
  archived    Boolean  @default(false)
  ocrText     String?
  ownerId     String?
  householdId String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### Medicine & Health
```prisma
model Child {
  id          String   @id @default(cuid())
  householdId String
  name        String
  dateOfBirth DateTime
  notes       String?
  isActive    Boolean  @default(true)
}

model Medicine {
  id          String   @id @default(cuid())
  childId     String?
  name        String
  dosage      String
  frequency   String
  startDate   DateTime
  endDate     DateTime?
  isActive    Boolean  @default(true)
}

model FeverReading {
  id          String   @id @default(cuid())
  childId     String
  temperature Float
  unit        String   @default("C")
  method      String   @default("oral")
  takenAt     DateTime @default(now())
  notes       String?
}
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout
- `GET /api/auth/session` - Get current session

### Household Management
- `GET /api/household/active` - Get active household
- `POST /api/household/create` - Create new household
- `POST /api/household/leave` - Leave household
- `GET /api/household/members` - Get household members
- `POST /api/household/invites` - Send invitation

### Notes
- `GET /api/notes` - Get all notes
- `POST /api/notes` - Create new note
- `PUT /api/notes/[id]` - Update note
- `DELETE /api/notes/[id]` - Delete note
- `POST /api/notes/[id]/share` - Share note

### Shopping
- `GET /api/shopping/lists` - Get shopping lists
- `POST /api/shopping/lists` - Create shopping list
- `GET /api/shopping/items` - Get shopping items
- `POST /api/shopping/items` - Add shopping item
- `PUT /api/shopping/items/[id]` - Update item

### Medicine
- `GET /api/medicine/children` - Get children profiles
- `POST /api/medicine/children` - Create child profile
- `GET /api/medicine/medicines` - Get medicines
- `POST /api/medicine/medicines` - Add medicine
- `GET /api/medicine/doses` - Get dose records
- `POST /api/medicine/doses` - Record dose

### Push Notifications
- `POST /api/push/subscribe` - Subscribe to notifications
- `POST /api/push/send` - Send notification
- `GET /api/reminders` - Get medication reminders

---

## 🚀 Deployment

### Docker Deployment (CapRover)

1. **Build the Docker image**
   ```bash
   docker build -t houseflow .
   ```

2. **Deploy to CapRover**
   - Push to your Git repository
   - Connect CapRover to your repository
   - Set environment variables in CapRover dashboard
   - Deploy

### Environment Variables for Production

```env
# Database (Production)
DATABASE_URL="postgresql://user:password@db-host:5432/houseflow"
DIRECT_URL="postgresql://user:password@db-host:5432/houseflow"

# Authentication
NEXTAUTH_URL="https://galeahub.online"
NEXTAUTH_SECRET="production-secret-key"

# Email
RESEND_API_KEY="re_production-api-key"

# Push Notifications
VAPID_PUBLIC_KEY="production-vapid-public"
VAPID_PRIVATE_KEY="production-vapid-private"
VAPID_EMAIL="admin@galeahub.online"

# Analytics
NEXT_PUBLIC_SITE_URL="https://galeahub.online"
NEXT_PUBLIC_GA_ID="G-PRODUCTION-ID"
```

---

## 📊 SEO & Analytics

### SEO Features
- ✅ **Meta Tags**: Comprehensive SEO component
- ✅ **Sitemap**: Dynamic XML sitemap at `/sitemap.xml`
- ✅ **Robots.txt**: Search engine directives
- ✅ **Structured Data**: JSON-LD schema markup
- ✅ **Open Graph**: Social media sharing optimization
- ✅ **Canonical URLs**: Proper URL canonicalization

### Analytics Setup
- **Google Analytics 4**: Ready for tracking ID
- **Google Search Console**: Sitemap submitted
- **Performance Monitoring**: Core Web Vitals tracking
- **Event Tracking**: Custom user interaction events

### Legal Pages
- **Privacy Policy**: `/privacy` - GDPR compliant
- **Terms of Service**: `/terms` - Comprehensive user agreement

---

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connection
npx prisma db push

# Reset database
npx prisma migrate reset
```

#### Build Issues
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Authentication Issues
```bash
# Check NextAuth configuration
# Verify NEXTAUTH_SECRET is set
# Check database user table
```

#### Real-time Features Not Working
```bash
# Check WebSocket connections
# Verify server is running
# Check browser console for errors
```

### Development Commands

```bash
# Development
npm run dev                 # Start development server
npm run build              # Build for production
npm run start              # Start production server

# Database
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate:deploy # Deploy migrations

# Utilities
npm run scrape:smart       # Scrape price data
npm run notes:migrate      # Migrate notes data
npm run update-version     # Update version number
```

### Performance Optimization

- **Image Optimization**: Next.js Image component
- **Code Splitting**: Automatic with Next.js
- **Caching**: SWR for data fetching
- **Compression**: Gzip enabled in production
- **CDN**: Static assets served efficiently

---

## 📞 Support & Contact

- **Website**: https://galeahub.online
- **Email**: support@galeahub.online
- **Documentation**: This file
- **Issues**: GitHub Issues (if using GitHub)

---

## 🎉 Conclusion

HouseFlow is a comprehensive family management application built with modern web technologies. It provides real-time collaboration, smart features, and a beautiful user interface to help families stay organized and connected.

The application is production-ready with proper SEO, analytics, legal compliance, and deployment configurations. The codebase is well-structured, documented, and follows modern development best practices.

**Happy coding! 🚀**
