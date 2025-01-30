const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const clientInterestMap = new Map(); // 소켓 ID별 관심 데이터 저장

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
    console.error('Error updating user:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

(async () => {
  const db = await connectToDatabase();
  const collection = db.collection('user');
  
  const changeStream = collection.watch();
  
  changeStream.on('change', handleChange);
  
  async function handleChange(change) {
    console.log('Change detected:', change.documentKey._id);
  
    for (const [socketId, data] of clientInterestMap.entries()) {
      try {
        console.log(socketId, data)
        const users = data ? await queryDatabase(data): change; // 데이터베이스 쿼리
        io.to(socketId).emit('updateUsers', users);
      } catch (error) {
        io.to(socketId).emit('updateUsers', { success: false, error: 'Failed to fetch updated users' });
        console.error(`Error processing change for socket ${socketId}:`, error);
      }
    }
  }
  
  io.on('connection', handleConnection);

  function handleConnection(socket) {
    const timestamp = new Date().toLocaleString();
    const clientIp = socket.handshake.address;
    console.log(`${timestamp} |✅ | ${socket.id} | ${clientInterestMap.size+1} | ${clientIp}`);

    socket.on('searchUsers', handleSearchUsers(socket));
    socket.on('disconnect', () => handleDisconnect(socket));
  }

  server.listen(3001, () => {
    console.log(`Server listening on http://${process.env.REACT_APP_IP}:3001`);
  });

  // Socket 이벤트 처리 함수
  function handleSearchUsers(socket) {
    const timestamp = new Date().toLocaleString();
    return async (data = { query: '', projection: '' }) => {
      clientInterestMap.set(socket.id, {query: data.query, projection: data.projection}); // 클라이언트 관심 데이터 저장
      console.log(`${timestamp} |🔎 | ${socket.id} |   | ${data.query}, ${data.projection} |`);

      try {
        const users = await queryDatabase(data); // 데이터 쿼리 함수 호출
        socket.emit('updateUsers', users);
      } catch (error) {
        console.error('Error fetching users:', error);
        socket.emit('updateUsers', { success: false, error: error.message, data: [] });
      }
    };
  }

  async function queryDatabase(data) {
    const { query = '', projection = '' } = data; // 기본 값 설정
    try {
      // 쿼리 데이터 준비
      const parsedQuery = query.length ? JSON.parse(query) : {};
      const parsedProjection = projection.length ? JSON.parse(projection) : {};
  
      if (parsedQuery._id)
        parsedQuery._id = new ObjectId(parsedQuery._id);
  
      // MongoDB 쿼리 실행
      const users = await collection.find(parsedQuery, { projection: parsedProjection }).toArray();
  
      return { success: true, error: null, data: users }; // 쿼리 결과 반환
    } catch (error) {
      if (error.name instanceof SyntaxError) {
        console.error('Invalid JSON data');
        const dummy = await queryDatabase({ query: '', projection: '' });
        const users = { success: dummy.success, error: 'Invalid JSON data', data: dummy.data}
        return users; // 빈 객체로 재귀 호출
      } else {
        console.error('Error querying database:', error.message);
        return { success: false, error: error.message, data: {} }
      }
    }
  }

  const handleDisconnect = (socket) => {  // 연결 해제 이벤트 처리, 이미 실행된 결과 등록=> 익명 함수
    const timestamp = new Date().toLocaleString();
    console.log(`${timestamp} |❌ | ${socket.id} | ${clientInterestMap.size-1} |`);
    clientInterestMap.delete(socket.id);
  };
})();