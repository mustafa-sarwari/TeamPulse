// client/src/components/Dashboard.jsx
// Dashboard component: shows user presence (online/offline/away), and task progress per user.
// Uses Firestore snapshot listeners for real-time updates.
//
// Assumptions about Firestore data model:
// - Collection "userActivities": doc id = uid, fields { uid, status, lastActiveAt, meta }
// - Collection "tasks": doc id = taskId, fields { title, status, assignedTo, teamId, createdAt }

import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, where } from '../firebase';
import './Dashboard.css';

export default function Dashboard({ teamId }) {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to user activities
    const unsubActivities = onSnapshot(collection(db, 'userActivities'), snapshot => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
      setLoading(false);
    });

    // Subscribe to tasks (optionally filtered by teamId)
    let tasksQuery = collection(db, 'tasks');
    if (teamId) {
      tasksQuery = query(tasksQuery, where('teamId', '==', teamId));
    }

    const unsubTasks = onSnapshot(tasksQuery, snapshot => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(tasksData);
    });

    return () => {
      unsubActivities();
      unsubTasks();
    };
  }, [teamId]);

  // Calculate task progress per user
  const getUserProgress = userId => {
    const userTasks = tasks.filter(t => t.assignedTo === userId);
    const completed = userTasks.filter(t => t.status === 'completed').length;
    const total = userTasks.length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  // Get status badge color
  const getStatusColor = status => {
    switch (status) {
      case 'online':
        return '#4caf50';
      case 'away':
        return '#ff9800';
      case 'offline':
      default:
        return '#9e9e9e';
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      {users.length === 0 ? (
        <div className="dashboard-empty">No user activity data available</div>
      ) : (
        <div className="users-grid">
          {users.map(user => {
            const progress = getUserProgress(user.uid || user.id);
            return (
              <div key={user.id} className="user-card">
                <div className="user-header">
                  <div
                    className="status-indicator"
                    style={{ backgroundColor: getStatusColor(user.status) }}
                  />
                  <h3 className="user-name">{user.displayName || user.uid || 'Anonymous'}</h3>
                </div>
                <div className="user-status">
                  <span className="status-text">{user.status || 'offline'}</span>
                  {user.lastActiveAt && (
                    <span className="last-active">
                      Last active:{' '}
                      {new Date(user.lastActiveAt.toDate?.() || user.lastActiveAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="task-progress">
                  <div className="progress-header">
                    <span>Tasks</span>
                    <span>
                      {progress.completed} / {progress.total}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                  <div className="progress-percentage">{progress.percentage.toFixed(0)}%</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
