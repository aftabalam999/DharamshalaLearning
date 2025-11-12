# 📋 Google Sheets - Header Setup Guide

## 🎯 Quick Setup

### "Student Journey" Tab (Only tab needed)

**Copy this into Row 1 (A1:V1):**

```
Date	Student Name	Campus	House	Phase	Topic	Week	Goal Text	Target %	Goal Status	Goal Reviewed By	Goal Review Date	What Worked Well	How Achieved	Key Learning	Challenges	Achieved %	Reflection Status	Mentor Assessment	Reflection Reviewed By	Goal ID	Reflection ID	Sync Hash
```

**Or type manually:**

| Column | Header |
|--------|--------|
| A | Date |
| B | Student Name |
| C | Campus |
| D | House |
| E | Phase |
| F | Topic |
| G | Week |
| H | Goal Text |
| I | Target % |
| J | Goal Status |
| K | Goal Reviewed By |
| L | Goal Review Date |
| M | What Worked Well |
| N | How Achieved |
| O | Key Learning |
| P | Challenges |
| Q | Achieved % |
| R | Reflection Status |
| S | Mentor Assessment |
| T | Reflection Reviewed By |
| U | Goal ID |
| V | Reflection ID |
| W | Sync Hash |

---

## 📊 Understanding the Data

### Timeline Columns (A-G)
- **Date**: When the goal was created
- **Student Name**: Full student name (from user profile)
- **Campus**: Dharamshala, etc.
- **House**: Red House, Blue House, etc.
- **Phase**: Phase 1, Phase 2, etc.
- **Topic**: Specific topic being worked on
- **Week**: Week number (1-52)

### Goal Columns (H-L)
- **Goal Text**: What the student planned to do
- **Target %**: Student's target achievement percentage
- **Goal Status**: pending / reviewed / approved
- **Goal Reviewed By**: Mentor/admin who reviewed
- **Goal Review Date**: When goal was approved

### Reflection Columns (M-T)
- **What Worked Well**: Reflection question 1 (may be empty if no reflection yet)
- **How Achieved**: Reflection question 2
- **Key Learning**: Reflection question 3
- **Challenges**: Reflection question 4
- **Achieved %**: Actual achievement percentage
- **Reflection Status**: pending / reviewed / approved
- **Mentor Assessment**: needs_improvement / on_track / exceeds_expectations
- **Reflection Reviewed By**: Mentor who reviewed reflection

### System Columns (U-W)
- **Goal ID**: Firestore document ID for goal
- **Reflection ID**: Firestore document ID for reflection (empty if no reflection)
- **Sync Hash**: Deduplication hash (prevents duplicates)

---

## 📈 What You'll See

### Scenario 1: Goal submitted, no reflection yet
```
07/11/2025 | Rahul | Dharamshala | Red | Phase 2 | React Basics | 45 | 
Complete todo app | 80 | pending | | |
(empty) | (empty) | (empty) | (empty) | | | | |
goal_abc123 | | goal_abc123_NO_REFL
```

### Scenario 2: Goal + Reflection both submitted
```
07/11/2025 | Rahul | Dharamshala | Red | Phase 2 | React Basics | 45 |
Complete todo app | 80 | approved | mentor_xyz | 08/11/2025 |
I completed the basic structure | Used React hooks | Learned state management | Struggled with CSS | 85 | reviewed | on_track | mentor_xyz |
goal_abc123 | refl_def456 | goal_abc123_refl_def456
```

### Timeline View
When reflection is added, a **NEW row appears**:
- First row: Goal only (hash: `goal_abc_NO_REFL`)
- Second row: Goal + Reflection (hash: `goal_abc_refl_def`)

This gives you **full timeline** of when goal was set vs when reflection was done!

---

## 🎨 Optional Formatting

### 1. Bold Headers
- Select Row 1
- Click Bold (Ctrl+B / Cmd+B)

### 2. Freeze Header
- Click View → Freeze → 1 row

### 3. Color Code Status
Use conditional formatting:
- **Goal Status = "approved"**: Green
- **Goal Status = "pending"**: Yellow
- **Reflection Status = "reviewed"**: Blue

### 4. Column Widths
Suggested widths:
- Date (A): 100px
- Names/Text (B, H): 150px
- Phase/Topic (E, F): 120px
- Reflection answers (M-P): 250px+
- IDs (U, V): 200px
- Sync Hash (W): Can hide this column

---

## 🔍 Sample Analysis Queries

### See all goals for a student:
```excel
=FILTER('Student Journey'!A:W, 'Student Journey'!B:B="Rahul Sharma")
```

### Goals with reflections:
```excel
=FILTER('Student Journey'!A:W, 'Student Journey'!V:V<>"")
```

### Goals without reflections (pending):
```excel
=FILTER('Student Journey'!A:W, 'Student Journey'!V:V="")
```

### Week 45 activity:
```excel
=FILTER('Student Journey'!A:W, 'Student Journey'!G:G=45)
```

### Campus-wise count:
```excel
=QUERY('Student Journey'!A:W, "SELECT C, COUNT(U) GROUP BY C LABEL C 'Campus', COUNT(U) 'Total Goals'")
```

---

## ✅ After Setup

1. Add headers to "Student Journey" sheet
2. Wait for quota reset or trigger sync manually
3. Data will populate starting from Row 2
4. Each goal appears once when created
5. Same goal appears again when reflection added (new hash)
6. Use filters/pivot tables to analyze

---

## 🆘 Troubleshooting

**Headers not matching data?**
- Make sure you have exactly 23 columns (A-W)
- Check spelling matches exactly

**Duplicate data?**
- Sync hash prevents this automatically
- If you see duplicates, check column W values

**Missing reflection data?**
- Normal if student hasn't reflected yet
- Those columns will be empty (M-T)

---

**Last Updated:** Nov 12, 2025  
**Related:** `SHEETS_OPTIMIZATION_SUMMARY.md`
