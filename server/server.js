const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');

require('dotenv').config();

// 보안 패치 모듈 로드
const {
  sanitizeQuery,
  validateQueryComplexity,
  rateLimitMiddleware,
  validateDatabaseAccess,
  validateCollectionAccess,
  validateQueryLimits,
  validateInputSize,
  validateWebSocketConnection,
  createSafeError
} = require('./security-patches');

const app = express();
const server = http.createServer(app);

// 환경변수에서 허용된 Origin 목록 가져오기
const allowedOrigins = process.env.WHITELIST 
  ? process.env.WHITELIST.split(',').map(origin => origin.trim())
  : [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
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
let isShuttingDown = false; // 서버 종료 상태 추적

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

// IP 화이트리스트 및 CORS 설정
const isIPWhitelistEnabled = process.env.ENABLE_IP_WHITELIST === 'true';
const allowedIPs = process.env.IP_WHITELIST 
  ? process.env.IP_WHITELIST.split(',').map(ip => ip.trim())
  : ['127.0.0.1', '::1', 'localhost'];

console.log('🔒 Security Configuration:');
console.log(`   IP Whitelist Enabled: ${isIPWhitelistEnabled}`);
console.log(`   Allowed IPs: ${allowedIPs.join(', ')}`);
console.log(`   Allowed Origins: ${allowedOrigins.join(', ')}`);

// IP 화이트리스트 미들웨어
function ipWhitelistMiddleware(req, res, next) {
  if (!isIPWhitelistEnabled) {
    return next();
  }

  // 클라이언트 IP 추출 (프록시 고려)
  const clientIP = req.ip || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                   req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                   req.headers['x-real-ip'];

  // IPv6 형태의 localhost (::ffff:127.0.0.1) 처리
  const normalizedIP = clientIP?.replace(/^::ffff:/, '') || '';
  
  const checkString = `🔍 IP: ${normalizedIP} (Original: ${clientIP})`;

  // IP 화이트리스트 검증
  const isAllowed = allowedIPs.some(allowedIP => {
    if (allowedIP === 'localhost' && (normalizedIP === '127.0.0.1' || normalizedIP === '::1')) {
      return true;
    }
    return normalizedIP === allowedIP || clientIP === allowedIP;
  });

  if (!isAllowed) {
    const timestamp = new Date().toISOString();
    console.log(`${checkString}.. \n${timestamp} | 🚫 BLOCKED | ${req.method} ${req.path} | IP: ${normalizedIP} | User-Agent: ${req.headers['user-agent'] || 'Unknown'}`);
    return res.status(403).json({
      success: false,
      error: 'Access denied: IP not whitelisted',
      ip: normalizedIP,
      timestamp: timestamp
    });
  }

  console.log(`${checkString}.. ✅`);
  next();
}

// 미들웨어 적용
app.set('trust proxy', true); // 프록시 뒤에서 실제 IP 얻기

// Rate Limiting 적용
app.use(rateLimitMiddleware);

// 입력 크기 제한
app.use(validateInputSize);

// IP 화이트리스트 적용
app.use(ipWhitelistMiddleware);

// CORS 설정
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '1mb' })); // 크기 제한 추가
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 로깅 미들웨어
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const clientIP = req.ip?.replace(/^::ffff:/, '') || '';
  const securityStatus = isIPWhitelistEnabled ? 
    (allowedIPs.some(ip => ip === 'localhost' && (clientIP === '127.0.0.1' || clientIP === '::1') || clientIP === ip) ? '🟢' : '🔴') : 
    '⚪';
  console.log(`${timestamp} | ${securityStatus} ${req.method} | ${req.path} | ${clientIP}`);
  next();
});

// ===================== REST API 엔드포인트 =====================

// 보안 및 서버 상태 조회
app.get('/api/security/status', (req, res) => {
  const clientIP = req.ip?.replace(/^::ffff:/, '') || '';
  
  res.json({
    success: true,
    data: {
      server: {
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      },
      security: {
        ipWhitelistEnabled: isIPWhitelistEnabled,
        allowedIPs: allowedIPs,
        allowedOrigins: allowedOrigins,
        currentClientIP: clientIP,
        isClientAllowed: !isIPWhitelistEnabled || allowedIPs.some(allowedIP => {
          if (allowedIP === 'localhost' && (clientIP === '127.0.0.1' || clientIP === '::1')) {
            return true;
          }
          return clientIP === allowedIP;
        })
      },
      connections: {
        totalClients: connectedClients.size,
        activeChangeStreams: activeChangeStreams.size
      }
    }
  });
});

