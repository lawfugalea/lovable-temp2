# Medicine Notifications Setup Guide

This guide explains how to set up medicine notifications for the Houseflow application.

## Overview

The medicine notification system is now simplified and supports:
- ✅ Push notifications (15 minutes before due time)
- ✅ Browser notifications (fallback when VAPID not configured)
- ✅ PWA notifications (when installed as PWA)
- ✅ Anti-spam cooldown system (1-hour cooldown)
- ✅ Background sync for offline notifications

## Issues Fixed

### 1. PWA-Only Notifications
**Problem**: Notifications only worked when the app was installed as a PWA.

**Solution**: 
- Service worker now registers in both development and production
- Added fallback browser notifications when service worker isn't available
- Notifications work in regular browser tabs now

### 2. Continuous Reminder Spam
**Problem**: Notifications kept appearing every minute, annoying users.

**Solution**:
- Implemented smart cooldown system (1-hour cooldown between same notifications)
- Removed in-app notification cards (redundant with push notifications)
- Only shows notifications 15 minutes before due time
- Reduced API polling frequency from 1 minute to 2 minutes
- Single notification type simplifies the system

## Setup Instructions

### Option 1: Basic Notifications (No VAPID Keys Required)

This setup provides basic browser notifications:

1. **No additional setup required** - notifications will work immediately
2. Browser notifications will work when permission is granted
3. Notifications show 15 minutes before medicine is due
4. Notifications won't work when the browser tab is closed

### Option 2: Full Push Notifications (VAPID Keys Required)

This setup provides full push notifications that work even when the app is closed:

1. **Generate VAPID Keys**:
   ```bash
   npm run generate-vapid
   ```

2. **Add Environment Variables**:
   
   **For Development (.env.local)**:
   ```
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
   VAPID_PRIVATE_KEY=your_private_key_here
   VAPID_SUBJECT=mailto:admin@houseflow.app
   ```

   **For Production (Vercel/CapRover/Docker)**:
   Add the same environment variables to your deployment platform.

3. **Restart the Application**:
   - Development: Restart your dev server
   - Production: Redeploy your application

## Notification Types

### 1. Browser Notifications
- Native browser notifications
- Work when the app tab is open
- Auto-close after 10 seconds
- Click to focus the app window
- Show 15 minutes before medicine is due

### 2. Push Notifications (with VAPID)
- Work even when the app is closed
- Background sync for offline reminders
- Rich notifications with actions
- Persistent until dismissed
- Show 15 minutes before medicine is due
- 1-hour cooldown between same notifications

## Troubleshooting

### Notifications Not Working

1. **Check Browser Support**:
   - Open browser console and look for notification support messages
   - Modern browsers support notifications (Chrome, Firefox, Safari, Edge)

2. **Check Permissions**:
   - Ensure notification permission is granted
   - Look for permission request prompts

3. **Check Service Worker**:
   - Open DevTools > Application > Service Workers
   - Ensure service worker is registered and active

4. **Check VAPID Configuration** (if using push notifications):
   - Verify environment variables are set correctly
   - Check that VAPID keys are valid
   - Look for VAPID-related error messages in console

### Common Issues

**Issue**: "VAPID keys not configured"
**Solution**: Either generate VAPID keys or use basic notifications (they'll still work)

**Issue**: "Notification permission denied"
**Solution**: User needs to manually grant permission in browser settings

**Issue**: "Service worker not registered"
**Solution**: Check if the app is being served over HTTPS (required for service workers)

**Issue**: "Notifications too frequent"
**Solution**: Use the settings panel to change to "Quiet" mode

## Development vs Production

### Development
- Service worker registers automatically
- Basic notifications work immediately
- VAPID keys optional (fallback works)

### Production
- Service worker registers automatically
- HTTPS required for service workers
- VAPID keys recommended for full functionality
- Environment variables must be configured

## Security Notes

- VAPID public key can be safely exposed in client-side code
- VAPID private key must be kept secret and never committed to version control
- Notifications respect user privacy and permission settings
- All notification data is processed client-side

## Testing

To test notifications:

1. **In Development**:
   ```bash
   npm run dev
   ```
   - Navigate to medicine page
   - Add a medicine with a recent due time
   - Check browser console for notification messages

2. **In Production**:
   - Deploy with environment variables configured
   - Test with real medicine schedules
   - Verify notifications work when tab is closed (if VAPID configured)

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify environment variables are correctly set
3. Test in different browsers
4. Check network connectivity for API calls
5. Verify service worker registration in DevTools
