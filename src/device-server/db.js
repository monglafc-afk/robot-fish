const { MongoClient } = require('mongodb');

class MemoryDB {
  constructor() {
    this.devices = new Map();
    this.logs = [];
  }

  async saveDevice(id, data) {
    const existing = this.devices.get(id) || {};
    this.devices.set(id, { ...existing, ...data, deviceId: id, updatedAt: new Date() });
    return this.devices.get(id);
  }

  async getDevice(id) {
    return this.devices.get(id) || null;
  }

  async getAllDevices() {
    return Array.from(this.devices.values());
  }

  async saveLog(entry) {
    const log = { ...entry, createdAt: new Date() };
    this.logs.push(log);
    return log;
  }
}

class MongoAdapter {
  constructor(db) {
    this.db = db;
    this.devices = db.collection('devices');
    this.logsCol = db.collection('logs');
  }

  async saveDevice(id, data) {
    const doc = { ...data, deviceId: id, updatedAt: new Date() };
    await this.devices.updateOne({ deviceId: id }, { $set: doc }, { upsert: true });
    return this.getDevice(id);
  }

  async getDevice(id) {
    return this.devices.findOne({ deviceId: id });
  }

  async getAllDevices() {
    return this.devices.find({}).toArray();
  }

  async saveLog(entry) {
    const log = { ...entry, createdAt: new Date() };
    await this.logsCol.insertOne(log);
    return log;
  }
}

let dbInstance;

async function initDB() {
  if (process.env.MONGO_URI) {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    console.log('[DB] Connected to MongoDB');
    dbInstance = new MongoAdapter(client.db('device_mgmt'));
  } else {
    console.log('[DB] MONGO_URI not found, falling back to MemoryDB');
    dbInstance = new MemoryDB();
  }
  return dbInstance;
}

function getDB() {
  return dbInstance;
}

module.exports = { initDB, getDB, MemoryDB, MongoAdapter };