// MongoDB 연결 상태 조회
app.get('/api/mongodb/status', async (req, res) => {
  try {
    const status = {
      connected: false,
      serverInfo: null,
      stats: null,
      error: null
    };

    if (mongoClient && mongoClient.topology) {
      // MongoDB 연결 상태 확인
      const isConnected = mongoClient.topology.isConnected();
      status.connected = isConnected;

      if (isConnected) {
        try {
          // 서버 정보 가져오기
          const adminDb = mongoClient.db().admin();
          const serverStatus = await adminDb.command({ serverStatus: 1 });
          const buildInfo = await adminDb.command({ buildInfo: 1 });
          
          status.serverInfo = {
            version: buildInfo.version,
            uptime: serverStatus.uptime,
            host: serverStatus.host,
            process: serverStatus.process,
            connections: {
              current: serverStatus.connections?.current || 0,
              available: serverStatus.connections?.available || 0,
              totalCreated: serverStatus.connections?.totalCreated || 0
            },
            memory: {
              resident: serverStatus.mem?.resident || 0,
              virtual: serverStatus.mem?.virtual || 0,
              mapped: serverStatus.mem?.mapped || 0
            },
            network: {
              bytesIn: serverStatus.network?.bytesIn || 0,
              bytesOut: serverStatus.network?.bytesOut || 0,
              numRequests: serverStatus.network?.numRequests || 0
            }
          };

          // 데이터베이스 통계
          const listDatabases = await adminDb.listDatabases();
          status.stats = {
            totalDatabases: listDatabases.databases.length,
            totalSize: listDatabases.totalSize || 0,
            storageEngine: serverStatus.storageEngine?.name || 'unknown'
          };
        } catch (dbError) {
          console.error('Error getting MongoDB server info:', dbError);
          status.error = 'Failed to get server details: ' + dbError.message;
        }
      } else {
        status.error = 'MongoDB client is not connected';
      }
    } else {
      status.error = 'MongoDB client is not initialized';
    }

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error checking MongoDB status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check MongoDB status: ' + error.message
    });
  }
});

// IP 화이트리스트 관리 (런타임에 IP 추가/제거)
app.post('/api/security/whitelist', (req, res) => {
  const { action, ip } = req.body; // action: 'add' | 'remove', ip: string
  
  if (!action || !ip) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: action and ip'
    });
  }
  
  if (!['add', 'remove'].includes(action)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid action. Use "add" or "remove"'
    });
  }
  
  const normalizedIP = ip.trim();
  
  if (action === 'add') {
    if (!allowedIPs.includes(normalizedIP)) {
      allowedIPs.push(normalizedIP);
      console.log(`✅ IP added to whitelist: ${normalizedIP}`);
    }
  } else if (action === 'remove') {
    const index = allowedIPs.indexOf(normalizedIP);
    if (index > -1) {
      allowedIPs.splice(index, 1);
      console.log(`❌ IP removed from whitelist: ${normalizedIP}`);
    }
  }
  
  res.json({
    success: true,
    data: {
      action,
      ip: normalizedIP,
      currentWhitelist: allowedIPs
    }
  });
});

