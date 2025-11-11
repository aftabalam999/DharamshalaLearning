#!/usr/bin/env node

/**
 * Initialize Firestore Metadata
 * 
 * Run this once to set up the system_metadata collection
 * This only needs to be run once per Firebase project
 */

const admin = require('firebase-admin');

// Check if running in GitHub Actions or locally
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

// Initialize Firebase
if (isGithubActions) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  // For local testing, use service account file
  try {
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('❌ Error: firebase-service-account.json not found');
    console.error('Please download your Firebase service account key and save it as:');
    console.error('  scripts/firebase-service-account.json');
    console.error('\nTo get your service account key:');
    console.error('1. Go to Firebase Console');
    console.error('2. Project Settings > Service Accounts');
    console.error('3. Click "Generate New Private Key"');
    process.exit(1);
  }
}

const db = admin.firestore();

async function initializeMetadata() {
  console.log('🔄 Initializing Firestore metadata...\n');

  try {
    // Create system_metadata collection
    await db.collection('system_metadata').doc('sheets_sync').set({
      last_sync_time: admin.firestore.Timestamp.fromDate(new Date(0)),
      last_sync_status: 'never',
      goals_synced: 0,
      reflections_synced: 0,
      logins_synced: 0,
      initialized_at: admin.firestore.FieldValue.serverTimestamp(),
      initialized: true
    });

    console.log('✅ Created system_metadata/sheets_sync document');

    // Verify
    const doc = await db.collection('system_metadata').doc('sheets_sync').get();
    console.log('\n📄 Metadata document:');
    console.log(JSON.stringify(doc.data(), null, 2));

    console.log('\n✅ Metadata initialization complete!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error initializing metadata:', error);
    process.exit(1);
  }
}

// Run
initializeMetadata();
