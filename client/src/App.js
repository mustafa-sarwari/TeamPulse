import React from 'react';
import Dashboard from './components/Dashboard';
import TaskCharts from './components/TaskCharts';
import './App.css';

export default function App() {
  // You can pass a teamId prop if you want to scope both Dashboard and charts to a single team.
  const teamId = null; // or specify a team ID: 'team-123'

  return (
    <div className="App">
      <header className="App-header">
        <h1>TeamPulse</h1>
        <p>Real-time Team Collaboration & Productivity Tracking</p>
      </header>
      <main className="App-main">
        <section className="dashboard-section">
          <h2>Team Dashboard</h2>
          <Dashboard teamId={teamId} />
        </section>
        <section className="charts-section">
          <h2>Analytics</h2>
          <TaskCharts teamId={teamId} days={7} />
        </section>
      </main>
    </div>
  );
}
