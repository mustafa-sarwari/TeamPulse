// server/routes/activity.js
// Routes for updating user activity (presence / lastActive)

const express = require('express');
const { getFirestore } = require('../firebase');
const { broadcast } = require('../ws');

const router = express.Router();

// Update user activity
router.post('/', async (req, res) => {
  try {
    const { uid, status, displayName, meta } = req.body;

    if (!uid) {
      return res.status(400).json({ error: 'User ID (uid) is required' });
    }

    const db = getFirestore();
    const activityData = {
      uid,
      status: status || 'online',
      displayName: displayName || uid,
      lastActiveAt: new Date(),
      meta: meta || {},
      updatedAt: new Date(),
    };

    // Use uid as document ID for easy lookups
    await db.collection('userActivities').doc(uid).set(activityData, { merge: true });

    // Broadcast activity update event
    broadcast({ type: 'activity.updated', payload: activityData });

    res.json(activityData);
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

// Get all user activities
router.get('/', async (req, res) => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('userActivities').get();
    const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Get a specific user's activity
router.get('/:uid', async (req, res) => {
  try {
    const db = getFirestore();
    const doc = await db.collection('userActivities').doc(req.params.uid).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'User activity not found' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

module.exports = router;
