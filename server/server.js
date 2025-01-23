const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const mongoUrl = process.env.MONGO_ADMIN; // MongoDB URL
const dbName = 'test';

let db; // DB 연결 재사용

async function connectToDatabase() { // DB 연결 함수
  if (!db) {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    db = client.db(dbName);
    console.log("DB connected");
  }
  return db;
}

app.use(cors({ origin: '*' }));
app.use(express.json());

app.put('/api/users/:id', async (req, res) => { // PUT 요청 처리
  const { id } = req.params;
  const updatedData = req.body;
  const timestamp = new Date().toLocaleString();
  const clientIp = req.ip;

  console.log(`Request received | ${timestamp} | ${clientIp} |`);

  try {
    const db = await connectToDatabase();
    const collection = db.collection('user');
    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
    if (result.modifiedCount === 1) {
      res.status(200).send('User updated successfully');
    } else {
      res.status(404).send('User not found');
    }
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).send('Internal Server Error');
  }
});

(async () => {
  const db = await connectToDatabase();
  const collection = db.collection('user');
  
  const changeStream = collection.watch();
  
  changeStream.on('change', handleChange);
  
  function handleChange(change) {
    console.log('Change detected:', change.documentKey._id);
    collection.find().toArray().then((users) => {
      io.emit('updateUsers', { success: true, error: null, data: users });
    });
  }
  
  io.on('connection', handleConnection);

  function handleConnection(socket) {
    const timestamp = new Date().toLocaleString();
    const clientIp = socket.handshake.address;
    console.log(`A user connected | ${timestamp} | ${clientIp} |`);
    
    collection.find().toArray().then((users) => {
      socket.emit('updateUsers', { success: true, error: null, data: users });
    });

    socket.on('searchUsers', handleSearchUsers(socket));
    socket.on('disconnect', handleDisconnect);
  }

  server.listen(3001, () => {
    console.log(`Server listening on http://${process.env.REACT_APP_IP}:3001`);
  });

  function handleSearchUsers(socket) {
    return async (data = {query: '', projection: ''}) => {
      console.log('Received query:', data.query, data.projection);
      try {
        data.query = data.query.length ? JSON.parse(data.query) : {};
        data.projection = data.projection.length ? JSON.parse(data.projection) : {};
      } catch (error) {
        console.error('Invalid query format:', data.query);
        return socket.emit('updateUsers', { success: false, error: 'Invalid query format', data: [] });
      }
    
      try {
        if (data.query._id) data.query._id = new ObjectId(data.query._id);
        const users = await collection
          .find(data.query, { projection: data.projection })
          .toArray();
        socket.emit('updateUsers', { success: true, error: null, data: users });
      } catch (error) {
        console.error('Error fetching users:', error);
        socket.emit('updateUsers', { success: false, error: 'Failed to fetch users', data: [] });
      }
    };
  }

  function handleDisconnect() {
    console.log('A user disconnected');
  }
})();