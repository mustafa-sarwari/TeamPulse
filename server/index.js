const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const { initFirebase } = require('./firebase');
const websocket = require('./ws');
const teamRoutes = require('./routes/team');
const taskRoutes = require('./routes/task');
const activityRoutes = require('./routes/activity');
const insightsRoutes = require('./routes/insights');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/teams', teamRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/insights', insightsRoutes);

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Create HTTP server and attach WebSocket server
const server = http.createServer(app);
websocket.attach(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, async () => {
  await initFirebase();
  console.log(`Server listening on port ${PORT}`);
});
