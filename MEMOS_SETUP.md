# Memos Integration Setup Guide

This guide will help you set up Memos as your notes page in HouseFlow.

## Quick Start

### 1. Environment Variables

Add this to your `.env.local` file:

```env
# Memos URL - Update this to match your deployment
NEXT_PUBLIC_MEMOS_URL=http://localhost:5230

# For production deployment, use your domain:
# NEXT_PUBLIC_MEMOS_URL=https://memos.yourdomain.com
```

### 2. Deploy Memos with Docker

Run this command in your project root:

```bash
# Start Memos
docker-compose -f docker-compose.memos.yml up -d

# Check if it's running
docker ps | grep memos
```

### 3. Access Your Notes

1. Start your HouseFlow application: `npm run dev`
2. Navigate to `http://localhost:3000/notes`
3. You'll see the Memos interface embedded in HouseFlow

## Production Deployment

### Option A: Same Server as HouseFlow

If deploying on the same server as HouseFlow:

1. Update `NEXT_PUBLIC_MEMOS_URL` to your domain:
   ```env
   NEXT_PUBLIC_MEMOS_URL=https://yourdomain.com:5230
   ```

2. Configure reverse proxy (nginx example):
   ```nginx
   location /memos/ {
       proxy_pass http://localhost:5230/;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
   }
   ```

### Option B: Separate Server

If deploying Memos on a separate server:

1. Deploy Memos on your server
2. Update the environment variable:
   ```env
   NEXT_PUBLIC_MEMOS_URL=https://memos.yourdomain.com
   ```

## Features

Your integrated notes page includes:

- ✅ **HouseFlow Branding** - Consistent navigation and styling
- ✅ **Family Collaboration** - Multiple users can access the same notes
- ✅ **Rich Text Editing** - Markdown support, formatting, etc.
- ✅ **Organization** - Tags, categories, search
- ✅ **Privacy** - Your notes stay on your server
- ✅ **Mobile Friendly** - Responsive design

## Troubleshooting

### Memos Not Loading

1. Check if Memos is running:
   ```bash
   docker ps | grep memos
   ```

2. Test direct access:
   ```bash
   curl http://localhost:5230/api/status
   ```

3. Check logs:
   ```bash
   docker logs houseflow-memos
   ```

### CORS Issues

If you encounter CORS issues, you may need to configure Memos to allow iframe embedding. This is usually handled automatically, but if needed, you can modify the Memos configuration.

### Data Persistence

Your notes are stored in the `./memos-data` directory. Make sure to backup this directory regularly.

## Customization

### Styling

The notes page uses HouseFlow's cozy theme. You can customize the styling by modifying `src/pages/notes.tsx`.

### Features

Memos comes with many features out of the box:
- Rich text editing
- Tags and categories
- Search functionality
- Archive and pin notes
- Export/import
- API access

## Security

- Memos runs in a sandboxed iframe
- Data is stored locally on your server
- No external dependencies for note storage
- Full control over your data

## Next Steps

1. Set up the environment variable
2. Deploy Memos with Docker
3. Test the integration
4. Customize as needed
5. Set up regular backups of your notes data

Enjoy your new integrated notes system! 📝