// 데이터베이스 목록 조회
app.get('/api/databases', async (req, res) => {
  try {
    const adminDb = mongoClient.db().admin();
    const databasesList = await adminDb.listDatabases();
    
    // 시스템 데이터베이스 필터링
    const filteredDatabases = databasesList.databases.filter(db => 
      !['admin', 'config', 'local'].includes(db.name)
    );
    
    const databases = await Promise.all(
      filteredDatabases.map(async (db) => {
        try {
          validateDatabaseAccess(db.name);
          const database = mongoClient.db(db.name);
          const collections = await database.listCollections().toArray();
          
          // 시스템 컬렉션 필터링
          const filteredCollections = collections.filter(col => 
            !col.name.startsWith('system.') && !col.name.startsWith('fs.')
          );
          
          return {
            name: db.name,
            sizeOnDisk: db.sizeOnDisk,
            collections: filteredCollections.map(col => ({
              name: col.name,
              type: col.type,
              options: col.options
            }))
          };
        } catch (error) {
          console.error(`Error accessing database ${db.name}:`, error);
          return null; // 접근 불가한 데이터베이스는 제외
        }
      })
    );

    res.json({ 
      success: true, 
      data: databases.filter(db => db !== null) 
    });
  } catch (error) {
    res.status(500).json(createSafeError(error, 'Database listing'));
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
      updateData  // $set, $unset 등 모든 MongoDB 연산자 지원
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
    // 보안 검증
    validateDatabaseAccess(dbName);
    validateCollectionAccess(collectionName);
    const { limit: validatedLimit, skip: validatedSkip } = validateQueryLimits({ limit, skip });

    const db = await getDatabase(dbName);
    const collection = db.collection(collectionName);

    // JSON 파싱 및 보안 검증
    const parsedQuery = parseSecureQuery(query);
    const parsedProjection = projection ? JSON.parse(projection) : {};
    const parsedSort = sort ? JSON.parse(sort) : {};

    // 쿼리 복잡도 검증
    validateQueryComplexity(parsedQuery);

    // 쿼리 실행
    const cursor = collection.find(parsedQuery);
    
    if (Object.keys(parsedProjection).length > 0) {
      cursor.project(parsedProjection);
    }
    
    if (Object.keys(parsedSort).length > 0) {
      cursor.sort(parsedSort);
    }
    
    cursor.skip(validatedSkip).limit(validatedLimit);

    const [documents, totalCount] = await Promise.all([
      cursor.toArray(),
      collection.countDocuments(parsedQuery)
    ]);

    return {
      success: true,
      data: documents,
      metadata: {
        totalCount: Math.min(totalCount, 10000), // 카운트도 제한
        returnedCount: documents.length,
        skip: validatedSkip,
        limit: validatedLimit
      }
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { success: false, error: 'Invalid JSON format', data: [] };
    }
    throw error;
  }
}

// ObjectId 문자열을 ObjectId 객체로 변환 (보안 강화)
function parseSecureQuery(queryString) {
  try {
    const query = JSON.parse(queryString);
    const sanitized = sanitizeQuery(query);
    return convertStringToObjectId(sanitized);
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
      activeChangeStreams.delete(collectionKey);
      
      // 서버가 종료 중이 아닐 때만 재연결 시도
      if (!isShuttingDown) {
        console.log(`🔄 Attempting to reconnect ChangeStream for ${collectionKey} in 5 seconds...`);
        setTimeout(() => {
          if (!isShuttingDown) {
            createChangeStream(dbName, collectionName).catch(err => {
              console.error(`❌ Failed to reconnect ChangeStream for ${collectionKey}:`, err);
            });
          }
        }, 5000);
      }
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
  
  // WebSocket 연결 제한 검증
  if (!validateWebSocketConnection(socket)) {
    return;
  }
  
  // WebSocket 연결에 대한 IP 화이트리스트 검증
  if (isIPWhitelistEnabled) {
    const normalizedIP = clientIp?.replace(/^::ffff:/, '') || '';
    
    const isAllowed = allowedIPs.some(allowedIP => {
      if (allowedIP === 'localhost' && (normalizedIP === '127.0.0.1' || normalizedIP === '::1')) {
        return true;
      }
      return normalizedIP === allowedIP || clientIp === allowedIP;
    });

    if (!isAllowed) {
      console.log(`🚫 WebSocket connection denied for IP: ${normalizedIP}`);
      socket.emit('error', { 
        error: 'Access denied: IP not whitelisted',
        ip: normalizedIP 
      });
      socket.disconnect(true);
      return;
    }
    
    console.log(`✅ WebSocket connection allowed for IP: ${normalizedIP}`);
  }
  
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
    
    const PORT = process.env.API_PORT || 3001;
    const HOST = process.env.HOST;
    
    server.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on http://${HOST}:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔑 Process ID: ${process.pid}`);
      console.log('💡 Press Ctrl+C to shutdown gracefully');
    });
    
    // 서버 에러 처리
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      gracefulShutdown('server-error');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// 프로세스 타이틀 설정 (ps 명령어에서 쉽게 찾을 수 있도록)
process.title = 'mongolive-server';

// 종료 시 정리
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    console.log('⚠️  Force shutdown - terminating immediately...');
    process.exit(1);
  }
  
  isShuttingDown = true;
  console.log(`\n🔄 Shutting down gracefully... (${signal})`);
  
  // 강제 종료 타이머 (10초 후 강제 종료)
  const forceExitTimer = setTimeout(() => {
    console.log('⚠️  Force exit after 15 seconds timeout');
    process.exit(1);
  }, 15000);
  
  try {
    // 1. 새로운 연결 차단 및 기존 연결 종료
    console.log('🔄 Closing server...');
    await new Promise((resolve) => {
      server.close((err) => {
        if (err) {
          console.error('❌ Error closing server:', err);
        } else {
          console.log('✅ HTTP Server closed');
        }
        resolve();
      });
    });
    
    // 2. Socket.IO 연결 강제 종료
    console.log('🔄 Closing Socket.IO connections...');
    const sockets = await io.fetchSockets();
    for (const socket of sockets) {
      socket.disconnect(true);
    }
    io.close();
    console.log('✅ Socket.IO closed');
    
    // 3. 모든 ChangeStream 강제 종료
    console.log('🔄 Closing ChangeStreams...');
    for (const [collectionKey, changeStream] of activeChangeStreams.entries()) {
      console.log(`🔴 Closing ChangeStream for ${collectionKey}`);
      try {
        changeStream.close();
      } catch (err) {
        console.error(`❌ Error closing ChangeStream ${collectionKey}:`, err);
      }
    }
    activeChangeStreams.clear();
    console.log('✅ All ChangeStreams closed');
    
    // 4. 클라이언트 연결 정리
    connectedClients.clear();
    clientSubscriptions.clear();
    console.log('✅ Client connections cleared');
    
    // 5. MongoDB 연결 종료
    if (mongoClient) {
      console.log('🔄 Closing MongoDB connection...');
      await mongoClient.close(true); // force close
      console.log('✅ MongoDB connection closed');
    }
    
    // 6. 강제 종료 타이머 취소
    clearTimeout(forceExitTimer);
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    clearTimeout(forceExitTimer);
    process.exit(1);
  }
};

// 여러 종료 시그널 처리
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

// 예상치 못한 에러로 인한 종료
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

startServer();