// server/insights.js
// OpenAI-powered insight generator for TeamPulse.
// - Aggregates completed tasks and user activity for a given date (YYYY-MM-DD).
// - Calls OpenAI to generate a concise summary and 3 actionable recommendations (high/medium/low).
//
// Environment variables required:
// - OPENAI_API_KEY: Your OpenAI API key

const { getFirestore } = require('./firebase');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate daily insights for team performance
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string|null} teamId - Optional team ID to scope insights
 * @returns {Promise<Object>} Insight object with summary and recommendations
 */
async function generateDailyInsights(date, teamId = null) {
  try {
    const db = getFirestore();
    const targetDate = new Date(date);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Fetch tasks for the date
    let tasksQuery = db.collection('tasks');
    if (teamId) {
      tasksQuery = tasksQuery.where('teamId', '==', teamId);
    }

    const tasksSnapshot = await tasksQuery.get();
    const allTasks = tasksSnapshot.docs.map(doc => doc.data());

    // Filter tasks created or completed on the target date
    const dayTasks = allTasks.filter(task => {
      const createdAt = task.createdAt?.toDate?.() || new Date(task.createdAt);
      const completedAt = task.completedAt?.toDate?.() || null;
      return (
        (createdAt >= targetDate && createdAt < nextDate) ||
        (completedAt && completedAt >= targetDate && completedAt < nextDate)
      );
    });

    const completedTasks = dayTasks.filter(t => t.status === 'completed');
    const pendingTasks = dayTasks.filter(t => t.status !== 'completed');

    // Aggregate per-user stats
    const userStats = {};
    dayTasks.forEach(task => {
      const userId = task.assignedTo || 'Unassigned';
      if (!userStats[userId]) {
        userStats[userId] = { total: 0, completed: 0 };
      }
      userStats[userId].total++;
      if (task.status === 'completed') {
        userStats[userId].completed++;
      }
    });

    // Prepare data summary for OpenAI
    const dataSummary = {
      date,
      totalTasks: dayTasks.length,
      completedTasks: completedTasks.length,
      pendingTasks: pendingTasks.length,
      completionRate:
        dayTasks.length > 0 ? ((completedTasks.length / dayTasks.length) * 100).toFixed(1) : 0,
      userStats: Object.entries(userStats).map(([userId, stats]) => ({
        user: userId,
        total: stats.total,
        completed: stats.completed,
        rate: stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0,
      })),
    };

    // Generate AI insights using OpenAI
    const prompt = `You are a team productivity analyst. Analyze the following daily team performance data and provide:
1. A concise 2-3 sentence summary of the day's performance
2. Three actionable recommendations (one high priority, one medium, one low) to improve team productivity and workload balance

Data for ${date}:
- Total tasks: ${dataSummary.totalTasks}
- Completed: ${dataSummary.completedTasks}
- Pending: ${dataSummary.pendingTasks}
- Overall completion rate: ${dataSummary.completionRate}%

Per-user breakdown:
${dataSummary.userStats.map(u => `  - ${u.user}: ${u.completed}/${u.total} tasks (${u.rate}%)`).join('\n')}

Provide your response in JSON format:
{
  "summary": "Brief summary here",
  "recommendations": [
    { "priority": "high", "text": "High priority recommendation" },
    { "priority": "medium", "text": "Medium priority recommendation" },
    { "priority": "low", "text": "Low priority recommendation" }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful team productivity analyst. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const aiResponse = completion.choices[0].message.content.trim();
    let insights;

    try {
      // Try to parse JSON response
      insights = JSON.parse(aiResponse);
    } catch (parseError) {
      // Fallback if AI doesn't return valid JSON
      console.warn('Failed to parse AI response as JSON, using fallback');
      insights = {
        summary: aiResponse.substring(0, 200),
        recommendations: [
          { priority: 'high', text: 'Review task distribution across team members' },
          { priority: 'medium', text: 'Set clearer deadlines for pending tasks' },
          { priority: 'low', text: 'Consider team check-in meetings' },
        ],
      };
    }

    // Store insights in Firestore
    const insightDoc = {
      date,
      teamId: teamId || null,
      data: dataSummary,
      summary: insights.summary,
      recommendations: insights.recommendations,
      generatedAt: new Date(),
    };

    const insightRef = await db.collection('insights').add(insightDoc);

    return { id: insightRef.id, ...insightDoc };
  } catch (error) {
    console.error('Error generating insights:', error);
    throw error;
  }
}

module.exports = { generateDailyInsights };
