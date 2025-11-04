// server/routes/insights.js
// Express route to trigger or fetch generated insights.
// POST /api/insights/daily
//   Body: { teamId?: string, date?: 'YYYY-MM-DD', preview?: boolean }
//   If preview is true, generates insights but does not persist (still returns result).
// GET /api/insights/daily
//   Query: { teamId?: string, date?: 'YYYY-MM-DD' }

const express = require('express');
const { generateDailyInsights } = require('../insights');
const { getFirestore } = require('../firebase');

const router = express.Router();

// Generate daily insights
router.post('/daily', async (req, res) => {
  try {
    const { date, teamId, preview } = req.body;

    // Default to today if no date provided
    const targetDate = date || new Date().toISOString().split('T')[0];

    if (preview) {
      // Generate but don't persist (for testing)
      const insights = await generateDailyInsights(targetDate, teamId || null);
      return res.json({ ...insights, preview: true });
    }

    const insights = await generateDailyInsights(targetDate, teamId || null);
    res.json(insights);
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ error: 'Failed to generate insights', message: error.message });
  }
});

// Get stored insights
router.get('/daily', async (req, res) => {
  try {
    const { date, teamId } = req.query;
    const db = getFirestore();

    let query = db.collection('insights');

    if (date) {
      query = query.where('date', '==', date);
    }
    if (teamId) {
      query = query.where('teamId', '==', teamId);
    }

    const snapshot = await query.orderBy('generatedAt', 'desc').limit(10).get();
    const insights = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json(insights);
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

module.exports = router;
