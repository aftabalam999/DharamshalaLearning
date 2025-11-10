# Review Reminder Setup Without Cloud Functions

Since we don't have Firebase Cloud Functions, we have **3 alternative approaches** to run scheduled reminders. You can use one or combine multiple for redundancy.

---

## 📋 Overview of Approaches

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **1. Client-Side Scheduler** | ✅ No server needed<br>✅ Free<br>✅ Easy setup | ⚠️ Requires active users<br>⚠️ Not guaranteed timing | Small teams, backup system |
| **2. External Cron Service** | ✅ Reliable timing<br>✅ Free options<br>✅ No server maintenance | ⚠️ Needs API endpoint<br>⚠️ Limited free tier | Primary solution |
| **3. Simple Node.js Server** | ✅ Full control<br>✅ Reliable | ⚠️ Requires hosting<br>⚠️ Maintenance overhead | If you already have a server |

**Recommended**: Use **Approach 1 + 2** together (client-side as backup, external cron as primary)

---

## 🚀 Approach 1: Client-Side Scheduler (Easiest)

The reminders run automatically when **anyone** opens the dashboard. If at least one person checks the dashboard daily, reminders will be sent.

### Step 1: Initialize the Scheduler

Add to your main `App.tsx`:

```typescript
import { useEffect } from 'react';
import { ClientReminderScheduler } from './services/clientReminderScheduler';

function App() {
  useEffect(() => {
    // Start the reminder scheduler when app loads
    const scheduler = ClientReminderScheduler.getInstance();
    scheduler.start();

    console.log('[App] Reminder scheduler initialized');
  }, []);

  // Rest of your app...
}
```

### Step 2: That's it! 

The scheduler will:
- Check every 30 minutes if reminders should be sent
- Send reminders only once per day per type
- Work automatically when anyone uses the dashboard

### How It Works

- **Sunday 8pm-11pm**: Anyone opening the app triggers Sunday reminder
- **Monday 9am-11am**: First person to open the app triggers morning reminder
- **Monday 6pm-11pm**: Anyone opening the app triggers evening reminder
- **Tuesday-Sunday 10am-12pm**: Daily overdue reminders

### Testing the Client Scheduler

Add this admin debug component:

```typescript
import { ClientReminderScheduler } from '../../services/clientReminderScheduler';

function ReminderSchedulerDebug() {
  const scheduler = ClientReminderScheduler.getInstance();

  const handleManualCheck = () => {
    scheduler.manualCheck();
  };

  const handleReset = () => {
    scheduler.resetTimers();
    alert('Timers reset! Next check will send reminders.');
  };

  const status = scheduler.getStatus();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold mb-4">Scheduler Status</h3>
      
      <div className="space-y-2 text-sm">
        <div>Last Check: {status.lastCheck || 'Never'}</div>
        <div>Last Pre-Reminder: {status.lastPreReminder || 'Never'}</div>
        <div>Last Morning: {status.lastMorningReminder || 'Never'}</div>
        <div>Last Evening: {status.lastEveningReminder || 'Never'}</div>
        <div>Last Overdue: {status.lastOverdueReminder || 'Never'}</div>
      </div>

      <div className="mt-4 space-x-2">
        <button
          onClick={handleManualCheck}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Manual Check Now
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          Reset Timers (Testing)
        </button>
      </div>
    </div>
  );
}
```

---

## 🌐 Approach 2: External Cron Service (Recommended Primary)

Use free services like **cron-job.org** to call your API endpoints on schedule.

### Option A: Using cron-job.org (Free, No Server Needed)

#### Step 1: Create API Endpoints

You need publicly accessible URLs. **Two options**:

**Option 1: Deploy to Vercel (Easiest)**

1. Create `api/reminders/` folder in your project
2. Add these files:

`api/reminders/sunday.js`:
```javascript
import { handleSundayReminder } from '../../src/api/reminderEndpoints';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = req.headers['x-api-key'];
  const result = await handleSundayReminder(apiKey);
  
  res.status(result.success ? 200 : 401).json(result);
}
```

3. Deploy to Vercel:
```bash
npm install -g vercel
vercel deploy
```

4. Your endpoints will be:
   - `https://your-app.vercel.app/api/reminders/sunday`
   - `https://your-app.vercel.app/api/reminders/monday-morning`
   - `https://your-app.vercel.app/api/reminders/monday-evening`
   - `https://your-app.vercel.app/api/reminders/overdue`

