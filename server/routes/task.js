const express = require('express');
const router = express.Router();
const { getDb } = require('../firebase');
const { broadcast } = require('../ws');

/**
 * GET /api/tasks
 * Get all tasks
 */
router.get('/', async (req, res) => {
  try {
    const { teamId } = req.query;
    const db = getDb();
    
    if (!db) {
      // Mock data for development
      return res.json({
        tasks: [
          {
            id: 'task-1',
            title: 'Implement authentication',
            description: 'Add user login and registration',
            status: 'in-progress',
            assignee: 'alice',
            teamId: 'team-1',
            priority: 'high',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'task-2',
            title: 'Design dashboard UI',
            description: 'Create wireframes and mockups',
            status: 'completed',
            assignee: 'diana',
            teamId: 'team-2',
            priority: 'medium',
            createdAt: new Date().toISOString(),
          },
        ],
      });
    }

    let query = db.collection('tasks');
    if (teamId) {
      query = query.where('teamId', '==', teamId);
    }

    const snapshot = await query.get();
    const tasks = [];
    snapshot.forEach(doc => {
      tasks.push({ id: doc.id, ...doc.data() });
    });

    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

/**
 * POST /api/tasks
 * Create a new task
 */
router.post('/', async (req, res) => {
  try {
    const { title, description, assignee, teamId, priority } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const taskData = {
      title,
      description: description || '',
      status: 'todo',
      assignee: assignee || null,
      teamId: teamId || null,
      priority: priority || 'medium',
      createdAt: new Date().toISOString(),
    };

    const db = getDb();
    
    if (!db) {
      // Mock response
      const newTask = {
        id: 'task-' + Date.now(),
        ...taskData,
      };
      
      // Broadcast to WebSocket clients
      broadcast({ type: 'task_created', task: newTask });
      
      return res.status(201).json(newTask);
    }

    const docRef = await db.collection('tasks').add(taskData);
    const newTask = {
      id: docRef.id,
      ...taskData,
    };
    
    // Broadcast to WebSocket clients
    broadcast({ type: 'task_created', task: newTask });
    
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

/**
 * PUT /api/tasks/:id
 * Update a task
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const db = getDb();
    
    if (!db) {
      // Mock response
      const updatedTask = {
        id,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      // Broadcast to WebSocket clients
      broadcast({ type: 'task_updated', task: updatedTask });
      
      return res.json(updatedTask);
    }

    await db.collection('tasks').doc(id).update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    const doc = await db.collection('tasks').doc(id).get();
    const updatedTask = { id: doc.id, ...doc.data() };
    
    // Broadcast to WebSocket clients
    broadcast({ type: 'task_updated', task: updatedTask });
    
    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete a task
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    
    if (!db) {
      // Mock response
      broadcast({ type: 'task_deleted', taskId: id });
      return res.json({ success: true, id });
    }

    await db.collection('tasks').doc(id).delete();
    
    // Broadcast to WebSocket clients
    broadcast({ type: 'task_deleted', taskId: id });
    
    res.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
