const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { MongoClient } = require('mongodb');
const cors = require('cors');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const mongoUrl = process.env.MONGO_ADMIN; // MongoDB URL
const dbName = 'test';

(async () => {
  const client = new MongoClient(mongoUrl);
  await client.connect();
  console.log('Connected to MongoDB');
  
  const db = client.db(dbName);
  const collection = db.collection('user');
  
  // Watch for changes in the 'user' collection
  const changeStream = collection.watch();
  
  changeStream.on('change', (change) => {
    console.log('Change detected:', change);
    
    // Emit the updated data to clients
    collection.find().toArray().then((users) => {
      io.emit('updateUsers', users); // Emit updated user data
    });
  });
  
  io.on('connection', (socket) => {
    console.log('A user connected');
    
    // Send initial data
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

app.use(cors({ origin: '*' }));