function InsightsPanel({ insights }) {
  if (!insights) return null;

  const { teamName, stats, insight, timestamp } = insights;

  return (
    <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg shadow-lg p-6 border border-primary-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-primary-600 text-white rounded-full p-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI Insights</h2>
            <p className="text-sm text-gray-600">{teamName}</p>
          </div>
        </div>
        <span className="text-xs text-gray-500">
          {new Date(timestamp).toLocaleTimeString()}
        </span>
      </div>

      {/* Main Insight Text */}
      <div className="bg-white rounded-lg p-4 mb-4">
        <p className="text-gray-700 leading-relaxed">{insight}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-primary-600">{stats.completionRate}%</p>
          <p className="text-xs text-gray-500">Completion Rate</p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.completedTasks}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.inProgressTasks}</p>
          <p className="text-xs text-gray-500">In Progress</p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-600">
            {stats.activeUsersCount}/{stats.totalMembers}
          </p>
          <p className="text-xs text-gray-500">Active Members</p>
        </div>
      </div>
    </div>
  );
}

export default InsightsPanel;
