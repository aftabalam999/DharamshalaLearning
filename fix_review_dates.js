/**
 * Fix Review Week Start Dates
 * 
 * This script updates all reviews in the database to have correct week_start dates.
 * Reviews created before our fix have week_start with timestamps instead of Monday midnight.
 * 
 * Run with: node --loader ts-node/esm fix_review_dates.ts
 * Or simpler: Add this functionality to your admin panel
 */

// Import Firebase client SDK
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';

// Firebase configuration
const dharamshalaConfig = {
  apiKey: "AIzaSyBaLncnVJzGRHxgpAhyl9IeX8dz2e3e-VA",
  authDomain: "dharamshalacampus.firebaseapp.com",
  projectId: "dharamshalacampus",
  storageBucket: "dharamshalacampus.appspot.com",
  messagingSenderId: "1061564721485",
  appId: "1:1061564721485:web:6a384c1e2f446ea154ef04",
  measurementId: "G-3E03XTJRT0"
};

// Initialize Firebase
const app = initializeApp(dharamshalaConfig);
const db = getFirestore(app);

/**
 * Calculate Monday of the week for a given date
 */
function getWeekStartForDate(date) {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - daysSinceMonday);
  weekStart.setHours(0, 0, 0, 0); // Midnight
  
  return weekStart;
}

/**
 * Fix reviews in a collection
 */
async function fixReviewsInCollection(collectionName) {
  console.log(`\n🔍 Processing ${collectionName}...`);
  
  const snapshot = await db.collection(collectionName).get();
  console.log(`📊 Found ${snapshot.size} reviews`);
  
  let fixed = 0;
  let alreadyCorrect = 0;
  let errors = 0;
  
  const batch = db.batch();
  let batchCount = 0;
  
  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      const weekStartTimestamp = data.week_start;
      
      if (!weekStartTimestamp) {
        console.log(`⚠️  Review ${doc.id} has no week_start field - skipping`);
        continue;
      }
      
      // Convert Firestore timestamp to Date
      const weekStartDate = weekStartTimestamp.toDate();
      
      // Check if it's already at Monday midnight
      const hours = weekStartDate.getHours();
      const minutes = weekStartDate.getMinutes();
      const seconds = weekStartDate.getSeconds();
      const milliseconds = weekStartDate.getMilliseconds();
      
      const isAtMidnight = hours === 0 && minutes === 0 && seconds === 0 && milliseconds === 0;
      const dayOfWeek = weekStartDate.getDay();
      const isMonday = dayOfWeek === 1;
      
      if (isMonday && isAtMidnight) {
        alreadyCorrect++;
        console.log(`✅ Review ${doc.id} already correct: ${weekStartDate.toISOString()}`);
        continue;
      }
      
      // Calculate correct week start (Monday at midnight)
      const correctWeekStart = getWeekStartForDate(weekStartDate);
      
      console.log(`🔧 Fixing review ${doc.id}:`);
      console.log(`   Old: ${weekStartDate.toISOString()} (${weekStartDate.toLocaleString()})`);
      console.log(`   New: ${correctWeekStart.toISOString()} (${correctWeekStart.toLocaleString()})`);
      
      // Add to batch
      batch.update(doc.ref, {
        week_start: admin.firestore.Timestamp.fromDate(correctWeekStart),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      batchCount++;
      fixed++;
      
      // Firestore batch has a limit of 500 operations
      if (batchCount >= 500) {
        console.log('💾 Committing batch...');
        await batch.commit();
        batchCount = 0;
      }
      
    } catch (error) {
      console.error(`❌ Error processing review ${doc.id}:`, error.message);
      errors++;
    }
  }
  
  // Commit remaining operations
  if (batchCount > 0) {
    console.log('💾 Committing final batch...');
    await batch.commit();
  }
  
  console.log(`\n📈 ${collectionName} Summary:`);
  console.log(`   ✅ Already correct: ${alreadyCorrect}`);
  console.log(`   🔧 Fixed: ${fixed}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📊 Total: ${snapshot.size}`);
  
  return { fixed, alreadyCorrect, errors, total: snapshot.size };
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting review date fix...');
  console.log('📅 Target: Set all week_start dates to Monday at 00:00:00');
  
  try {
    // Fix both collections
    const menteeResults = await fixReviewsInCollection('mentee_reviews');
    const mentorResults = await fixReviewsInCollection('mentor_reviews');
    
    console.log('\n🎉 Fix Complete!');
    console.log('\n📊 Overall Summary:');
    console.log(`   Total reviews processed: ${menteeResults.total + mentorResults.total}`);
    console.log(`   Total fixed: ${menteeResults.fixed + mentorResults.fixed}`);
    console.log(`   Already correct: ${menteeResults.alreadyCorrect + mentorResults.alreadyCorrect}`);
    console.log(`   Errors: ${menteeResults.errors + mentorResults.errors}`);
    
    console.log('\n✅ All reviews now have correct week_start dates!');
    console.log('🔄 Refresh your dashboard to see the updates.');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    // Clean up
    await admin.app().delete();
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
