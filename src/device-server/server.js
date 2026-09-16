const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { initDB, getDB } = require('./db');

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const activeSockets = new Map();

function getDeviceId(socket) {
  return socket.handshake.query.id || socket.handshake.query.deviceId;
}

io.on('connection', (socket) => {
  const deviceId = getDeviceId(socket);

  if (!deviceId) {
    console.log(`[Socket] Connection without deviceId rejected (${socket.id})`);
    socket.disconnect(true);
    return;
  }

  activeSockets.set(deviceId, socket.id);
  console.log(`[Socket] Device connected: ${deviceId} (${socket.id})`);

  const db = getDB();
  if (db) {
    db.saveDevice(deviceId, { online: true, socketId: socket.id }).catch((err) =>
      console.error('[DB] saveDevice on connect failed:', err.message)
    );
  }

  socket.on('device_data', async (payload) => {
    console.log(`[Data] Received from ${deviceId}:`, payload);
    const store = getDB();
    if (store) {
      await store.saveDevice(deviceId, { online: true, lastData: payload });
      await store.saveLog({ deviceId, type: 'device_data', payload });
    }
    socket.emit('device_data_ack', { deviceId, receivedAt: new Date() });
  });

  socket.on('disconnect', async () => {
    if (deviceId) {
      activeSockets.delete(deviceId);
      const store = getDB();
      if (store) {
        await store
          .saveDevice(deviceId, { online: false, socketId: null })
          .catch((err) => console.error('[DB] saveDevice on disconnect failed:', err.message));
      }
    }
    console.log(`[Socket] Device disconnected: ${deviceId}`);
  });
});

function sendCommand(deviceId, command) {
  const socketId = activeSockets.get(deviceId);
  if (!socketId) return false;
  io.to(socketId).emit('command', command);
  console.log(`[Command] Sent to ${deviceId}:`, command);
  return true;
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', online: activeSockets.size });
});

app.get('/devices', async (req, res) => {
  const store = getDB();
  const online = Array.from(activeSockets.keys());
  let known = [];
  if (store) {
    known = await store.getAllDevices();
  }
  res.json({
    onlineCount: online.length,
    online,
    devices: known,
  });
});

app.post('/devices/:id/command', (req, res) => {
  const { id } = req.params;
  const command = req.body || {};
  const delivered = sendCommand(id, command);
  if (!delivered) {
    return res.status(404).json({ error: `Device ${id} is not connected`, delivered: false });
  }
  res.json({ deviceId: id, command, delivered: true });
});

const PORT = process.env.PORT || 3000;

async function start() {
  await initDB();
  server.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT}`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  });
}

module.exports = { app, server, io, sendCommand, activeSockets, start };
