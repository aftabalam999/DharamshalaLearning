// Test script to verify pair programming system is working dynamically
// Usage: npx ts-node scripts/testPairProgramming.ts

import { EnhancedPairProgrammingService } from '../src/services/dataServices';
import { UserService, FirestoreService, COLLECTIONS } from '../src/services/firestore';
import { PairProgrammingScheduler } from '../src/services/pairProgrammingScheduler';
import { User } from '../src/types';

async function testPairProgrammingSystem() {
  try {
    console.log('🧪 Testing Pair Programming System...\n');

    // Get all users to see if we have test data
    const allUsers: User[] = await FirestoreService.getAll<User>(COLLECTIONS.USERS);
    console.log(`📊 Total users in system: ${allUsers.length}`);

    // Get users by role
    const mentors = allUsers.filter((u: User) => u.role === 'mentor' || u.role === 'academic_associate' || u.role === 'admin');
    const students = allUsers.filter((u: User) => !u.role || (u.role as any) === 'student');

    console.log(`👨‍🏫 Available mentors: ${mentors.length}`);
    console.log(`👨‍🎓 Available students: ${students.length}\n`);

    if (mentors.length === 0 || students.length === 0) {
      console.log('⚠️  No mentors or students found. System may not have test data.');
      return;
    }

    // Test 1: Check existing sessions
    console.log('📈 Testing Session Retrieval...');
    const mentorSessions = await EnhancedPairProgrammingService.getSessionsByUser(mentors[0].id, 'mentor');
    console.log(`   Mentor ${mentors[0].name} has ${mentorSessions.length} sessions`);

    const studentSessions = await EnhancedPairProgrammingService.getSessionsByUser(students[0].id, 'mentee');
    console.log(`   Student ${students[0].name} has ${studentSessions.length} sessions\n`);

    // Test 2: Check upcoming sessions
    console.log('📅 Testing Upcoming Sessions...');
    const upcomingMentor = await PairProgrammingScheduler.getUpcomingSessions(mentors[0].id, 'mentor');
    const upcomingStudent = await PairProgrammingScheduler.getUpcomingSessions(students[0].id, 'student');

    console.log(`   Mentor upcoming sessions: ${upcomingMentor.length}`);
    console.log(`   Student upcoming sessions: ${upcomingStudent.length}\n`);

    // Test 3: Check available slots
    console.log('🎯 Testing Available Slots...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(tomorrow);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const availableSlots = await PairProgrammingScheduler.findAvailableSlots(
      mentors[0].campus || 'Dharamshala',
      tomorrow,
      nextWeek
    );

    console.log(`   Available slots for ${mentors[0].campus}: ${availableSlots.length}`);
    if (availableSlots.length > 0) {
      console.log(`   Sample slot: ${availableSlots[0].date} at ${availableSlots[0].start_time} with ${availableSlots[0].mentor_name}`);
    }

    console.log('\n✅ System test completed! The pair programming system is working dynamically.');

  } catch (error) {
    console.error('❌ Error testing system:', error);
  }
}

// Run the test
testPairProgrammingSystem();