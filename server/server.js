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
  
  changeStream.on('change', (change) => { // 변경 감지 시
    console.log('Change detected:', change.documentKey._id);
    
    collection.find().toArray().then((users) => {
      io.emit('updateUsers', users);
    });
  });  
  
  io.on('connection', (socket) => {
    const timestamp = new Date().toLocaleString();
    const clientIp = socket.handshake.address;
    console.log(`A user connected | ${timestamp} | ${clientIp} |`);
    
    collection.find().toArray().then((users) => {
      socket.emit('updateUsers', users);
    });
    
    socket.on('disconnect', () => {
      console.log('A user disconnected');
    });
  });
  
  server.listen(3001, () => {
    console.log(`Server listening on http://${process.env.REACT_APP_IP}:3001`);
  });
})();