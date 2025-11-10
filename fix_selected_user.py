#!/usr/bin/env python3
"""
Fix StudentJourney.tsx to display selected user's data instead of always showing logged-in user
"""

with open('src/components/Student/StudentJourney.tsx', 'r') as f:
    content = f.read()

# Fix 1: Display correct user name
content = content.replace(
    '<h2 className="text-2xl font-bold text-gray-900">{userData?.name}</h2>',
    '<h2 className="text-2xl font-bold text-gray-900">{selectedUserData?.name || userData?.name}</h2>'
)

# Fix 2: Display correct user ID
content = content.replace(
    '<p className="text-gray-600">Student ID: {userData?.id}</p>',
    '<p className="text-gray-600">Student ID: {selectedUserData?.id || userData?.id}</p>'
)

# Fix 3: Display correct current phase
content = content.replace(
    '{userData?.current_phase_name || \'Not Set\'}',
    '{selectedUserData?.current_phase_name || userData?.current_phase_name || \'Not Set\'}'
)

# Fix 4: Use correct house for chart data
content = content.replace(
    'if (userData?.house) {',
    'const targetUser = selectedUserData || userData;\n      if (targetUser?.house) {'
)

content = content.replace(
    'houseData = await HouseStatsService.getHouseAverages(userData.house);',
    'houseData = await HouseStatsService.getHouseAverages(targetUser.house);'
)

# Fix 5: Update chart title to show correct house
content = content.replace(
    'Your Progress vs {userData?.house} House Average',
    'Your Progress vs {(selectedUserData || userData)?.house} House Average'
)

# Fix 6: Use selected user's campus_joining_date
content = content.replace(
    'const durationData: PhaseDurationData[] = calculatePhaseDurations(phaseProgressData, userData?.campus_joining_date);',
    'const durationData: PhaseDurationData[] = calculatePhaseDurations(phaseProgressData, (selectedUserData || userData)?.campus_joining_date);'
)

with open('src/components/Student/StudentJourney.tsx', 'w') as f:
    f.write(content)

print("✅ Fixed StudentJourney.tsx to display selected user's data")
