# Task 19: Score Distribution Analytics

## ✅ What's Included
- New component: `src/components/Admin/ScoreDistributionAnalytics.tsx`
- Integrated into `AdminReviewCompliance.tsx` (after Historical Trends)
- Uses current week's reviews + last 4 weeks for aggregate comparison
- Buckets scores into four ranges with counts and percentages:
  - Excellent (1.5 – 2.0)
  - Good (0.5 – 1.49)
  - Needs Improvement (-0.5 – 0.49)
  - Critical (-2.0 – -0.51)
- Displays:
  - Summary cards (Avg Score, Good/Excellent count, Critical count, Total reviews)
  - Current week distribution (bar chart)
  - Last 4 weeks aggregate distribution (bar chart)
  - Top 5 and Bottom 5 performers (based on average of their current-week entries)
  - Alerts when Critical share > 20%
  - Simple week-over-week trend on average score
- **NEW:** Toggle button to switch between Count and Percentage view for charts
- **NEW:** Bulk Reminder button to send notifications to all low performers (score < 0.5)

## 📁 Files
- `src/components/Admin/ScoreDistributionAnalytics.tsx` – main analytics component
- `src/components/Admin/AdminReviewCompliance.tsx` – import + render integration

## 🔧 Data & Logic
- Combines `mentee_reviews` + `mentor_reviews`
- Current week determined via `getCurrentWeekStart()`
- Scores computed with `calculateReviewScore()` from `reviewCalculations.ts`
- Trend computed via `calculateTrend()` against prior week(s)
- Optional filters on campus/house by looking up `users` collection

## 🎨 Charts
- Uses `recharts` (already in package.json)
- Two bar charts:
  - Current week buckets (Count)
  - Last 4 weeks aggregated buckets (Count)

## 🧠 Notes & Assumptions
- Performer ranking groups by `reviewee_id` and averages their current-week scores
- If multiple entries exist for the same reviewee in the week, they’re averaged
- If names are missing in review docs, falls back to IDs
- Filters apply to users by reviewee or reviewer match

## 🧪 How to Try
- Open Admin Review Compliance dashboard
- Scroll to "Score Distribution Analytics" section
- Adjust campus/house filters as needed
- **Toggle View:** Click the "Count" / "Percentage" button to switch chart data view
- **Send Reminders:** Click "Remind Low Performers (N)" to send bulk notifications to users with score < 0.5

## 🚨 Alerts
- Shows a red alert if more than 20% of current-week reviews are in the Critical bucket

## 🔔 Bulk Reminder Feature
- **Who Gets Reminded:** All users with average score < 0.5 (Needs Improvement or Critical)
- **What They Receive:** Review reminder notification via their preferred channels (in-app, Discord, email)
- **Safety:** Confirms before sending; uses ReviewReminderService to prevent spam
- **Feedback:** Shows success message with count of reminders sent
- **Button State:** Disabled when no low performers exist or while sending

## 📈 Future Enhancements
- Add campus average line overlay on bucket chart
- ~~Percent-stacked bar view toggle (percentage vs count)~~ ✅ IMPLEMENTED
- Drill-down modal to list reviews within a bucket
- Export CSV of top/bottom performers
- ~~Bulk reminder button for low performers~~ ✅ IMPLEMENTED
- Track reminder delivery status per user
- Add filters to bulk reminder (campus/house specific)

## 🎨 UI Features
- **Toggle Button:** Purple when showing percentage, gray when showing count
- **Reminder Button:** Orange, shows count in label, disabled when no targets
- **Success Message:** Green banner appears for 5 seconds after sending
- **Responsive:** Buttons wrap on small screens

## ✅ Status
- Implemented and integrated ✅
- Type checks pass for the new component ✅
- Toggle between count/percentage view ✅
- Bulk reminder functionality ✅
- Build compiles successfully ✅
