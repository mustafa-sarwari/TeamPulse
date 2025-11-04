const express = require('express');
const router = express.Router();
const { getDb } = require('../firebase');
const { broadcast } = require('../ws');

/**
 * GET /api/activities
 * Get recent team activities
 */
router.get('/', async (req, res) => {
  try {
    const { teamId, limit = 50 } = req.query;
    const db = getDb();
    
    if (!db) {
      // Mock data for development
      return res.json({
        activities: [
          {
            id: 'activity-1',
            userId: 'alice',
            userName: 'Alice Johnson',
            type: 'status_change',
            status: 'online',
            teamId: 'team-1',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'activity-2',
            userId: 'bob',
            userName: 'Bob Smith',
            type: 'task_completed',
            taskId: 'task-5',
            taskTitle: 'Fix login bug',
            teamId: 'team-1',
            timestamp: new Date(Date.now() - 300000).toISOString(),
          },
          {
            id: 'activity-3',
            userId: 'charlie',
            userName: 'Charlie Brown',
            type: 'status_change',
            status: 'away',
            teamId: 'team-1',
            timestamp: new Date(Date.now() - 600000).toISOString(),
          },
        ],
      });
    }

    let query = db.collection('activities')
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit));
    
    if (teamId) {
      query = query.where('teamId', '==', teamId);
    }

    const snapshot = await query.get();
    const activities = [];
    snapshot.forEach(doc => {
      activities.push({ id: doc.id, ...doc.data() });
    });

    res.json({ activities });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

/**
 * POST /api/activities
 * Log a new activity
 */
router.post('/', async (req, res) => {
  try {
    const { userId, userName, type, teamId, status, taskId, taskTitle } = req.body;

    if (!userId || !type || !teamId) {
      return res.status(400).json({ 
        error: 'userId, type, and teamId are required' 
      });
    }

    const activityData = {
      userId,
      userName: userName || 'Unknown User',
      type,
      teamId,
      timestamp: new Date().toISOString(),
      ...(status && { status }),
      ...(taskId && { taskId }),
      ...(taskTitle && { taskTitle }),
    };

    const db = getDb();
    
    if (!db) {
      // Mock response
      const newActivity = {
        id: 'activity-' + Date.now(),
        ...activityData,
      };
      
      // Broadcast to WebSocket clients
      broadcast({ type: 'activity_logged', activity: newActivity });
      
      return res.status(201).json(newActivity);
    }

    const docRef = await db.collection('activities').add(activityData);
    const newActivity = {
      id: docRef.id,
      ...activityData,
    };
    
    // Broadcast to WebSocket clients
    broadcast({ type: 'activity_logged', activity: newActivity });
    
    res.status(201).json(newActivity);
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

/**
 * GET /api/activities/status
 * Get current status of all team members
 */
router.get('/status', async (req, res) => {
  try {
    const { teamId } = req.query;
    const db = getDb();
    
    if (!db) {
      // Mock data for development
      return res.json({
        statuses: [
          { userId: 'alice', userName: 'Alice Johnson', status: 'online', lastActive: new Date().toISOString() },
          { userId: 'bob', userName: 'Bob Smith', status: 'online', lastActive: new Date().toISOString() },
          { userId: 'charlie', userName: 'Charlie Brown', status: 'away', lastActive: new Date(Date.now() - 600000).toISOString() },
        ],
      });
    }

    // Get latest status activity for each user in the team
    let query = db.collection('activities')
      .where('type', '==', 'status_change')
      .orderBy('timestamp', 'desc');
    
    if (teamId) {
      query = query.where('teamId', '==', teamId);
    }

    const snapshot = await query.get();
    const statusMap = new Map();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!statusMap.has(data.userId)) {
        statusMap.set(data.userId, {
          userId: data.userId,
          userName: data.userName,
          status: data.status,
          lastActive: data.timestamp,
        });
      }
    });

    res.json({ statuses: Array.from(statusMap.values()) });
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

module.exports = router;
