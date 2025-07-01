const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://14.55.202.84:3000"
    ],
    methods: ["GET", "POST"]
  }
});

// 연결된 클라이언트들의 상태 관리
const connectedClients = new Map();
// ChangeStream 관리
const activeChangeStreams = new Map(); // collectionKey -> ChangeStream
const clientSubscriptions = new Map(); // socketId -> Set of collectionKeys

// MongoDB 연결 풀 관리
let mongoClient;
let databases = new Map(); // 데이터베이스별 연결 캐싱

// MongoDB 연결 초기화
async function initMongoDB() {
  try {
    mongoClient = new MongoClient(process.env.MONGO_URL || process.env.MONGO_ADMIN, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    await mongoClient.connect();
    console.log("✅ MongoDB connected successfully");
    return mongoClient;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

// 데이터베이스 연결 가져오기
async function getDatabase(dbName = 'test') {
  if (!databases.has(dbName)) {
    databases.set(dbName, mongoClient.db(dbName));
  }
  return databases.get(dbName);
}

// CORS 및 미들웨어 설정
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://14.55.202.84:3000"
  ],  // 이후 "*"로 변경
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 로깅 미들웨어
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} | ${req.method} | ${req.path} | ${req.ip}`);
  next();
});

// ===================== REST API 엔드포인트 =====================

// 데이터베이스 목록 조회
app.get('/api/databases', async (req, res) => {
  try {
    const adminDb = mongoClient.db().admin();
    const databasesList = await adminDb.listDatabases();
    
    const databases = await Promise.all(
      databasesList.databases.map(async (db) => {
        try {
          const database = mongoClient.db(db.name);
          const collections = await database.listCollections().toArray();
          return {
            name: db.name,
            sizeOnDisk: db.sizeOnDisk,
            collections: collections.map(col => ({
              name: col.name,
              type: col.type,
              options: col.options
            }))
          };
        } catch (error) {
          return {
            name: db.name,
            sizeOnDisk: db.sizeOnDisk,
            collections: [],
            error: error.message
          };
        }
      })
    );

    res.json({ success: true, data: databases });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 데이터베이스 목록 조회 (최적화된 - 컬렉션별 문서 개수 포함)
app.get('/api/databases/summary', async (req, res) => {
  try {
    const adminDb = mongoClient.db().admin();
    const databasesList = await adminDb.listDatabases();
    
    const databases = await Promise.all(
      databasesList.databases.map(async (db) => {
        try {
          const database = mongoClient.db(db.name);
          const collections = await database.listCollections().toArray();
          
          // 각 컬렉션의 문서 개수 조회 (병렬 처리로 성능 최적화)
          const collectionsWithCount = await Promise.all(
            collections.map(async (col) => {
              try {
                const collection = database.collection(col.name);
                const count = await collection.countDocuments();
                return {
                  name: col.name,
                  type: col.type,
                  documentCount: count,
                  options: col.options
                };
              } catch (error) {
                return {
                  name: col.name,
                  type: col.type,
                  documentCount: 0,
                  options: col.options,
                  error: error.message
                };
              }
            })
          );
          
          return {
            name: db.name,
            sizeOnDisk: db.sizeOnDisk,
            collections: collectionsWithCount
          };
        } catch (error) {
          return {
            name: db.name,
            sizeOnDisk: db.sizeOnDisk,
            collections: [],
            error: error.message
          };
        }
      })
    );

    res.json({ success: true, data: databases });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 컬렉션 정보 조회
app.get('/api/databases/:dbName/collections/:collectionName', async (req, res) => {
  try {
    const { dbName, collectionName } = req.params;
    const db = await getDatabase(dbName);
    const collection = db.collection(collectionName);

    const [stats, indexes, sampleDoc] = await Promise.all([
      collection.stats().catch(() => null),
      collection.indexes().catch(() => []),
      collection.findOne().catch(() => null)
    ]);

    res.json({
      success: true,
      data: {
        name: collectionName,
        database: dbName,
        stats: stats,
        indexes: indexes,
        sampleDocument: sampleDoc
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 문서 쿼리 (GET)
app.get('/api/databases/:dbName/collections/:collectionName/documents', async (req, res) => {
  try {
    const { dbName, collectionName } = req.params;
    const { 
      query = '{}', 
      projection = '{}', 
      sort = '{}', 
      limit = 20, 
      skip = 0 
    } = req.query;

    const result = await executeQuery(dbName, collectionName, {
      query: query,
      projection: projection,
      sort: sort,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 문서 쿼리 (POST) - 복잡한 쿼리용
app.post('/api/databases/:dbName/collections/:collectionName/query', async (req, res) => {
  try {
    const { dbName, collectionName } = req.params;
    const queryOptions = req.body;

    const result = await executeQuery(dbName, collectionName, queryOptions);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 문서 삽입
app.post('/api/databases/:dbName/collections/:collectionName/documents', async (req, res) => {
  try {
    const { dbName, collectionName } = req.params;
    const documents = Array.isArray(req.body) ? req.body : [req.body];

    const db = await getDatabase(dbName);
    const collection = db.collection(collectionName);
    
    const result = documents.length === 1
      ? await collection.insertOne(documents[0])
      : await collection.insertMany(documents);

    res.json({
      success: true,
      data: {
        insertedCount: documents.length,
        insertedIds: result.insertedId ? [result.insertedId] : result.insertedIds
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 문서 업데이트
app.put('/api/databases/:dbName/collections/:collectionName/documents/:id', async (req, res) => {
  try {
    const { dbName, collectionName, id } = req.params;
    const updateData = req.body;

    const db = await getDatabase(dbName);
    const collection = db.collection(collectionName);
    
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    res.json({
      success: true,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 문서 삭제
app.delete('/api/databases/:dbName/collections/:collectionName/documents/:id', async (req, res) => {
  try {
    const { dbName, collectionName, id } = req.params;

    const db = await getDatabase(dbName);
    const collection = db.collection(collectionName);
    
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    res.json({
      success: true,
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 집계 파이프라인 실행
app.post('/api/databases/:dbName/collections/:collectionName/aggregate', async (req, res) => {
  try {
    const { dbName, collectionName } = req.params;
    const { pipeline, options = {} } = req.body;

    const db = await getDatabase(dbName);
    const collection = db.collection(collectionName);
    
    const result = await collection.aggregate(pipeline, options).toArray();

    res.json({
      success: true,
      data: result,
      count: result.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 컬렉션 문서 요약 (최적화된 - 문서 ID와 필드 개수만)
app.get('/api/databases/:dbName/collections/:collectionName/summary', async (req, res) => {
  try {
    const { dbName, collectionName } = req.params;
    const db = await getDatabase(dbName);
    const collection = db.collection(collectionName);

    // 문서 ID들만 가져오기 (빠른 조회)
    const documentIds = await collection.find({}, { projection: { _id: 1 } }).limit(1000).toArray();
    
    // 샘플링을 통한 필드 개수 계산 (성능 최적화)
    const sampleSize = Math.min(50, documentIds.length);
    const sampleDocs = documentIds.slice(0, sampleSize);
    
    // 샘플 문서들의 실제 필드 개수 계산
    const sampleFieldCounts = await Promise.all(
      sampleDocs.map(async (doc) => {
        const fullDoc = await collection.findOne({ _id: doc._id });
        return fullDoc ? Object.keys(fullDoc).length : 0;
      })
    );
    
    // 평균 필드 개수 계산
    const avgFieldCount = sampleFieldCounts.length > 0 
      ? Math.round(sampleFieldCounts.reduce((sum, count) => sum + count, 0) / sampleFieldCounts.length)
      : 0;
    
    // 모든 문서에 대해 필드 개수 할당 (샘플 기반)
    const documentsWithFieldCount = documentIds.map((doc, index) => ({
      _id: doc._id,
      fieldCount: index < sampleSize ? sampleFieldCounts[index] : avgFieldCount
    }));

    const totalCount = await collection.countDocuments();

    res.json({
      success: true,
      data: {
        name: collectionName,
        database: dbName,
        totalDocuments: totalCount,
        documents: documentsWithFieldCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 특정 문서 조회 (ID로 전체 문서 가져오기)
app.get('/api/databases/:dbName/collections/:collectionName/documents/:documentId', async (req, res) => {
  try {
    const { dbName, collectionName, documentId } = req.params;
    const db = await getDatabase(dbName);
    const collection = db.collection(collectionName);

    // ObjectId 또는 문자열 ID 처리
    let query;
    try {
      query = { _id: new ObjectId(documentId) };
    } catch {
      query = { _id: documentId };
    }

    const document = await collection.findOne(query);
    
    if (!document) {
      return res.status(404).json({ 
        success: false, 
        error: 'Document not found' 
      });
    }

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===================== 공통 쿼리 함수 =====================

async function executeQuery(dbName, collectionName, options) {
  const { 
    query = '{}', 
    projection = '{}', 
    sort = '{}', 
    limit = 20, 
    skip = 0 
  } = options;

  try {
    const db = await getDatabase(dbName);
    const collection = db.collection(collectionName);

    // JSON 파싱 및 ObjectId 변환
    const parsedQuery = parseQueryWithObjectId(query);
    const parsedProjection = projection ? JSON.parse(projection) : {};
    const parsedSort = sort ? JSON.parse(sort) : {};

    // 쿼리 실행
    const cursor = collection.find(parsedQuery);
    
    if (Object.keys(parsedProjection).length > 0) {
      cursor.project(parsedProjection);
    }
    
    if (Object.keys(parsedSort).length > 0) {
      cursor.sort(parsedSort);
    }
    
    cursor.skip(parseInt(skip)).limit(parseInt(limit));

    const [documents, totalCount] = await Promise.all([
      cursor.toArray(),
      collection.countDocuments(parsedQuery)
    ]);

    return {
      success: true,
      data: documents,
      metadata: {
        totalCount,
        returnedCount: documents.length,
        skip: parseInt(skip),
        limit: parseInt(limit)
      }
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { success: false, error: 'Invalid JSON format', data: [] };
    }
    throw error;
  }
}

// ObjectId 문자열을 ObjectId 객체로 변환
function parseQueryWithObjectId(queryString) {
  try {
    const query = JSON.parse(queryString);
    return convertStringToObjectId(query);
  } catch (error) {
    throw new SyntaxError('Invalid JSON format');
  }
}

function convertStringToObjectId(obj) {
  if (typeof obj === 'string' && /^[0-9a-fA-F]{24}$/.test(obj)) {
    return new ObjectId(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertStringToObjectId);
  }
  
  if (obj && typeof obj === 'object') {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === '_id' && typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)) {
        converted[key] = new ObjectId(value);
      } else {
        converted[key] = convertStringToObjectId(value);
      }
    }
    return converted;
  }
  
  return obj;
}

// ===================== ChangeStream 관리 =====================

// 변경된 필드의 깊은 경로 찾기
function findDeepestPaths(updatedFields) {
  if (!updatedFields) return [];
  
  const paths = Object.keys(updatedFields);
  const deepPaths = [];
  
  for (const path of paths) {
    const segments = path.split('.');
    let deepestPath = '';
    let currentValue = updatedFields[path];
    
    // 배열 인덱스나 객체 키를 포함한 전체 경로 구성
    for (let i = 0; i < segments.length; i++) {
      if (i > 0) deepestPath += '.';
      deepestPath += segments[i];
    }
    
    deepPaths.push({
      path: deepestPath,
      value: currentValue,
      segments: segments,
      depth: segments.length
    });
  }
  
  return deepPaths.sort((a, b) => b.depth - a.depth); // 깊은 순서대로 정렬
}

// ChangeStream 생성 및 관리
async function createChangeStream(dbName, collectionName) {
  const collectionKey = `${dbName}.${collectionName}`;
  
  if (activeChangeStreams.has(collectionKey)) {
    return activeChangeStreams.get(collectionKey);
  }

  try {
    const db = await getDatabase(dbName);
    const collection = db.collection(collectionName);
    
    // ChangeStream 옵션 설정
    const changeStream = collection.watch([], {
      fullDocument: 'updateLookup', // 전체 문서 반환
      fullDocumentBeforeChange: 'whenAvailable' // 변경 전 문서도 반환 (MongoDB 6.0+)
    });
    
    changeStream.on('change', async (change) => {
      await handleCollectionChange(collectionKey, change);
    });
    
    changeStream.on('error', (error) => {
      console.error(`❌ ChangeStream error for ${collectionKey}:`, error);
      // ChangeStream 재연결 시도
      setTimeout(() => {
        activeChangeStreams.delete(collectionKey);
        createChangeStream(dbName, collectionName);
      }, 5000);
    });
    
    changeStream.on('close', () => {
      console.log(`🔴 ChangeStream closed for ${collectionKey}`);
      activeChangeStreams.delete(collectionKey);
    });
    
    activeChangeStreams.set(collectionKey, changeStream);
    console.log(`🟢 ChangeStream created for ${collectionKey}`);
    
    return changeStream;
  } catch (error) {
    console.error(`❌ Failed to create ChangeStream for ${collectionKey}:`, error);
    throw error;
  }
}

// 컬렉션 변경 처리
async function handleCollectionChange(collectionKey, change) {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} | 🔄 Change detected in ${collectionKey}:`, change.operationType);
  
  // 변경된 경로 분석
  let updatedPaths = [];
  if (change.updateDescription && change.updateDescription.updatedFields) {
    updatedPaths = findDeepestPaths(change.updateDescription.updatedFields);
    console.log('📍 Updated Paths:', updatedPaths);
  }
  
  // 변경 정보 구성
  const changeInfo = {
    timestamp,
    collectionKey,
    operationType: change.operationType,
    documentKey: change.documentKey,
    fullDocument: change.fullDocument,
    fullDocumentBeforeChange: change.fullDocumentBeforeChange,
    updateDescription: change.updateDescription,
    updatedPaths: updatedPaths,
    clusterTime: change.clusterTime
  };
  
  // 해당 컬렉션을 구독 중인 클라이언트들에게 변경 사항 전송
  for (const [socketId, subscriptions] of clientSubscriptions.entries()) {
    if (subscriptions.has(collectionKey)) {
      const client = connectedClients.get(socketId);
      if (client && client.socket) {
        try {
          // 클라이언트의 쿼리 조건에 따라 필터링된 데이터 전송
          const clientQuery = client.lastQuery;
          if (clientQuery && clientQuery.dbName && clientQuery.collectionName) {
            const [dbName, collName] = collectionKey.split('.');
            if (clientQuery.dbName === dbName && clientQuery.collectionName === collName) {
              const result = await executeQuery(dbName, collName, clientQuery);
              client.socket.emit('dataUpdate', {
                type: 'change',
                change: changeInfo,
                data: result.data,
                metadata: result.metadata
              });
            }
          } else {
            // 쿼리 조건이 없으면 변경 정보만 전송
            client.socket.emit('dataUpdate', {
              type: 'change',
              change: changeInfo
            });
          }
        } catch (error) {
          console.error(`❌ Error sending change to ${socketId}:`, error);
          client.socket.emit('error', { 
            error: 'Failed to process collection change',
            details: error.message 
          });
        }
      }
    }
  }
}