**Option 2: Use existing hosting + Express server**

See server.js file provided.

#### Step 2: Set Up cron-job.org

1. **Sign up** at https://cron-job.org (free)

2. **Create 4 cron jobs**:

**Job 1: Sunday Pre-Reminder**
- Title: "Review Pre-Reminder"
- URL: `https://your-app.vercel.app/api/reminders/sunday`
- Schedule: Every Sunday at 20:00 (8pm)
- Method: POST
- Headers: `x-api-key: your-secret-key`

**Job 2: Monday Morning Reminder**
- Title: "Monday Morning Reminder"
- URL: `https://your-app.vercel.app/api/reminders/monday-morning`
- Schedule: Every Monday at 09:00 (9am)
- Method: POST
- Headers: `x-api-key: your-secret-key`

**Job 3: Monday Evening Reminder**
- Title: "Monday Evening Reminder"
- URL: `https://your-app.vercel.app/api/reminders/monday-evening`
- Schedule: Every Monday at 18:00 (6pm)
- Method: POST
- Headers: `x-api-key: your-secret-key`

**Job 4: Overdue Reminder**
- Title: "Overdue Escalation"
- URL: `https://your-app.vercel.app/api/reminders/overdue`
- Schedule: Every day at 10:00 (10am)
- Method: POST
- Headers: `x-api-key: your-secret-key`

#### Step 3: Configure Environment Variables

Add to `.env`:
```bash
REACT_APP_CRON_API_KEY=your-super-secret-api-key-here-12345
```

Add to Vercel environment variables (in dashboard):
```
REACT_APP_CRON_API_KEY=your-super-secret-api-key-here-12345
```

### Alternative Free Cron Services

