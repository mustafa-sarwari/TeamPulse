// server/routes/team.js
// Routes for team creation and retrieval

const express = require('express');
const { getFirestore } = require('../firebase');
const { broadcast } = require('../ws');

const router = express.Router();

// Create a new team
router.post('/', async (req, res) => {
  try {
    const { name, description, members } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const db = getFirestore();
    const teamData = {
      name,
      description: description || '',
      members: members || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const teamRef = await db.collection('teams').add(teamData);
    const team = { id: teamRef.id, ...teamData };

    // Broadcast team creation event
    broadcast({ type: 'team.created', payload: team });

    res.status(201).json(team);
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Get all teams
router.get('/', async (req, res) => {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('teams').get();
    const teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get a specific team
router.get('/:id', async (req, res) => {
  try {
    const db = getFirestore();
    const doc = await db.collection('teams').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

module.exports = router;
