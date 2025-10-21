import { EnhancedPairProgrammingService } from '../src/services/dataServices';
import { FirestoreService, COLLECTIONS } from '../src/services/firestore';
import { User, PairProgrammingSession } from '../src/types';

async function debugMentorDashboard() {
  try {
    console.log('🔍 Debugging Mentor Dashboard...\n');

    // Get all users
    const allUsers: User[] = await FirestoreService.getAll<User>(COLLECTIONS.USERS);
    console.log(`📊 Total users: ${allUsers.length}`);

    // Find mentors
    const mentors = allUsers.filter((u: User) => u.role === 'mentor' || u.role === 'academic_associate' || u.role === 'admin');
    console.log(`👨‍🏫 Mentors found: ${mentors.length}`);

    if (mentors.length === 0) {
      console.log('❌ No mentors found in the system!');
      return;
    }

    // Check each mentor's sessions
    for (const mentor of mentors.slice(0, 3)) { // Check first 3 mentors
      console.log(`\n--- Checking Mentor: ${mentor.name} (ID: ${mentor.id}) ---`);
      console.log(`Role: ${mentor.role}`);
      console.log(`Campus: ${mentor.campus}`);

      try {
        const sessions = await EnhancedPairProgrammingService.getSessionsByUser(mentor.id, 'mentor');
        console.log(`📈 Sessions found: ${sessions.length}`);

        if (sessions.length > 0) {
          console.log('Sample sessions:');
          sessions.slice(0, 3).forEach((session, index) => {
            console.log(`  ${index + 1}. ${session.topic} - Status: ${session.status} - Student: ${session.student_id}`);
          });
        } else {
          console.log('⚠️  No sessions found for this mentor');
        }
      } catch (error) {
        console.log(`❌ Error fetching sessions: ${error}`);
      }
    }

    // Check total sessions in database
    console.log('\n--- Database Overview ---');
    const allSessions: PairProgrammingSession[] = await FirestoreService.getAll<PairProgrammingSession>(COLLECTIONS.PAIR_PROGRAMMING_SESSIONS);
    console.log(`📊 Total sessions in database: ${allSessions.length}`);

    if (allSessions.length > 0) {
      const statusCounts = allSessions.reduce((acc: Record<string, number>, session: PairProgrammingSession) => {
        acc[session.status] = (acc[session.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('Session status breakdown:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });

      // Check if sessions have mentor_id assigned
      const sessionsWithMentor = allSessions.filter((s: PairProgrammingSession) => s.mentor_id);
      const sessionsWithoutMentor = allSessions.filter((s: PairProgrammingSession) => !s.mentor_id);

      console.log(`\n📋 Sessions with mentor assigned: ${sessionsWithMentor.length}`);
      console.log(`📋 Sessions without mentor (open requests): ${sessionsWithoutMentor.length}`);
    }

  } catch (error) {
    console.error('❌ Error debugging:', error);
  }
}

debugMentorDashboard();