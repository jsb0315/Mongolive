// filepath: /mongodb-admin-console/mongodb-admin-console/server/services/socket.js
const { Server } = require('socket.io');
const { MongoClient, ObjectId } = require('mongodb');
const clientInterestMap = new Map();

let io;

function initializeSocket(server) {
  io = new Server(server);
  
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('searchUsers', (data) => handleSearchUsers(socket, data));
    socket.on('disconnect', () => handleDisconnect(socket));
  });
}

async function handleSearchUsers(socket, data) {
  clientInterestMap.set(socket.id, data);
  console.log(`Searching users for socket: ${socket.id} with query: ${JSON.stringify(data)}`);

  try {
    const users = await queryDatabase(data);
    socket.emit('updateUsers', users);
  } catch (error) {
    console.error('Error fetching users:', error);
    socket.emit('updateUsers', { success: false, error: error.message });
  }
}

async function queryDatabase(data) {
  const { query = {}, projection = {} } = data;
  const mongoUrl = process.env.MONGO_ADMIN;
  const dbName = 'test';
  
  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection('user');

  try {
    const users = await collection.find(query, { projection }).toArray();
    return { success: true, data: users };
  } catch (error) {
    console.error('Database query error:', error);
    return { success: false, error: error.message };
  } finally {
    await client.close();
  }
}

function handleDisconnect(socket) {
  console.log(`Client disconnected: ${socket.id}`);
  clientInterestMap.delete(socket.id);
}

module.exports = {
  initializeSocket,
};