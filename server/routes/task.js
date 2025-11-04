// server/routes/task.js
// Routes for task creation and basic updates

const express = require('express');
const { getFirestore } = require('../firebase');
const { broadcast } = require('../ws');

const router = express.Router();

// Create a new task
router.post('/', async (req, res) => {
  try {
    const { title, description, assignedTo, teamId, status } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const db = getFirestore();
    const taskData = {
      title,
      description: description || '',
      assignedTo: assignedTo || null,
      teamId: teamId || null,
      status: status || 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const taskRef = await db.collection('tasks').add(taskData);
    const task = { id: taskRef.id, ...taskData };

    // Broadcast task creation event
    broadcast({ type: 'task.created', payload: task });

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Get all tasks (optionally filter by teamId or assignedTo)
router.get('/', async (req, res) => {
  try {
    const { teamId, assignedTo } = req.query;
    const db = getFirestore();
    let query = db.collection('tasks');

    if (teamId) {
      query = query.where('teamId', '==', teamId);
    }
    if (assignedTo) {
      query = query.where('assignedTo', '==', assignedTo);
    }

    const snapshot = await query.get();
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Update a task
router.patch('/:id', async (req, res) => {
  try {
    const { status, title, description, assignedTo } = req.body;
    const db = getFirestore();

    const updateData = { updatedAt: new Date() };
    if (status !== undefined) updateData.status = status;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;

    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    await db.collection('tasks').doc(req.params.id).update(updateData);

    const doc = await db.collection('tasks').doc(req.params.id).get();
    const task = { id: doc.id, ...doc.data() };

    // Broadcast task update event
    broadcast({ type: 'task.updated', payload: task });

    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const db = getFirestore();
    await db.collection('tasks').doc(req.params.id).delete();

    // Broadcast task deletion event
    broadcast({ type: 'task.deleted', payload: { id: req.params.id } });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
