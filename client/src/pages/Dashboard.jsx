import { useState, useEffect } from 'react';
import { teamsApi, tasksApi, insightsApi } from '../utils/api';
import TaskCompletionChart from '../components/TaskCompletionChart';
import TeamActivityWidget from '../components/TeamActivityWidget';
import InsightsPanel from '../components/InsightsPanel';
import wsClient from '../utils/websocket';

function Dashboard() {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load teams on mount
  useEffect(() => {
    loadTeams();
    
    // Connect to WebSocket
    wsClient.connect();
    
    // Listen for real-time updates
    wsClient.on('task_created', handleTaskUpdate);
    wsClient.on('task_updated', handleTaskUpdate);
    wsClient.on('task_deleted', handleTaskDelete);
    
    return () => {
      wsClient.off('task_created', handleTaskUpdate);
      wsClient.off('task_updated', handleTaskUpdate);
      wsClient.off('task_deleted', handleTaskDelete);
    };
  }, []);

  // Load tasks when team is selected
  useEffect(() => {
    if (selectedTeam) {
      loadTasks(selectedTeam.id);
      loadInsights(selectedTeam.id);
    }
  }, [selectedTeam]);

  const loadTeams = async () => {
    try {
      const response = await teamsApi.getAll();
      const teamsList = response.data.teams || [];
      setTeams(teamsList);
      if (teamsList.length > 0) {
        setSelectedTeam(teamsList[0]);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error loading teams:', err);
      setError('Failed to load teams');
      setLoading(false);
    }
  };

  const loadTasks = async (teamId) => {
    try {
      const response = await tasksApi.getAll(teamId);
      setTasks(response.data.tasks || []);
    } catch (err) {
      console.error('Error loading tasks:', err);
    }
  };

  const loadInsights = async (teamId) => {
    try {
      const response = await insightsApi.generate(teamId);
      setInsights(response.data);
    } catch (err) {
      console.error('Error loading insights:', err);
    }
  };

  const handleTaskUpdate = (data) => {
    if (data.task && selectedTeam && data.task.teamId === selectedTeam.id) {
      loadTasks(selectedTeam.id);
      loadInsights(selectedTeam.id);
    }
  };

  const handleTaskDelete = (data) => {
    if (data.taskId && selectedTeam) {
      loadTasks(selectedTeam.id);
      loadInsights(selectedTeam.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">TeamPulse</h1>
              <p className="text-sm text-gray-500">Real-Time Team Productivity Dashboard</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedTeam?.id || ''}
                onChange={(e) => {
                  const team = teams.find(t => t.id === e.target.value);
                  setSelectedTeam(team);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedTeam ? (
          <div className="space-y-6">
            {/* AI Insights Panel */}
            {insights && (
              <InsightsPanel insights={insights} />
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Tasks</h3>
                <p className="text-3xl font-bold text-gray-900">{tasks.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Completed</h3>
                <p className="text-3xl font-bold text-green-600">
                  {tasks.filter(t => t.status === 'completed').length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">In Progress</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {tasks.filter(t => t.status === 'in-progress').length}
                </p>
              </div>
            </div>

            {/* Charts and Widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TaskCompletionChart tasks={tasks} />
              <TeamActivityWidget teamId={selectedTeam.id} />
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No teams available. Create a team to get started.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