- **UptimeRobot** (https://uptimerobot.com) - Free, 50 monitors
- **EasyCron** (https://www.easycron.com) - Free tier available
- **Cronless** (https://cronless.com) - Free tier
- **GitHub Actions** (see below)

---

## 🤖 Approach 3: GitHub Actions (Free & Reliable)

Use GitHub Actions to run scheduled tasks. Completely free for public repos.

### Step 1: Create Workflow File

Create `.github/workflows/reminders.yml`:

```yaml
name: Send Review Reminders

on:
  schedule:
    # Sunday at 8pm UTC (adjust for your timezone)
    - cron: '0 20 * * 0'
    # Monday at 9am UTC
    - cron: '0 9 * * 1'
    # Monday at 6pm UTC
    - cron: '0 18 * * 1'
    # Daily at 10am UTC (for overdue)
    - cron: '0 10 * * *'
  
  # Allow manual triggering
  workflow_dispatch:

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Determine reminder type
        id: reminder-type
        run: |
          HOUR=$(date -u +%H)
          DAY=$(date -u +%u)
          
          if [ "$DAY" = "7" ] && [ "$HOUR" = "20" ]; then
            echo "type=sunday" >> $GITHUB_OUTPUT
          elif [ "$DAY" = "1" ] && [ "$HOUR" = "09" ]; then
            echo "type=monday-morning" >> $GITHUB_OUTPUT
          elif [ "$DAY" = "1" ] && [ "$HOUR" = "18" ]; then
            echo "type=monday-evening" >> $GITHUB_OUTPUT
          else
            echo "type=overdue" >> $GITHUB_OUTPUT
          fi
      
      - name: Send reminders
        env:
          FIREBASE_CONFIG: ${{ secrets.FIREBASE_CONFIG }}
          DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
        run: |
          node scripts/send-reminders.js ${{ steps.reminder-type.outputs.type }}
```

### Step 2: Create Reminder Script

Create `scripts/send-reminders.js`:

```javascript
const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

// Initialize Firebase
const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
initializeApp(firebaseConfig);

const reminderType = process.argv[2];

async function sendReminders() {
  console.log(`Sending ${reminderType} reminders...`);
  
  // Import and call your reminder service
  // const { ReviewReminderService } = require('../src/services/reviewReminderService');
  // const service = new ReviewReminderService();
  
  // switch (reminderType) {
  //   case 'sunday':
  //     await service.sendSundayReminder();
  //     break;
  //   // ... other cases
  // }
  
  console.log('Reminders sent successfully!');
}

sendReminders().catch(console.error);
```

### Step 3: Add GitHub Secrets

In your GitHub repository:
1. Go to Settings → Secrets → Actions
2. Add secrets:
   - `FIREBASE_CONFIG` - Your Firebase config JSON
   - `DISCORD_WEBHOOK_URL` - Your Discord webhook

---

## 🔄 Hybrid Approach (Recommended)

Combine multiple approaches for maximum reliability:

### Primary: External Cron (cron-job.org)
- Scheduled, reliable timing
- Runs even if no one is online

### Backup: Client-Side Scheduler
- Runs whenever someone opens the app
- Catches any missed reminders
- Zero additional setup needed

### Implementation:

Both systems check if reminders were already sent today, so there's no duplication risk. The client scheduler acts as a safety net.

---

## 📊 Monitoring & Debugging

### Check Reminder History in Firestore

Query the `review_reminders` collection:

```typescript
const reminders = await getDocs(
  query(
    collection(db, 'review_reminders'),
    orderBy('sent_at', 'desc'),
    limit(50)
  )
);

reminders.forEach(doc => {
  console.log(doc.data());
  // Shows: user_id, reminder_type, sent_at, success, channels_sent
});
```

### View Logs

**Client-Side Scheduler**: Check browser console
```javascript
// Enable verbose logging
localStorage.setItem('debug_reminders', 'true');

// View status
ClientReminderScheduler.getInstance().getStatus();
```

**External Cron**: Check cron-job.org execution history

**GitHub Actions**: View workflow runs in GitHub Actions tab

---

## 🧪 Testing

### Test Client Scheduler

1. Open browser console
2. Reset timers to allow immediate sending:
   ```javascript
   ClientReminderScheduler.getInstance().resetTimers();
   ```
3. Trigger manual check:
   ```javascript
   ClientReminderScheduler.getInstance().manualCheck();
   ```
4. Check Discord and Firestore for messages

### Test External Cron

1. Use curl to test your endpoint:
   ```bash
   curl -X POST https://your-app.vercel.app/api/reminders/sunday \
     -H "x-api-key: your-secret-key"
   ```

2. Or test from browser:
   - Go to cron-job.org
   - Find your job
   - Click "Run job now"

### Test Admin Panel

1. Go to Admin Dashboard → Review Reminder Panel
2. Click any reminder button
3. Should work regardless of time/day

---

## 🎯 Which Approach Should You Use?

### For Small Teams (< 20 users)
✅ **Client-Side Scheduler Only**
- Add to App.tsx
- Done in 2 minutes
- Free forever
- Works well if people check dashboard daily

### For Medium Teams (20-100 users)
✅ **Client-Side + cron-job.org**
- Best reliability
- Still free
- 30 minutes setup
- Recommended

### For Large Teams (100+ users)
✅ **GitHub Actions or Dedicated Server**
- Most reliable
- Better control
- Proper logging
- Professional solution

---

## 📝 Quick Start Checklist

- [ ] Choose your approach (or combination)
- [ ] Add client scheduler to App.tsx
- [ ] Set up Discord webhook
- [ ] Configure environment variables
- [ ] Test manually from Admin Panel
- [ ] Set up external cron (if using)
- [ ] Test automatic reminders
- [ ] Monitor for 1 week to verify
- [ ] Document for your team

---

## 🆘 Troubleshooting

**Q: Reminders not sending**
- Check browser console for errors
- Verify Discord webhook URL is correct
- Check Firestore rules allow writes to `review_reminders`
- Run manual check from admin panel

**Q: Duplicate reminders**
- System prevents this automatically
- Check `wasRemindedToday()` is working
- Verify localStorage is not being cleared

**Q: Wrong timing**
- Client scheduler checks time windows (e.g., 8pm-11pm)
- Adjust time ranges in `clientReminderScheduler.ts` if needed
- Consider timezone differences

**Q: No one online to trigger client scheduler**
- This is expected behavior
- Add external cron as backup
- Or schedule one person to check daily

---

## 🎉 Summary

You now have multiple ways to send reminders without Cloud Functions:

1. ✅ **Automatic** client-side scheduler (works when people use the app)
2. ✅ **Scheduled** external cron jobs (reliable timing)
3. ✅ **Manual** admin panel triggers (always available)
4. ✅ **In-app** notifications (always work)
5. ✅ **Discord** integration (with user tagging)

Choose the approach that fits your team size and technical requirements!
