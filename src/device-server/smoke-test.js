const http = require('http');
const { io } = require('socket.io-client');

const BASE = `http://localhost:${process.env.PORT || 3000}`;
const DEVICE_ID = 'device-001';

function httpJson(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      `${BASE}${path}`,
      {
        method,
        headers: data
          ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
          : {},
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch (e) {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let failures = 0;
  const assert = (cond, msg) => {
    if (cond) {
      console.log(`  PASS: ${msg}`);
    } else {
      failures += 1;
      console.error(`  FAIL: ${msg}`);
    }
  };

  console.log('1) Health check');
  const health = await httpJson('GET', '/health');
  assert(health.status === 200 && health.body.status === 'ok', 'GET /health returns ok');

  console.log('2) Connect device via Socket.io');
  const socket = io(BASE, { query: { id: DEVICE_ID }, transports: ['websocket'] });
  await new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', reject);
    setTimeout(() => reject(new Error('connect timeout')), 5000);
  });
  assert(socket.connected, `device ${DEVICE_ID} connected`);
  await wait(300);

  console.log('3) Online device list reflects connection');
  const devices = await httpJson('GET', '/devices');
  assert(
    devices.body.online.includes(DEVICE_ID) && devices.body.onlineCount === 1,
    'GET /devices lists the connected device'
  );

  console.log('4) Device reports data, expects ack');
  const ack = await new Promise((resolve, reject) => {
    socket.once('device_data_ack', resolve);
    socket.emit('device_data', { lat: 31.23, lng: 121.47, battery: 88 });
    setTimeout(() => reject(new Error('ack timeout')), 5000);
  });
  assert(ack && ack.deviceId === DEVICE_ID, 'received device_data_ack');

  console.log('5) Server dispatches a command to the device');
  const cmdReceived = new Promise((resolve, reject) => {
    socket.once('command', resolve);
    setTimeout(() => reject(new Error('command timeout')), 5000);
  });
  const cmdResp = await httpJson('POST', `/devices/${DEVICE_ID}/command`, {
    action: 'reboot',
    delaySec: 5,
  });
  assert(cmdResp.status === 200 && cmdResp.body.delivered === true, 'POST command delivered=true');
  const cmd = await cmdReceived;
  assert(cmd && cmd.action === 'reboot', 'device received the command over socket');

  console.log('6) Command to unknown device returns 404');
  const missing = await httpJson('POST', '/devices/ghost/command', { action: 'ping' });
  assert(missing.status === 404 && missing.body.delivered === false, 'unknown device -> 404');

  console.log('7) Disconnect removes device from online list');
  socket.close();
  await wait(500);
  const after = await httpJson('GET', '/devices');
  assert(!after.body.online.includes(DEVICE_ID), 'device removed after disconnect');

  console.log(`\n${failures === 0 ? 'ALL TESTS PASSED' : failures + ' TEST(S) FAILED'}`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((err) => {
  console.error('Smoke test error:', err);
  process.exit(1);
});