// ChangeStream 정리
function closeChangeStream(collectionKey) {
  const changeStream = activeChangeStreams.get(collectionKey);
  if (changeStream) {
    changeStream.close();
    activeChangeStreams.delete(collectionKey);
    console.log(`🔴 ChangeStream closed for ${collectionKey}`);
  }
}

// ===================== WebSocket 실시간 기능 =====================

io.on('connection', handleConnection);

function handleConnection(socket) {
  const timestamp = new Date().toISOString();
  const clientIp = socket.handshake.address;
  
  connectedClients.set(socket.id, {
    socket: socket,
    connectedAt: timestamp,
    ip: clientIp,
    watchedCollections: new Set()
  });
  
  clientSubscriptions.set(socket.id, new Set());

  console.log(`${timestamp} | ✅ Connected | ${socket.id} | Total: ${connectedClients.size} | ${clientIp}`);

  // 실시간 쿼리 구독
  socket.on('subscribe', handleSubscribe(socket));
  socket.on('unsubscribe', handleUnsubscribe(socket));
  
  // 연결 해제
  socket.on('disconnect', () => handleDisconnect(socket));
}

function handleSubscribe(socket) {
  return async (data) => {
    const { dbName, collectionName, query = '{}', options = {} } = data;
    const collectionKey = `${dbName}.${collectionName}`;
    
    const client = connectedClients.get(socket.id);
    const subscriptions = clientSubscriptions.get(socket.id);
    
    if (client && subscriptions) {
      client.watchedCollections.add(collectionKey);
      client.lastQuery = { dbName, collectionName, query, ...options };
      subscriptions.add(collectionKey);
    }

    console.log(`📡 Subscribe: ${socket.id} -> ${collectionKey}`);
    
    try {
      // ChangeStream 생성 (없으면)
      await createChangeStream(dbName, collectionName);
      
      // 초기 데이터 전송
      const result = await executeQuery(dbName, collectionName, { query, ...options });
      socket.emit('data', { 
        type: 'initial', 
        collectionKey,
        ...result 
      });
      
      socket.emit('subscribed', { 
        collectionKey,
        message: 'Successfully subscribed to collection changes' 
      });
      
    } catch (error) {
      console.error(`❌ Subscribe error for ${collectionKey}:`, error);
      socket.emit('error', { 
        error: 'Failed to subscribe to collection changes',
        details: error.message,
        collectionKey 
      });
    }
  };
}

