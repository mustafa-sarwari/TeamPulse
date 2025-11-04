// server/ws.js
// Simple WebSocket (ws) server wrapper to broadcast events to connected clients.
// Usage: websocket.attach(httpServer);
// websocket.broadcast({ type: 'team.created', payload: {...} });

const WebSocket = require('ws');

let wss = null;

function attach(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', ws => {
    console.log('New WebSocket client connected');

    ws.on('message', message => {
      console.log('Received message:', message.toString());
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    ws.on('error', error => {
      console.error('WebSocket error:', error);
    });

    // Send welcome message
    ws.send(JSON.stringify({ type: 'connection', message: 'Connected to TeamPulse WebSocket' }));
  });

  console.log('WebSocket server attached');
}

function broadcast(data) {
  if (!wss) {
    console.warn('WebSocket server not initialized');
    return;
  }

  const message = JSON.stringify(data);
  let clientCount = 0;

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      clientCount++;
    }
  });

  console.log(`Broadcast to ${clientCount} clients:`, data.type);
}

module.exports = { attach, broadcast };
