const express = require('express');
const router = express.Router();
const { getDb } = require('../firebase');

/**
 * GET /api/teams
 * Get all teams
 */
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    
    if (!db) {
      // Mock data for development without Firebase
      return res.json({
        teams: [
          {
            id: 'team-1',
            name: 'Engineering Team',
            description: 'Core development team',
            members: ['alice', 'bob', 'charlie'],
            createdAt: new Date().toISOString(),
          },
          {
            id: 'team-2',
            name: 'Design Team',
            description: 'Product design team',
            members: ['diana', 'eve'],
            createdAt: new Date().toISOString(),
          },
        ],
      });
    }

    const snapshot = await db.collection('teams').get();
    const teams = [];
    snapshot.forEach(doc => {
      teams.push({ id: doc.id, ...doc.data() });
    });

    res.json({ teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

/**
 * POST /api/teams
 * Create a new team
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, members } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const teamData = {
      name,
      description: description || '',
      members: members || [],
      createdAt: new Date().toISOString(),
    };

    const db = getDb();
    
    if (!db) {
      // Mock response for development
      return res.status(201).json({
        id: 'team-' + Date.now(),
        ...teamData,
      });
    }

    const docRef = await db.collection('teams').add(teamData);
    
    res.status(201).json({
      id: docRef.id,
      ...teamData,
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

/**
 * GET /api/teams/:id
 * Get a specific team by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    
    if (!db) {
      // Mock response
      return res.json({
        id,
        name: 'Engineering Team',
        description: 'Core development team',
        members: ['alice', 'bob', 'charlie'],
        createdAt: new Date().toISOString(),
      });
    }

    const doc = await db.collection('teams').doc(id).get();
    
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
