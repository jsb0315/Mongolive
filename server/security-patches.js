// MongoDB 보안 강화 패치들

// 1. 쿼리 검증 및 필터링
const ALLOWED_OPERATORS = [
  '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin',
  '$exists', '$type', '$regex', '$text', '$and', '$or', '$not'
];

const DANGEROUS_OPERATORS = [
  '$where', '$expr', '$function', '$accumulator', '$js'
];

function sanitizeQuery(query) {
  if (typeof query !== 'object' || query === null) {
    return {};
  }

  // 위험한 연산자 제거
  for (const dangerousOp of DANGEROUS_OPERATORS) {
    if (query[dangerousOp]) {
      throw new Error(`Operator ${dangerousOp} is not allowed`);
    }
  }

  // 재귀적으로 중첩된 객체 검사
  const sanitized = {};
  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith('$') && !ALLOWED_OPERATORS.includes(key)) {
      throw new Error(`Operator ${key} is not allowed`);
    }
    
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = Array.isArray(value) 
        ? value.map(item => typeof item === 'object' ? sanitizeQuery(item) : item)
        : sanitizeQuery(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// 2. 쿼리 복잡도 제한
function validateQueryComplexity(query, maxDepth = 5, currentDepth = 0) {
  if (currentDepth > maxDepth) {
    throw new Error('Query too complex - maximum nesting depth exceeded');
  }

  if (typeof query === 'object' && query !== null) {
    const keys = Object.keys(query);
    if (keys.length > 20) {
      throw new Error('Query too complex - too many conditions');
    }

    for (const value of Object.values(query)) {
      if (typeof value === 'object' && value !== null) {
        validateQueryComplexity(value, maxDepth, currentDepth + 1);
      }
    }
  }
}

// 3. Rate Limiting
const clientRequestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1분
const MAX_REQUESTS_PER_MINUTE = 100;

function rateLimitMiddleware(req, res, next) {
  const clientIP = req.ip?.replace(/^::ffff:/, '') || '';
  const now = Date.now();
  
  if (!clientRequestCounts.has(clientIP)) {
    clientRequestCounts.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  } else {
    const clientData = clientRequestCounts.get(clientIP);
    
    if (now > clientData.resetTime) {
      // 윈도우 리셋
      clientData.count = 1;
      clientData.resetTime = now + RATE_LIMIT_WINDOW;
    } else {
      clientData.count++;
      
      if (clientData.count > MAX_REQUESTS_PER_MINUTE) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
        });
      }
    }
  }
  
  next();
}

// 4. 시스템 데이터베이스 차단
const SYSTEM_DBS = ['admin', 'config', 'local'];
const SYSTEM_COLLECTIONS = ['system.', 'fs.'];

function validateDatabaseAccess(dbName) {
  if (SYSTEM_DBS.includes(dbName)) {
    throw new Error('Access to system database is not allowed');
  }
}

function validateCollectionAccess(collectionName) {
  if (SYSTEM_COLLECTIONS.some(prefix => collectionName.startsWith(prefix))) {
    throw new Error('Access to system collection is not allowed');
  }
}

// 5. 쿼리 결과 크기 제한
const MAX_DOCUMENT_SIZE = 16 * 1024 * 1024; // 16MB
const MAX_RESULT_COUNT = 1000;

function validateQueryLimits(options) {
  const limit = parseInt(options.limit) || 20;
  const skip = parseInt(options.skip) || 0;
  
  if (limit > MAX_RESULT_COUNT) {
    throw new Error(`Query limit too large. Maximum allowed: ${MAX_RESULT_COUNT}`);
  }
  
  if (skip > 100000) {
    throw new Error('Skip value too large. Use pagination instead');
  }
  
  return { limit, skip };
}

// 6. 입력 크기 제한
function validateInputSize(req, res, next) {
  const contentLength = parseInt(req.headers['content-length']) || 0;
  const MAX_BODY_SIZE = 1024 * 1024; // 1MB
  
  if (contentLength > MAX_BODY_SIZE) {
    return res.status(413).json({
      success: false,
      error: 'Request body too large'
    });
  }
  
  next();
}

// 7. WebSocket 연결 제한
const MAX_CONNECTIONS_PER_IP = 10;
const connectionsByIP = new Map();

function validateWebSocketConnection(socket) {
  const clientIP = socket.handshake.address?.replace(/^::ffff:/, '') || '';
  const currentConnections = connectionsByIP.get(clientIP) || 0;
  
  if (currentConnections >= MAX_CONNECTIONS_PER_IP) {
    socket.emit('error', { 
      error: 'Too many connections from this IP',
      maxConnections: MAX_CONNECTIONS_PER_IP 
    });
    socket.disconnect(true);
    return false;
  }
  
  connectionsByIP.set(clientIP, currentConnections + 1);
  
  socket.on('disconnect', () => {
    const current = connectionsByIP.get(clientIP) || 0;
    if (current <= 1) {
      connectionsByIP.delete(clientIP);
    } else {
      connectionsByIP.set(clientIP, current - 1);
    }
  });
  
  return true;
}

// 8. 안전한 에러 처리
function createSafeError(error, context = 'Operation') {
  console.error(`Security Error [${context}]:`, error);
  
  // 프로덕션에서는 일반적인 에러 메시지만 반환
  if (process.env.NODE_ENV === 'production') {
    return {
      success: false,
      error: 'An error occurred while processing your request',
      timestamp: new Date().toISOString()
    };
  }
  
  // 개발 환경에서는 상세 정보 제공 (단, 민감한 정보는 제외)
  const safeMessage = error.message
    .replace(/mongodb:\/\/[^@]+@/g, 'mongodb://***:***@') // 연결 문자열 마스킹
    .replace(/ObjectId\("[^"]+"\)/g, 'ObjectId("***")'); // ObjectId 마스킹
  
  return {
    success: false,
    error: safeMessage,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  sanitizeQuery,
  validateQueryComplexity,
  rateLimitMiddleware,
  validateDatabaseAccess,
  validateCollectionAccess,
  validateQueryLimits,
  validateInputSize,
  validateWebSocketConnection,
  createSafeError
};
