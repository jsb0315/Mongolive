const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const mongoUrl = process.env.MONGO_ADMIN; 
const dbName = 'admin_console';

let db;

async function connectToDatabase() {
  if (!db) {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    db = client.db(dbName);
    console.log("Connected to MongoDB");
  }
  return db;
}

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/api/databases', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const databases = await db.admin().listDatabases();
    res.status(200).json(databases.databases);
  } catch (error) {
    console.error('Error fetching databases:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/api/collections/:dbName', async (req, res) => {
  const { dbName } = req.params;
  try {
    const db = await connectToDatabase();
    const collections = await db.listCollections().toArray();
    res.status(200).json(collections);
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).send('Internal Server Error');
  }
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

server.listen(3001, () => {
  console.log(`Server is running on http://${process.env.REACT_APP_IP}:3001`);
});