// server/firebase.js
// Initialize Firebase Admin SDK and export Firestore instance.
// Expects GOOGLE_APPLICATION_CREDENTIALS env var or uses a service account JSON at server/firebaseServiceAccount.json

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let db = null;

async function initFirebase() {
  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      console.log('Firebase already initialized');
      return;
    }

    // Try to load service account from file or environment variable
    let serviceAccount = null;
    const serviceAccountPath = path.join(__dirname, 'firebaseServiceAccount.json');

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('Using GOOGLE_APPLICATION_CREDENTIALS from environment');
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    } else if (fs.existsSync(serviceAccountPath)) {
      console.log('Using service account from firebaseServiceAccount.json');
      serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      console.warn(
        'No Firebase credentials found. Please set GOOGLE_APPLICATION_CREDENTIALS or add firebaseServiceAccount.json'
      );
      // Initialize without credentials for development (will fail on Firestore access)
      admin.initializeApp();
    }

    db = admin.firestore();
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase:', error.message);
    throw error;
  }
}

function getFirestore() {
  if (!db) {
    throw new Error('Firestore not initialized. Call initFirebase() first.');
  }
  return db;
}

module.exports = { initFirebase, getFirestore };
