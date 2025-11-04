const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getDb } = require('../firebase');

/**
 * POST /api/insights
 * Generate AI-powered insights about team performance
 * 
 * This endpoint analyzes team data and uses OpenAI to generate
 * summaries and recommendations about productivity and workload balance
 */
router.post('/', async (req, res) => {
  try {
    const { teamId } = req.body;

    if (!teamId) {
      return res.status(400).json({ error: 'teamId is required' });
    }

    // Fetch team data
    const db = getDb();
    let teamData, tasks, activities;

    if (!db) {
      // Mock data for development without Firebase
      teamData = {
        name: 'Engineering Team',
        members: ['alice', 'bob', 'charlie'],
      };
      tasks = [
        { status: 'completed', assignee: 'alice', title: 'Implement auth' },
        { status: 'completed', assignee: 'alice', title: 'Design UI' },
        { status: 'in-progress', assignee: 'bob', title: 'Setup database' },
        { status: 'todo', assignee: 'charlie', title: 'Write tests' },
      ];
      activities = [
        { userId: 'alice', type: 'task_completed' },
        { userId: 'alice', type: 'task_completed' },
        { userId: 'bob', type: 'status_change', status: 'online' },
      ];
    } else {
      // Fetch real data from Firebase
      const teamDoc = await db.collection('teams').doc(teamId).get();
      if (!teamDoc.exists) {
        return res.status(404).json({ error: 'Team not found' });
      }
      teamData = teamDoc.data();

      const tasksSnapshot = await db.collection('tasks')
        .where('teamId', '==', teamId)
        .get();
      tasks = tasksSnapshot.docs.map(doc => doc.data());

      const activitiesSnapshot = await db.collection('activities')
        .where('teamId', '==', teamId)
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();
      activities = activitiesSnapshot.docs.map(doc => doc.data());
    }

    // Calculate statistics
    const stats = calculateTeamStats(teamData, tasks, activities);

    // Generate AI insights using OpenAI (if API key is configured)
    let aiInsight = null;
    const openAiKey = process.env.OPENAI_API_KEY;

    if (openAiKey && openAiKey !== 'your-openai-api-key-here') {
      try {
        aiInsight = await generateAIInsight(stats, openAiKey);
      } catch (error) {
        console.error('Error generating AI insight:', error.message);
        // Continue without AI insight
      }
    }

    // Generate fallback insight if AI is not available
    const insight = aiInsight || generateFallbackInsight(stats);

    res.json({
      teamId,
      teamName: teamData.name,
      stats,
      insight,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

/**
 * Calculate team statistics from data
 */
function calculateTeamStats(teamData, tasks, activities) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;
  const completionRate = totalTasks > 0 ? 
    Math.round((completedTasks / totalTasks) * 100) : 0;

  // Task distribution by member
  const tasksByMember = {};
  tasks.forEach(task => {
    const assignee = task.assignee || 'unassigned';
    if (!tasksByMember[assignee]) {
      tasksByMember[assignee] = { total: 0, completed: 0 };
    }
    tasksByMember[assignee].total++;
    if (task.status === 'completed') {
      tasksByMember[assignee].completed++;
    }
  });

  // Activity summary
  const recentActivities = activities.slice(0, 20);
  const activityTypes = {};
  recentActivities.forEach(activity => {
    activityTypes[activity.type] = (activityTypes[activity.type] || 0) + 1;
  });

  // Active users in last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const activeUsers = new Set(
    activities
      .filter(a => a.timestamp > oneDayAgo)
      .map(a => a.userId)
  );

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    todoTasks,
    completionRate,
    tasksByMember,
    activeUsersCount: activeUsers.size,
    totalMembers: teamData.members?.length || 0,
    activityTypes,
  };
}

/**
 * Generate AI-powered insight using OpenAI API
 */
async function generateAIInsight(stats, apiKey) {
  const prompt = `
Analyze the following team productivity data and provide a brief, actionable insight (2-3 sentences):

Team Statistics:
- Total Tasks: ${stats.totalTasks}
- Completed: ${stats.completedTasks} (${stats.completionRate}%)
- In Progress: ${stats.inProgressTasks}
- Todo: ${stats.todoTasks}
- Active Members: ${stats.activeUsersCount}/${stats.totalMembers}

Task Distribution:
${Object.entries(stats.tasksByMember).map(([member, data]) => 
    `- ${member}: ${data.completed}/${data.total} completed`
  ).join('\n')}

Provide insights about team performance, workload balance, and actionable recommendations.
  `.trim();

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a team productivity analyst. Provide concise, actionable insights.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.choices[0].message.content.trim();
}

/**
 * Generate a fallback insight when AI is not available
 */
function generateFallbackInsight(stats) {
  const insights = [];

  // Completion rate insight
  if (stats.completionRate >= 80) {
    insights.push(`Excellent progress! The team has completed ${stats.completionRate}% of tasks.`);
  } else if (stats.completionRate >= 50) {
    insights.push(`Good momentum with ${stats.completionRate}% task completion rate.`);
  } else {
    insights.push(`The team has ${stats.completionRate}% completion rate. Consider reviewing task priorities.`);
  }

  // Workload balance insight
  const taskCounts = Object.values(stats.tasksByMember).map(m => m.total);
  if (taskCounts.length > 1) {
    const max = Math.max(...taskCounts);
    const min = Math.min(...taskCounts);
    if (max - min > 3) {
      insights.push('Task distribution is uneven. Consider balancing workload across team members.');
    } else {
      insights.push('Task distribution is well balanced across the team.');
    }
  }

  // Activity insight
  if (stats.activeUsersCount < stats.totalMembers * 0.5) {
    insights.push(`Only ${stats.activeUsersCount} of ${stats.totalMembers} members were active recently.`);
  } else {
    insights.push(`Strong team engagement with ${stats.activeUsersCount} active members.`);
  }

  return insights.join(' ');
}

module.exports = router;
