#!/usr/bin/env node

/**
 * Google Sheets Sync Script
 * 
 * Runs as GitHub Action to sync Firestore data to Google Sheets
 * Uses incremental sync - only syncs data changed since last run
 */

const admin = require('firebase-admin');
const { google } = require('googleapis');

// Validate environment variables
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT environment variable is not set');
  process.exit(1);
}

if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
  console.error('❌ GOOGLE_SERVICE_ACCOUNT environment variable is not set');
  process.exit(1);
}

if (!process.env.GOOGLE_SHEETS_ID) {
  console.error('❌ GOOGLE_SHEETS_ID environment variable is not set');
  process.exit(1);
}

// Parse service accounts with error handling
let serviceAccount;
let googleCredentials;

try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  console.log('✅ Firebase service account parsed successfully');
} catch (error) {
  console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:', error.message);
  console.error('First 50 chars:', process.env.FIREBASE_SERVICE_ACCOUNT?.substring(0, 50));
  process.exit(1);
}

try {
  googleCredentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
  console.log('✅ Google service account parsed successfully');
} catch (error) {
  console.error('❌ Failed to parse GOOGLE_SERVICE_ACCOUNT:', error.message);
  console.error('First 50 chars:', process.env.GOOGLE_SERVICE_ACCOUNT?.substring(0, 50));
  process.exit(1);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized');
}

const db = admin.firestore();

// Google Sheets configuration
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
console.log('✅ Using Google Sheets ID:', SPREADSHEET_ID);

/**
 * Get Google Sheets client
 */
async function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: googleCredentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}

/**
 * Get last sync time from Firestore metadata
 */
async function getLastSyncTime() {
  try {
    const metaDoc = await db.collection('system_metadata')
      .doc('sheets_sync')
      .get();
    
    if (!metaDoc.exists) {
      console.log('📅 No previous sync found, will sync all data');
      return new Date(0); // Epoch - sync everything
    }

    const lastSync = metaDoc.data().last_sync_time;
    const lastSyncDate = lastSync ? lastSync.toDate() : new Date(0);
    console.log(`📅 Last sync: ${lastSyncDate.toISOString()}`);
    return lastSyncDate;
  } catch (error) {
    console.error('Error getting last sync time:', error);
    return new Date(0); // Default to syncing everything
  }
}

/**
 * Update last sync time
 */
async function updateLastSyncTime(stats) {
  try {
    await db.collection('system_metadata')
      .doc('sheets_sync')
      .set({
        last_sync_time: admin.firestore.FieldValue.serverTimestamp(),
        last_sync_status: 'success',
        journey_records_synced: stats.journey,
        last_run_at: new Date().toISOString()
      }, { merge: true });
    
    console.log('✅ Updated sync metadata');
  } catch (error) {
    console.error('Error updating sync metadata:', error);
  }
}

/**
 * Sync student journey (goals + reflections combined)
 */
