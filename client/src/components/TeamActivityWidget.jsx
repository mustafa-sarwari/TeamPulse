import { useState, useEffect } from 'react';
import { activitiesApi } from '../utils/api';
import wsClient from '../utils/websocket';

function TeamActivityWidget({ teamId }) {
  const [activities, setActivities] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
    loadStatuses();

    // Listen for real-time activity updates
    wsClient.on('activity_logged', handleActivityUpdate);

    return () => {
      wsClient.off('activity_logged', handleActivityUpdate);
    };
  }, [teamId]);

  const loadActivities = async () => {
    try {
      const response = await activitiesApi.getAll(teamId);
      setActivities(response.data.activities || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading activities:', error);
      setLoading(false);
    }
  };

  const loadStatuses = async () => {
    try {
      const response = await activitiesApi.getStatus(teamId);
      setStatuses(response.data.statuses || []);
    } catch (error) {
      console.error('Error loading statuses:', error);
    }
  };

  const handleActivityUpdate = (data) => {
    if (data.activity && data.activity.teamId === teamId) {
      loadActivities();
      loadStatuses();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
    case 'online':
      return 'bg-green-500';
    case 'away':
      return 'bg-yellow-500';
    case 'offline':
      return 'bg-gray-400';
    default:
      return 'bg-gray-300';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
    case 'task_completed':
      return '✅';
    case 'task_created':
      return '➕';
    case 'status_change':
      return '🔄';
    default:
      return '📌';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Activity</h2>

      {/* Online Status */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Team Members</h3>
        <div className="space-y-2">
          {statuses.length > 0 ? (
            statuses.map((member) => (
              <div key={member.userId} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(member.status)}`}></div>
                  <span className="text-sm font-medium text-gray-700">{member.userName}</span>
                </div>
                <span className="text-xs text-gray-500 capitalize">{member.status}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No team members online</p>
          )}
        </div>
      </div>

      {/* Recent Activities */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Activity</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {activities.length > 0 ? (
            activities.slice(0, 10).map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 text-sm">
                <span className="text-lg">{getActivityIcon(activity.type)}</span>
                <div className="flex-1">
                  <p className="text-gray-700">
                    <span className="font-medium">{activity.userName}</span>
                    {activity.type === 'task_completed' && ' completed '}
                    {activity.type === 'task_created' && ' created '}
                    {activity.type === 'status_change' && ` is now ${activity.status}`}
                    {activity.taskTitle && (
                      <span className="text-gray-600"> "{activity.taskTitle}"</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">{formatTimestamp(activity.timestamp)}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No recent activities</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamActivityWidget;
