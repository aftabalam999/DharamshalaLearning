#!/bin/bash

# Fix StudentJourney.tsx topic completion logic

FILE="src/components/Student/StudentJourney.tsx"

# Create a temporary file with the fix
cat > /tmp/fix_journey.txt << 'EOF'
          // A topic is marked complete if the student has created at least one goal for it
          try {
            if (topicGoals.length > 0) {
              // Mark as completed if student has worked on it
              completed = true;
              // Use the last goal date as completion date
              const sortedGoals = topicGoals.sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              completionDate = new Date(sortedGoals[0].created_at);
            }
EOF

# Use sed to replace the problematic section (lines 251-273)
# First, let's create a Python script to do this more reliably
cat > /tmp/fix_journey.py << 'PYEOF'
import re

with open('src/components/Student/StudentJourney.tsx', 'r') as f:
    content = f.read()

# Find and replace the buggy completion logic
old_pattern = r'''          // A phase is considered complete when user starts creating goals for the next phase
          try \{
            // Get all goals for this topic, sorted by date
            const sortedGoals = topicGoals\.sort\(\(a, b\) => 
              new Date\(a\.created_at\)\.getTime\(\) - new Date\(b\.created_at\)\.getTime\(\)
            \);

            if \(sortedGoals\.length > 0\) \{
              const lastGoalDate = new Date\(sortedGoals\[sortedGoals\.length - 1\]\.created_at\);

              // Filter goals from the next phase \(already in userGoals list\)
              const nextPhaseFirstGoal = userGoals
                \.filter\(g => g\.phase_id === phases\[phase\.order\]\.id\) // next phase
                \.sort\(\(a, b\) => new Date\(a\.created_at\)\.getTime\(\) - new Date\(b\.created_at\)\.getTime\(\)\)\[0\];

              if \(nextPhaseFirstGoal\) \{
                const nextPhaseStartDate = new Date\(nextPhaseFirstGoal\.created_at\);
                // If user has started the next phase, mark this topic as completed
                if \(lastGoalDate < nextPhaseStartDate\) \{
                  completed = true;
                  completionDate = lastGoalDate;
                \}
              \}
            \}'''

new_text = '''          // A topic is marked complete if the student has created at least one goal for it
          try {
            if (topicGoals.length > 0) {
              // Mark as completed if student has worked on it
              completed = true;
              // Use the last goal date as completion date
              const sortedGoals = topicGoals.sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              completionDate = new Date(sortedGoals[0].created_at);
            }'''

content = re.sub(old_pattern, new_text, content, flags=re.MULTILINE)

with open('src/components/Student/StudentJourney.tsx', 'w') as f:
    f.write(content)

print("✅ Fixed topic completion logic")
PYEOF

python3 /tmp/fix_journey.py
