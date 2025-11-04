const admin = require('firebase-admin');
require('dotenv').config();

let db = null;

/**
 * Initialize Firebase Admin SDK
 * Uses firebaseServiceAccount.json if available, otherwise uses environment variables
 */
async function initFirebase() {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      console.log('✅ Firebase already initialized');
      db = admin.firestore();
      return;
    }

    // Try to load service account from file (not committed to repo)
    let serviceAccount;
    try {
      serviceAccount = require('./firebaseServiceAccount.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
      console.log('✅ Firebase initialized with service account file');
    } catch (error) {
      // Fallback to environment variables (for production)
      if (process.env.FIREBASE_PROJECT_ID) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
        console.log('✅ Firebase initialized with environment variables');
      } else {
        console.warn('⚠️  Firebase not configured - using mock mode');
        // In development without Firebase, we'll use in-memory storage
        return;
      }
    }

    db = admin.firestore();
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error.message);
    console.log('ℹ️  Running in mock mode without Firebase');
  }
}

/**
 * Get Firestore database instance
 */
function getDb() {
  return db;
}

module.exports = {
  initFirebase,
  getDb,
  admin,
};