function handleUnsubscribe(socket) {
  return (data) => {
    const { dbName, collectionName } = data;
    const collectionKey = `${dbName}.${collectionName}`;
    
    const client = connectedClients.get(socket.id);
    const subscriptions = clientSubscriptions.get(socket.id);
    
    if (client && subscriptions) {
      client.watchedCollections.delete(collectionKey);
      subscriptions.delete(collectionKey);
    }
    
    console.log(`📡 Unsubscribe: ${socket.id} -> ${collectionKey}`);
    
    // 더 이상 해당 컬렉션을 구독하는 클라이언트가 없으면 ChangeStream 정리
    let hasSubscribers = false;
    for (const subs of clientSubscriptions.values()) {
      if (subs.has(collectionKey)) {
        hasSubscribers = true;
        break;
      }
    }
    
    if (!hasSubscribers) {
      closeChangeStream(collectionKey);
    }
    
    socket.emit('unsubscribed', { 
      collectionKey,
      message: 'Successfully unsubscribed from collection changes' 
    });
  };
}

function handleDisconnect(socket) {
  const timestamp = new Date().toISOString();
  const client = connectedClients.get(socket.id);
  
  if (client) {
    // 클라이언트가 구독하던 모든 컬렉션에서 구독 해제
    for (const collectionKey of client.watchedCollections) {
      const subscriptions = clientSubscriptions.get(socket.id);
      if (subscriptions) {
        subscriptions.delete(collectionKey);
      }
      
      // 더 이상 구독자가 없으면 ChangeStream 정리
      let hasSubscribers = false;
      for (const subs of clientSubscriptions.values()) {
        if (subs.has(collectionKey)) {
          hasSubscribers = true;
          break;
        }
      }
      
      if (!hasSubscribers) {
        closeChangeStream(collectionKey);
      }
    }
  }
  
  connectedClients.delete(socket.id);
  clientSubscriptions.delete(socket.id);
  console.log(`${timestamp} | ❌ Disconnected | ${socket.id} | Total: ${connectedClients.size}`);
}

// ===================== 서버 시작 =====================

async function startServer() {
  try {
    await initMongoDB();
    
    const PORT = process.env.PORT || 3001;
    const HOST = process.env.HOST || '14.55.202.84';
    
    server.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on http://${HOST}:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// 종료 시 정리
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  
  // 모든 ChangeStream 정리
  for (const [collectionKey, changeStream] of activeChangeStreams.entries()) {
    console.log(`🔴 Closing ChangeStream for ${collectionKey}`);
    changeStream.close();
  }
  
  if (mongoClient) {
    await mongoClient.close();
    console.log('✅ MongoDB connection closed');
  }
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

startServer();