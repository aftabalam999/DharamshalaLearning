# Score Distribution Analytics - Enhanced Features

## 🎯 New Features Added (November 9, 2025)

### 1. Chart View Toggle Button
**Location:** Top right of Score Distribution Analytics section

**Functionality:**
- Toggle between **Count** view (absolute numbers) and **Percentage** view (%)
- Applies to both charts:
  - Current Week Distribution
  - Last 4 Weeks Aggregate Distribution
- Visual indicator: Purple when showing %, Gray when showing count
- Icon changes: Hash symbol (#) for count, Percent symbol (%) for percentage

**Use Case:**
- **Count view:** See exact number of reviews in each bucket
- **Percentage view:** Better for comparing proportions across different time periods

**Example:**
```
Button States:
[#] Count     ← Click to switch to percentage
[%] Percentage ← Click to switch back to count
```

---

### 2. Bulk Reminder Button
**Location:** Top right, next to toggle button

**Label:** "Remind Low Performers (N)" where N = count of users with score < 0.5

**Functionality:**
- Identifies all users with average score < 0.5 (Needs Improvement or Critical)
- Sends review reminder notifications via ReviewReminderService
- Uses user's preferred notification channels (in-app, Discord, email)
- Shows confirmation dialog before sending
- Displays success message after completion

**Button States:**
1. **Active (Orange):** When low performers exist and ready to send
2. **Disabled (Gray):** When no low performers or while sending
3. **Sending (Gray):** Shows "Sending..." during operation

**Safety Features:**
- Confirmation prompt: "Send review reminders to N low performer(s)?"
- Anti-spam: Uses ReviewReminderService's built-in daily limit checking
- Error handling: Shows count of successful vs failed sends

**Success Message:**
```
✅ Reminders sent to 8 users (1 failed)
```
*Auto-dismisses after 5 seconds*

---

## 📊 Charts with Toggle

### Current Week Distribution
**Before Toggle:**
```
Count View:
Excellent:     12 reviews █████████████
Good:          25 reviews ██████████████████████████
Needs Improve: 8 reviews  ████████
Critical:      3 reviews  ███
```

**After Toggle:**
```
Percentage View:
Excellent:     25.0% █████████████
Good:          52.1% ██████████████████████████
Needs Improve: 16.7% ████████
Critical:      6.2%  ███
```

---

## 🔔 Bulk Reminder Flow

### Step 1: Identify Low Performers
System automatically identifies users with:
- Average score < 0.5 (current week)
- Includes both "Needs Improvement" and "Critical" buckets

### Step 2: Button Click
Admin clicks "Remind Low Performers (8)"

### Step 3: Confirmation Dialog
```
Send review reminders to 8 low performers (score < 0.5)?

This will notify them to improve their review scores.

[Cancel]  [OK]
```

### Step 4: Processing
- Button shows "Sending..."
- For each low performer:
  1. Fetch full user object
  2. Determine pending reviews (mentees/mentor)
  3. Call ReviewReminderService.sendReminder()
  4. Track success/failure

### Step 5: Result
Green success banner appears:
```
┌────────────────────────────────────────────┐
│ ✅ Reminders sent to 7 users (1 failed)    │
└────────────────────────────────────────────┘
```

---

## 🎨 Visual Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Score Distribution Analytics                                     │
│                                                    [#] Count      │
│                                                    [🔔] Remind    │
│                                                    Low Perf. (8)  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [Avg Score] [Good/Exc] [Critical] [Total Reviews]              │
│                                                                   │
│  Current Week Distribution (Bar Chart)                           │
│  ┌─────────────────────────────────────────┐                    │
│  │ ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇              │                    │
│  │ Excellent  Good  Needs  Critical         │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                   │
│  Last 4 Weeks Aggregate (Bar Chart)                              │
│  ┌─────────────────────────────────────────┐                    │
│  │ ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇              │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                   │
│  [Top Performers]        [Lowest Performers]                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💡 Usage Tips

### When to Use Count View
- Seeing absolute numbers of reviews
- Comparing with total review count
- Planning specific interventions (e.g., "8 users need help")

### When to Use Percentage View
- Comparing trends across different sized populations
- Understanding proportions (e.g., "20% are critical")
- Identifying patterns that might be hidden by raw numbers

### When to Send Bulk Reminders
- After reviewing distribution and seeing high critical %
- Monday morning to prompt users before deadline
- When you notice declining trends in Historical Trends table
- Before end-of-week deadline to catch stragglers

### Best Practices
1. **Review first:** Check distribution and performer lists before sending reminders
2. **Filter appropriately:** Use campus/house filters to target specific groups
3. **Avoid spam:** Don't send multiple times per day (system prevents this)
4. **Follow up:** Check Historical Trends next week to see if reminders helped

---

## 🔧 Technical Details

### Toggle Implementation
- State: `showPercentage` (boolean)
- Updates `dataKey` prop in recharts: `count` vs `percentage`
- Both values pre-calculated in bucket objects
- Y-axis label updates dynamically

### Bulk Reminder Implementation
- Uses existing `ReviewReminderService.sendReminder()`
- Reminder type: `'morning_reminder'`
- Fetches full user objects with notification preferences
- Respects user's channel settings (in-app, Discord, email)
- Async operation with loading state management

### Low Performer Detection
```typescript
const lowPerformers = performers.filter(p => p.averageScore < 0.5)
```
- Threshold: Score < 0.5
- Includes both "Needs Improvement" (-0.5 to 0.49) and "Critical" (-2.0 to -0.51)
- Based on current week average only

---

## 📱 Responsive Design

**Desktop:**
```
[Title]                    [Count Toggle] [Bulk Reminder]
```

**Mobile/Tablet:**
```
[Title]
[Count Toggle]
[Bulk Reminder]
```
Buttons wrap and stack on smaller screens.

---

## ✅ Testing Checklist

- [x] Toggle switches between count and percentage
- [x] Both charts update when toggled
- [x] Y-axis labels change appropriately
- [x] Tooltip shows correct units (count vs %)
- [x] Bulk reminder button shows correct count
- [x] Confirmation dialog appears before sending
- [x] Success message displays after completion
- [x] Button disables during send operation
- [x] Works with campus/house filters
- [x] No TypeScript errors
- [x] Build compiles successfully

---

## 🚀 Ready to Use!

Both features are now live in the Admin Review Compliance dashboard. Access via:
1. Navigate to Admin panel
2. Click "Review Compliance"
3. Scroll to "Score Distribution Analytics"
4. Use toggle and reminder buttons as needed

**End of Enhancement Documentation**