async function syncStudentJourney(sheets, since) {
  console.log('\n📊 Syncing student journey (goals + reflections)...');
  
  try {
    // Step 1: Fetch lookup data
    console.log('📚 Loading lookup data...');
    const [studentsSnap, phasesSnap, topicsSnap, existingData] = await Promise.all([
      db.collection('users').get(),
      db.collection('phases').get(),
      db.collection('topics').get(),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Student Journey!A:V'
      }).catch(() => ({ data: { values: [] } }))
    ]);

    // Build lookup maps
    const studentsMap = new Map();
    studentsSnap.forEach(doc => {
      const data = doc.data();
      studentsMap.set(doc.id, {
        name: data.name || 'Unknown',
        campus: data.campus || '',
        house: data.house || ''
      });
    });

    const phasesMap = new Map();
    phasesSnap.forEach(doc => {
      const data = doc.data();
      phasesMap.set(doc.id, data.name || 'Unknown Phase');
    });

    const topicsMap = new Map();
    topicsSnap.forEach(doc => {
      const data = doc.data();
      topicsMap.set(doc.id, data.title || 'Unknown Topic');
    });

    // Build existing hashes set for deduplication
    const existingHashes = new Set();
    if (existingData.data.values && existingData.data.values.length > 1) {
      existingData.data.values.slice(1).forEach(row => {
        if (row[21]) { // Hash column (V)
          existingHashes.add(row[21]);
        }
      });
    }
    console.log(`📋 Found ${existingHashes.size} existing records`);

    // Step 2: Fetch goals
    let goalsQuery = db.collection('daily_goals');
    if (since && since.getTime() > 0) {
      goalsQuery = goalsQuery
        .where('updated_at', '>', admin.firestore.Timestamp.fromDate(since))
        .orderBy('updated_at', 'asc');
    }
    const goalsSnapshot = await goalsQuery.get();
    console.log(`📄 Found ${goalsSnapshot.size} goals`);

    // Step 3: Fetch reflections
    let reflectionsQuery = db.collection('daily_reflections');
    if (since && since.getTime() > 0) {
      reflectionsQuery = reflectionsQuery
        .where('updated_at', '>', admin.firestore.Timestamp.fromDate(since))
        .orderBy('updated_at', 'asc');
    }
    const reflectionsSnapshot = await reflectionsQuery.get();
    console.log(`📄 Found ${reflectionsSnapshot.size} reflections`);

    // Build reflection lookup by goal_id
    const reflectionsByGoalId = new Map();
    reflectionsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.goal_id) {
        reflectionsByGoalId.set(data.goal_id, {
          id: doc.id,
          ...data
        });
      }
    });

    // Step 4: Build rows
    const newRows = [];
    goalsSnapshot.forEach(doc => {
      const goal = doc.data();
      const reflection = reflectionsByGoalId.get(doc.id);
      
      // Generate hash for deduplication
      const hash = `${doc.id}_${reflection?.id || 'NO_REFL'}`;
      
      if (existingHashes.has(hash)) {
        return; // Skip duplicate
      }

      const student = studentsMap.get(goal.student_id) || {};
      const phaseName = phasesMap.get(goal.phase_id) || '';
      const topicName = topicsMap.get(goal.topic_id) || '';
      
      // Calculate week number
      const createdDate = goal.created_at?.toDate();
      const weekNumber = createdDate ? Math.ceil(
        (createdDate - new Date(createdDate.getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000)
      ) : '';

      const answers = reflection?.reflection_answers || {};

      newRows.push([
        // Timeline (A-G)
        createdDate?.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }) || '',
        student.name || '',
        student.campus || '',
        student.house || '',
        phaseName,
        topicName,
        weekNumber,
        
        // Goal data (H-L)
        goal.goal_text || '',
        goal.target_percentage || '',
        goal.status || '',
        goal.reviewed_by || '',
        goal.reviewed_at?.toDate().toLocaleDateString('en-IN') || '',
        
        // Reflection data (M-T)
        answers.workedWell || answers.worked_well || '',
        answers.howAchieved || answers.how_achieved || '',
        answers.keyLearning || answers.key_learning || '',
        answers.challenges || '',
        reflection?.achieved_percentage || '',
        reflection?.status || '',
        reflection?.mentor_assessment || '',
        reflection?.reviewed_by || '',
        
        // IDs (U-V)
        doc.id, // Goal ID
        reflection?.id || '', // Reflection ID
        hash // Sync hash for deduplication
      ]);
    });

    if (newRows.length === 0) {
      console.log('✅ No new records to sync');
      return 0;
    }

    // Step 5: Append to sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Student Journey!A:V',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: newRows }
    });

    console.log(`✅ Synced ${newRows.length} journey records`);
    return newRows.length;
  } catch (error) {
    console.error('❌ Error syncing student journey:', error);
    throw error;
  }
}

// Login sync removed - goal submission itself proves login activity

/**
 * Main sync function
 */
async function main() {
  console.log('🔄 Starting Google Sheets sync...\n');
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`📍 Spreadsheet ID: ${SPREADSHEET_ID}\n`);

  try {
    // Get last sync time
    const lastSync = await getLastSyncTime();

    // Get Google Sheets client
    console.log('🔐 Authenticating with Google Sheets...');
    const sheets = await getGoogleSheetsClient();
    console.log('✅ Authentication successful\n');

    // Sync data
    const stats = {
      journey: await syncStudentJourney(sheets, lastSync)
    };

    // Update metadata
    await updateLastSyncTime(stats);

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ SYNC COMPLETE');
    console.log('='.repeat(50));
    console.log(`Journey records synced: ${stats.journey}`);
    console.log('='.repeat(50) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ SYNC FAILED');
    console.error('='.repeat(50));
    console.error(error);
    console.error('='.repeat(50) + '\n');

    // Update metadata with error
    try {
      await db.collection('system_metadata')
        .doc('sheets_sync')
        .set({
          last_sync_status: 'failed',
          last_error: error.message,
          last_error_time: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (metaError) {
      console.error('Failed to update error metadata:', metaError);
    }

    process.exit(1);
  }
}

// Run the script
main();
