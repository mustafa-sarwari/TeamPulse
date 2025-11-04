const WebSocket = require('ws');

let wss = null;

/**
 * Initialize WebSocket server and attach to HTTP server
 */
function attach(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    console.log('🔌 New WebSocket connection established');

    ws.on('message', (message) => {
      console.log('📨 Received message:', message.toString());
      
      // Echo back for now - will be enhanced with real-time updates
      try {
        const data = JSON.parse(message);
        ws.send(JSON.stringify({ 
          type: 'ack', 
          message: 'Message received',
          data 
        }));
      } catch (error) {
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Invalid message format' 
        }));
      }
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket connection closed');
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
    });

    // Send welcome message
    ws.send(JSON.stringify({ 
      type: 'welcome', 
      message: 'Connected to TeamPulse WebSocket server' 
    }));
  });

  console.log('✅ WebSocket server initialized');
}

/**
 * Broadcast message to all connected clients
 */
function broadcast(data) {
  if (!wss) {
    console.warn('⚠️  WebSocket server not initialized');
    return;
  }

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

module.exports = {
  attach,
  broadcast,
};
