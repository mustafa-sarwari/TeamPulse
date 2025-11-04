// client/src/components/TaskCharts.jsx
// Visualize task completion rates and user productivity over time using Chart.js (react-chartjs-2).
// - Uses Firestore onSnapshot listeners (db from client/src/firebase.js).
// - Renders two charts:
//     1) Task completion rate (percent done) over the last N days.
//     2) User productivity: tasks completed per user over the last N days (stacked/line).
// - Color-coded performance thresholds: red (<50%), amber (50-79%), green (>=80%).

import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, where } from '../firebase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import './TaskCharts.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

export default function TaskCharts({ teamId, days = 7 }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to tasks (optionally filtered by teamId)
    let tasksQuery = collection(db, 'tasks');
    if (teamId) {
      tasksQuery = query(tasksQuery, where('teamId', '==', teamId));
    }

    const unsubscribe = onSnapshot(tasksQuery, snapshot => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(tasksData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [teamId, days]);

  // Generate date labels for the last N days
  const getDateLabels = () => {
    const labels = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    return labels;
  };

  // Calculate completion rate per day
  const getCompletionRateData = () => {
    const labels = getDateLabels();
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      targetDate.setHours(0, 0, 0, 0);

      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayTasks = tasks.filter(task => {
        const taskDate = task.createdAt?.toDate?.() || new Date(task.createdAt);
        return taskDate >= targetDate && taskDate < nextDate;
      });

      const completed = dayTasks.filter(t => t.status === 'completed').length;
      const total = dayTasks.length;
      const rate = total > 0 ? (completed / total) * 100 : 0;
      data.push(rate);
    }

    return { labels, data };
  };

  // Calculate tasks completed per user per day
  const getUserProductivityData = () => {
    const labels = getDateLabels();
    const userMap = {};

    // Aggregate tasks by user and day
    for (let i = days - 1; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      targetDate.setHours(0, 0, 0, 0);

      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayTasks = tasks.filter(task => {
        const completedDate = task.completedAt?.toDate?.() || (task.status === 'completed' ? new Date(task.createdAt) : null);
        return completedDate && completedDate >= targetDate && completedDate < nextDate;
      });

      dayTasks.forEach(task => {
        const userId = task.assignedTo || 'Unassigned';
        if (!userMap[userId]) {
          userMap[userId] = new Array(days).fill(0);
        }
        userMap[userId][days - 1 - i]++;
      });
    }

    return { labels, userMap };
  };

  // Get color based on performance threshold
  const getPerformanceColor = rate => {
    if (rate >= 80) return 'rgba(76, 175, 80, 0.8)'; // Green
    if (rate >= 50) return 'rgba(255, 152, 0, 0.8)'; // Amber
    return 'rgba(244, 67, 54, 0.8)'; // Red
  };

  if (loading) {
    return <div className="charts-loading">Loading charts...</div>;
  }

  const completionData = getCompletionRateData();
  const productivityData = getUserProductivityData();

  // Chart 1: Completion Rate Line Chart
  const completionChartData = {
    labels: completionData.labels,
    datasets: [
      {
        label: 'Completion Rate (%)',
        data: completionData.data,
        borderColor: 'rgba(102, 126, 234, 1)',
        backgroundColor: 'rgba(102, 126, 234, 0.2)',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: completionData.data.map(rate => getPerformanceColor(rate)),
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
      },
    ],
  };

  const completionChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      title: {
        display: true,
        text: `Task Completion Rate - Last ${days} Days`,
        font: { size: 16 },
      },
      tooltip: {
        callbacks: {
          label: context => `${context.parsed.y.toFixed(1)}%`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: value => `${value}%`,
        },
      },
    },
  };

  // Chart 2: User Productivity Bar Chart
  const colors = [
    'rgba(102, 126, 234, 0.8)',
    'rgba(118, 75, 162, 0.8)',
    'rgba(237, 100, 166, 0.8)',
    'rgba(255, 152, 0, 0.8)',
    'rgba(76, 175, 80, 0.8)',
  ];

  const productivityChartData = {
    labels: productivityData.labels,
    datasets: Object.keys(productivityData.userMap).map((userId, idx) => ({
      label: userId,
      data: productivityData.userMap[userId],
      backgroundColor: colors[idx % colors.length],
    })),
  };

  const productivityChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      title: {
        display: true,
        text: `User Productivity - Last ${days} Days`,
        font: { size: 16 },
      },
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div className="task-charts">
      <div className="chart-container">
        <Line data={completionChartData} options={completionChartOptions} />
      </div>
      <div className="chart-container">
        <Bar data={productivityChartData} options={productivityChartOptions} />
      </div>
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: 'rgba(76, 175, 80, 0.8)' }} />
          <span>High Performance (≥80%)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: 'rgba(255, 152, 0, 0.8)' }} />
          <span>Medium Performance (50-79%)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{ backgroundColor: 'rgba(244, 67, 54, 0.8)' }} />
          <span>Low Performance (&lt;50%)</span>
        </div>
      </div>
    </div>
  );
}
