#!/usr/bin/env python3
"""
Fix Journey Tab Issues:
1. Graph phase labels don't match phase progress bars (using index vs actual phase order)
2. Phase completion detection too simplistic (marks all topics with goals as complete)
"""

with open('src/components/Student/StudentJourney.tsx', 'r') as f:
    content = f.read()

# Fix 1: Use actual phase.order for phase labels instead of array index
# This ensures "Phase 1" in graph matches "Phase 1" in progress bars
old_label = '''    durations.push({
      phaseName: phaseData.phase.name,
      daysSpent,
      status,
      color,
      phaseLabel: `Phase ${index + 1}`
    });'''

new_label = '''    durations.push({
      phaseName: phaseData.phase.name,
      daysSpent,
      status,
      color,
      phaseLabel: `Phase ${phaseData.phase.order}`
    });'''

content = content.replace(old_label, new_label)

# Fix 2: Improve topic completion logic - topics should be marked complete only when
# the student has moved beyond them to a later phase (not just created one goal)
old_completion = '''          // A topic is marked complete if the student has created at least one goal for it
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
          } catch (error) {
            console.error('Error checking phase completion:', error);
          }'''

new_completion = '''          // A topic is marked complete if:
          // 1. Student has goals for this topic AND
          // 2. Student has moved to a later phase (has goals in phases with higher order)
          try {
            if (topicGoals.length > 0) {
              // Check if student has started any later phases
              const currentPhaseOrder = phase.order;
              const hasLaterPhaseGoals = userGoals.some(g => {
                // Find the phase for this goal
                const goalPhase = phases.find(p => p.id === g.phase_id);
                return goalPhase && goalPhase.order > currentPhaseOrder;
              });

              // Mark complete if student has moved beyond this phase
              if (hasLaterPhaseGoals) {
                completed = true;
                // Use the last goal date as completion date
                const sortedGoals = topicGoals.sort((a, b) => 
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                completionDate = new Date(sortedGoals[0].created_at);
              } else {
                // Student is still on this phase - mark as in progress (not complete)
                completed = false;
              }
            }
          } catch (error) {
            console.error('Error checking phase completion:', error);
          }'''

content = content.replace(old_completion, new_completion)

with open('src/components/Student/StudentJourney.tsx', 'w') as f:
    f.write(content)

print("✅ Fixed Journey Tab:")
print("  - Graph phase labels now use actual phase.order")
print("  - Topic completion now checks if student has moved to later phases")
