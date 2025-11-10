# Discord Notification Setup Guide

This guide walks you through setting up Discord notifications for the Campus Learning Dashboard review reminder system.

## Table of Contents
1. [Overview](#overview)
2. [Discord Webhook Setup](#discord-webhook-setup)
3. [Environment Configuration](#environment-configuration)
4. [User Discord ID Setup](#user-discord-id-setup)
5. [Admin Configuration](#admin-configuration)
6. [Scheduled Jobs Setup](#scheduled-jobs-setup)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The notification system sends review reminders through multiple channels:
- **In-App**: Dashboard notifications (default, always enabled)
- **Discord**: Server notifications with user tagging (requires setup)
- **Email**: Coming soon

### Reminder Schedule
- **Sunday 8:00 PM**: Pre-reminder (reviews due tomorrow)
- **Monday 9:00 AM**: Morning reminder (reviews due today)
- **Monday 6:00 PM**: Evening reminder (3 hours left)
- **Tuesday+**: Daily overdue escalation reminders

**Anti-Spam Protection**: Maximum 1 reminder per user per day per type.

---

## Discord Webhook Setup

### Step 1: Create a Discord Server Webhook

1. **Open Discord Server Settings**
   - Right-click on your server name
   - Select "Server Settings"

2. **Navigate to Integrations**
   - Click "Integrations" in the left sidebar
   - Click "Webhooks" or "Create Webhook"

3. **Create New Webhook**
   - Click "New Webhook"
   - Name it something like "Review Reminders Bot"
   - Select the channel where reminders should be posted (e.g., #reminders)
   - Click "Copy Webhook URL"

4. **Save the Webhook URL**
   - The URL format will be:
   ```
   https://discord.com/api/webhooks/{webhook_id}/{webhook_token}
   ```
   - Keep this URL secure (treat it like a password)

### Step 2: Configure Webhook in Application

Add the webhook URL to your `.env` file:

```bash
REACT_APP_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

**Important**: Never commit the actual `.env` file to version control!

---

## Environment Configuration

### Create `.env` File

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Discord webhook URL:
   ```bash
   # Discord Webhook URL for review reminders
   REACT_APP_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1234567890123456789/abcdefghijklmnopqrstuvwxyz1234567890
   ```

3. Restart your development server:
   ```bash
   npm start
   ```

---

## User Discord ID Setup

Users need to add their Discord User ID to receive notifications with @mentions.

### How Users Can Find Their Discord ID

1. **Enable Developer Mode in Discord**
   - Open Discord → Settings → Advanced
   - Toggle on "Developer Mode"

2. **Copy User ID**
   - Go back to Discord
   - Right-click on your profile picture (anywhere in Discord)
   - Select "Copy ID"
   - This copies your Discord User ID (18-digit number)

### Add Discord ID to Profile

**For Students/Mentors:**
1. Log in to Campus Learning Dashboard
2. Go to Settings (or Profile section)
3. Find "Notification Settings"
4. Paste your Discord User ID in the "Discord User ID" field
5. Enable "Discord Notifications" checkbox
6. Click "Save Settings"

**For Admins (managing all users):**
1. Log in as admin
2. Go to Admin Dashboard
3. Click "User Notification Settings"
4. Search for the user
5. Click "Edit" next to their name
6. Enter their Discord User ID
7. Click "Save"

---

## Admin Configuration

### Accessing Admin Features

1. **Review Reminder Panel**
   - Location: Admin Dashboard → Review Reminder Panel
   - Features:
     - Manual reminder triggering for all 4 reminder types
     - Real-time status display (sent/failed counts)
     - Discord setup instructions

2. **User Notification Settings**
   - Location: Admin Dashboard → User Notification Settings
   - Features:
     - View all users' Discord IDs
     - Edit Discord IDs for any user
     - View notification preferences
     - Search users by name, email, or Discord ID

### Manual Reminder Testing

1. Navigate to Admin Dashboard → Review Reminder Panel
2. Click one of the reminder buttons:
   - "Send Pre-Reminder" (Sunday reminder)
   - "Send Morning Reminder" (Monday 9am)
   - "Send Evening Reminder" (Monday 6pm)
   - "Send Overdue Reminder" (Tuesday+)
3. Wait for results to appear
4. Check Discord channel for messages

---

## Scheduled Jobs Setup

To automate the reminder schedule, you need to set up scheduled jobs (cron).

### Option 1: Firebase Cloud Functions (Recommended)

**Install Firebase Functions:**
```bash
npm install -g firebase-tools
firebase init functions
```

**Create Scheduled Functions** (`functions/src/index.ts`):
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Sunday 8:00 PM reminder
export const sundayReminder = functions.pubsub
  .schedule('0 20 * * 0')  // Every Sunday at 8pm
  .timeZone('America/Los_Angeles')  // Adjust to your timezone
  .onRun(async (context) => {
    // Call your ReviewReminderService.sendSundayReminder()
    console.log('Running Sunday reminder...');
  });

// Monday 9:00 AM reminder
export const mondayMorningReminder = functions.pubsub
  .schedule('0 9 * * 1')  // Every Monday at 9am
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    // Call your ReviewReminderService.sendMondayMorningReminder()
    console.log('Running Monday morning reminder...');
  });

// Monday 6:00 PM reminder
export const mondayEveningReminder = functions.pubsub
  .schedule('0 18 * * 1')  // Every Monday at 6pm
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    // Call your ReviewReminderService.sendMondayEveningReminder()
    console.log('Running Monday evening reminder...');
  });

// Overdue reminder (runs daily Tuesday-Sunday)
export const overdueReminder = functions.pubsub
  .schedule('0 10 * * 2-0')  // Daily at 10am, Tuesday-Sunday
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    // Call your ReviewReminderService.sendOverdueReminder()
    console.log('Running overdue reminder...');
  });
```

**Deploy Functions:**
```bash
firebase deploy --only functions
```

### Option 2: External Cron Service (Alternative)

Use services like:
- **Vercel Cron** (if deploying on Vercel)
- **Netlify Functions** (if deploying on Netlify)
- **AWS CloudWatch Events** (if using AWS)
- **Heroku Scheduler** (if using Heroku)
- **cron-job.org** (free external service)

Create API endpoints that trigger the reminder methods, then schedule HTTP requests.

### Option 3: Local Cron (Development Only)

**Using node-cron:**
```bash
npm install node-cron
```

**Create cron script** (`scripts/reminderCron.ts`):
```typescript
import cron from 'node-cron';
import { ReviewReminderService } from '../src/services/reviewReminderService';

const reminderService = new ReviewReminderService();

// Sunday 8:00 PM
cron.schedule('0 20 * * 0', () => {
  reminderService.sendSundayReminder();
});

// Monday 9:00 AM
cron.schedule('0 9 * * 1', () => {
  reminderService.sendMondayMorningReminder();
});

// Monday 6:00 PM
cron.schedule('0 18 * * 1', () => {
  reminderService.sendMondayEveningReminder();
});

// Overdue (daily at 10am, Tuesday-Sunday)
cron.schedule('0 10 * * 2-0', () => {
  reminderService.sendOverdueReminder();
});

console.log('Reminder cron jobs started...');
```

---

## Testing

### Test Discord Webhook

1. **Quick Test with curl:**
   ```bash
   curl -X POST "YOUR_WEBHOOK_URL" \
     -H "Content-Type: application/json" \
     -d '{
       "content": "Test message from Campus Learning Dashboard"
     }'
   ```

2. **Test from Admin Panel:**
   - Go to Admin Dashboard → Review Reminder Panel
   - Click "Send Pre-Reminder" button
   - Check Discord channel for the message

### Test User Tagging

1. Add your Discord User ID to your profile
2. Enable Discord notifications in your preferences
3. Have an admin trigger a manual reminder
4. Check Discord for a message with your @mention

### Verify Anti-Spam Protection

1. Send a reminder manually
2. Try sending the same type again immediately
3. User should not receive duplicate reminder

---

## Troubleshooting

### Discord Messages Not Appearing

**Problem**: Reminders not showing in Discord

**Solutions**:
1. Verify webhook URL is correct in `.env` file
2. Check webhook is still active in Discord Server Settings
3. Ensure webhook channel still exists
4. Restart application after changing `.env`
5. Check browser console for error messages

### User Not Getting Tagged

**Problem**: Message appears but user is not mentioned

**Solutions**:
1. Verify user's Discord ID is correct (18-digit number)
2. Ensure user has Discord notifications enabled in preferences
3. Check user is a member of the Discord server
4. Verify user's Discord User ID (not username)

### No Reminders Being Sent

**Problem**: No users receiving reminders

**Solutions**:
1. Check scheduled jobs are running (Firebase Functions logs)
2. Verify users have pending reviews in the system
3. Check `review_reminders` collection in Firestore for records
4. Test manually from Admin Panel first
5. Verify user notification preferences are set correctly

### Duplicate Reminders

**Problem**: Users receiving multiple reminders

**Solutions**:
1. Check `wasRemindedToday()` function is working
2. Verify only one scheduled job instance is running
3. Check Firestore indexes for `review_reminders` collection
4. Look for multiple deployments running simultaneously

### Rate Limiting

**Problem**: Discord webhook rate limited (429 errors)

**Solutions**:
1. Discord allows 30 requests per 60 seconds per webhook
2. Implement exponential backoff in code
3. Batch messages or space them out
4. Consider multiple webhooks for high traffic

---

## Best Practices

### Security
- ✅ Keep webhook URL in `.env` file only (never commit)
- ✅ Use environment variables for all secrets
- ✅ Regenerate webhook if accidentally exposed
- ✅ Limit admin access to webhook configuration

### User Experience
- ✅ Let users opt-in to Discord notifications
- ✅ Respect user preferences (don't spam)
- ✅ Provide clear instructions for setup
- ✅ Test thoroughly before enabling automation

### Monitoring
- ✅ Log all reminder attempts (success/failure)
- ✅ Track delivery rates
- ✅ Monitor Firebase Functions logs
- ✅ Set up alerts for recurring failures

### Maintenance
- ✅ Regularly check webhook is still active
- ✅ Update Discord IDs when users change accounts
- ✅ Clean up old reminder records periodically
- ✅ Review notification preferences quarterly

---

## Additional Resources

- [Discord Webhooks Documentation](https://discord.com/developers/docs/resources/webhook)
- [Firebase Cloud Functions Docs](https://firebase.google.com/docs/functions)
- [Cron Expression Generator](https://crontab.guru/)
- [Discord Developer Portal](https://discord.com/developers/applications)

---

## Support

If you encounter issues:
1. Check this guide's Troubleshooting section
2. Review browser console for errors
3. Check Firebase Functions logs
4. Verify Discord server settings
5. Test with manual triggers from Admin Panel

For additional help, contact your system administrator.
