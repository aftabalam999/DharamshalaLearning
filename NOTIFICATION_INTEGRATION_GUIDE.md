# Integration Guide: Adding Notification Components to Dashboard

This guide shows how to integrate the new notification components into your existing dashboard.

---

## 1. Add Notification Settings to User Settings/Profile

### For Students and Mentors

**File to modify**: `src/components/Settings/SettingsPage.tsx` (or wherever your settings page is)

```typescript
import NotificationSettings from '../Settings/NotificationSettings';

// Inside your settings page component, add a new tab or section:

<div className="space-y-6">
  {/* Existing settings sections */}
  
  {/* Add Notification Settings */}
  <NotificationSettings />
</div>
```

---

## 2. Add Review Reminder Panel to Admin Dashboard

**File to modify**: `src/components/Admin/AdminDashboard.tsx`

```typescript
import ReviewReminderPanel from './ReviewReminderPanel';

// Inside your admin dashboard, add a new section:

<div className="space-y-6">
  {/* Existing admin sections */}
  
  {/* Add Review Reminder Panel */}
  <ReviewReminderPanel />
</div>
```

---

## 3. Add User Notification Settings to Admin User Management

**File to modify**: `src/components/Admin/UserManagement.tsx` (or wherever you manage users)

### Option A: As a Separate Tab

```typescript
import UserNotificationSettings from './UserNotificationSettings';

// Add a new tab in your user management interface:

<Tabs>
  <Tab label="Users">
    {/* Existing user list */}
  </Tab>
  <Tab label="Notification Settings">
    <UserNotificationSettings />
  </Tab>
</Tabs>
```

### Option B: As a Separate Page

Add a new route in your admin routing:

```typescript
import UserNotificationSettings from '../components/Admin/UserNotificationSettings';

// In your routing file:
<Route path="/admin/user-notifications" element={<UserNotificationSettings />} />
```

---

## 4. Add Navigation Links

### Admin Navigation Menu

Add links to your admin sidebar/navigation:

```typescript
<nav>
  {/* Existing links */}
  
  <Link to="/admin/review-reminders">
    <Bell className="h-5 w-5 mr-2" />
    Review Reminders
  </Link>
  
  <Link to="/admin/user-notifications">
    <Users className="h-5 w-5 mr-2" />
    User Notifications
  </Link>
</nav>
```

### User Settings Navigation

Add link to user settings menu:

```typescript
<nav>
  {/* Existing links */}
  
  <Link to="/settings/notifications">
    <Bell className="h-5 w-5 mr-2" />
    Notification Preferences
  </Link>
</nav>
```

---

## 5. Quick Integration Example

If you want to see it working immediately, here's a minimal setup:

### Create a Test Admin Page

**File**: `src/pages/AdminNotificationsPage.tsx`

```typescript
import React from 'react';
import ReviewReminderPanel from '../components/Admin/ReviewReminderPanel';
import UserNotificationSettings from '../components/Admin/UserNotificationSettings';

const AdminNotificationsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Notification Management
      </h1>
      
      {/* Review Reminder Triggers */}
      <ReviewReminderPanel />
      
      {/* User Notification Settings */}
      <UserNotificationSettings />
    </div>
  );
};

export default AdminNotificationsPage;
```

### Add Route

```typescript
import AdminNotificationsPage from './pages/AdminNotificationsPage';

<Route path="/admin/notifications" element={<AdminNotificationsPage />} />
```

---

## 6. Setup Checklist

Before testing, make sure:

- [ ] `.env` file has `REACT_APP_DISCORD_WEBHOOK_URL` set
- [ ] Discord webhook created in server settings
- [ ] Users have Discord User IDs set (or test with your own)
- [ ] Restart development server after adding .env variable
- [ ] Navigate to the new admin page
- [ ] Try triggering a test reminder

---

## 7. Testing Flow

1. **Setup Discord**:
   - Create webhook in Discord server
   - Copy URL to `.env` file
   - Restart `npm start`

2. **Add Your Discord ID**:
   - Enable Developer Mode in Discord
   - Copy your Discord User ID
   - Go to Settings → Notification Settings
   - Paste Discord ID
   - Enable Discord notifications
   - Save

3. **Test Manual Reminder**:
   - Go to Admin Dashboard → Review Reminder Panel
   - Click "Send Pre-Reminder"
   - Check Discord for message with your @mention

4. **Verify In-App Notification**:
   - Check notifications in dashboard
   - Should see in-app notification created

---

## 8. File Structure After Integration

```
src/
├── components/
│   ├── Admin/
│   │   ├── AdminDashboard.tsx (modified - add ReviewReminderPanel)
│   │   ├── ReviewReminderPanel.tsx (new)
│   │   ├── UserNotificationSettings.tsx (new)
│   │   └── ...
│   ├── Settings/
│   │   ├── SettingsPage.tsx (modified - add NotificationSettings)
│   │   ├── NotificationSettings.tsx (new)
│   │   └── ...
│   └── ...
├── services/
│   ├── reviewReminderService.ts (new)
│   └── ...
├── types/
│   └── index.ts (modified - add discord_user_id, notification_preferences)
└── ...
```

---

## 9. Environment Variables

Ensure your `.env` file has:

```bash
# Existing Firebase config...

# Discord Integration
REACT_APP_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN
```

**Important**: 
- Never commit `.env` file to git
- Only commit `.env.example` 
- Share webhook URL securely with team members

---

## 10. Next Steps After Integration

1. **Test Manually**:
   - Trigger reminders from Admin Panel
   - Verify Discord messages appear
   - Check user tagging works

2. **Set Up Scheduled Jobs**:
   - See `DISCORD_NOTIFICATION_SETUP.md` for Firebase Functions setup
   - Configure cron jobs for automated reminders

3. **User Onboarding**:
   - Announce new feature to users
   - Share Discord ID setup instructions
   - Encourage users to enable notifications

4. **Monitor**:
   - Check Firestore `review_reminders` collection
   - Monitor Firebase Functions logs (once deployed)
   - Track user adoption rate

---

## Need Help?

- **Setup Issues**: See `DISCORD_NOTIFICATION_SETUP.md`
- **Troubleshooting**: Check troubleshooting section in setup guide
- **Feature Details**: See `TASK_20_COMPLETE.md`

---

**Quick Start**: Add `ReviewReminderPanel` to your admin dashboard, set up Discord webhook in `.env`, and test!
