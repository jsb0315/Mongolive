// API client for MongoDB Live application
import { io, Socket } from 'socket.io-client';

const API_BASE_URL = process.env.REACT_APP_API_URL || `http://${process.env.REACT_APP_IP}:${process.env.API_PORT || 31501}`;

export interface APIDatabase {
  name: string;
  sizeOnDisk: number;
  collections: APICollection[];
  error?: string;
}

export interface APICollection {
  name: string;
  type: string;
  options: any;
  documentCount?: number; // For optimized summary endpoint
}

export interface APIDocumentSummary {
  _id: any;
  fieldCount: number;
}

export interface APICollectionSummary {
  name: string;
  database: string;
  totalDocuments: number;
  documents: APIDocumentSummary[];
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// WebSocket/ChangeStream 관련 인터페이스
export interface ChangeStreamEvent {
  timestamp: string;
  collectionKey: string;
  operationType: 'insert' | 'update' | 'delete' | 'replace' | 'drop' | 'rename' | 'dropDatabase' | 'invalidate';
  documentKey: { _id: any };
  fullDocument?: any;
  fullDocumentBeforeChange?: any;
  updateDescription?: {
    updatedFields?: Record<string, any>;
    removedFields?: string[];
  };
  updatedPaths?: {
    path: string;
    value: any;
    segments: string[];
    depth: number;
  }[];
  clusterTime?: any;
}

export interface RealtimeSubscriptionOptions {
  dbName: string;
  collectionName: string;
  query?: string;
  projection?: string;
  sort?: string;
  limit?: number;
  skip?: number;
}

export interface RealtimeEventHandlers {
  onData?: (data: any) => void;
  onChange?: (change: ChangeStreamEvent) => void;
  onError?: (error: Error) => void;
  onSubscribed?: (info: { collectionKey: string; message: string }) => void;
  onUnsubscribed?: (info: { collectionKey: string; message: string }) => void;
}

// MongoDB 서버 연결 상태 모니터링 인터페이스
export interface MongoDBStatus {
  connected: boolean;
  serverInfo?: {
    version: string;
    uptime: number;
    host: string;
    process: string;
    connections: {
      current: number;
      available: number;
      totalCreated: number;
    };
    memory: {
      resident: number;
      virtual: number;
      mapped: number;
    };
    network: {
      bytesIn: number;
      bytesOut: number;
      numRequests: number;
    };
  };
  stats?: {
    totalDatabases: number;
    totalSize: number;
    storageEngine: string;
  };
  error?: string;
}

export interface MongoDBStatusChangeHandler {
  onStatusChange?: (status: MongoDBStatus) => void;
  onError?: (error: Error) => void;
}

export class APIClient {
  private baseURL: string;
  private socket: Socket | null = null;
  private subscriptions: Map<string, RealtimeEventHandlers> = new Map();
  
  // MongoDB 상태 모니터링 관련 필드
  private mongoStatusHandler: MongoDBStatusChangeHandler | null = null;
  private mongoStatusPollInterval: NodeJS.Timeout | null = null;
  private lastKnownMongoStatus: MongoDBStatus | null = null;
  private mongoStatusPollIntervalMs: number = 10000; // 10초마다 폴링

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Fetch all databases (original)
  async getDatabases(): Promise<APIDatabase[]> {
    const response = await this.request<APIResponse<APIDatabase[]>>('/api/databases');
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch databases');
    }
    return response.data || [];
  }

  // Fetch all databases with collection document counts (optimized)
  async getDatabasesSummary(): Promise<APIDatabase[]> {
    const response = await this.request<APIResponse<APIDatabase[]>>('/api/databases/summary');
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch databases summary');
    }
    return response.data || [];
  }

  // Fetch collection summary with document IDs and field counts (optimized)
  async getCollectionSummary(databaseName: string, collectionName: string): Promise<APICollectionSummary> {
    const response = await this.request<APIResponse<APICollectionSummary>>(
      `/api/databases/${encodeURIComponent(databaseName)}/collections/${encodeURIComponent(collectionName)}/summary`
    );
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch collection summary');
    }
    return response.data!;
  }

  // Fetch specific document by ID (optimized)
  async getDocument(databaseName: string, collectionName: string, documentId: string): Promise<any> {
    const response = await this.request<APIResponse<any>>(
      `/api/databases/${encodeURIComponent(databaseName)}/collections/${encodeURIComponent(collectionName)}/documents/${encodeURIComponent(documentId)}`
    );
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch document');
    }
    return response.data;
  }

  // Update specific document by ID
  async updateDocument(databaseName: string, collectionName: string, documentId: string, updateOperation: any): Promise<APIResponse<any>> {
    const response = await this.request<APIResponse<any>>(
      `/api/databases/${encodeURIComponent(databaseName)}/collections/${encodeURIComponent(collectionName)}/documents/${encodeURIComponent(documentId)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateOperation),
      }
    );
    return response;
  }

  // Fetch collections for a specific database
  async getCollections(databaseName: string): Promise<APICollection[]> {
    const databases = await this.getDatabases();
    const database = databases.find(db => db.name === databaseName);
    return database?.collections || [];
  }

  // Fetch documents from a specific collection
  async getDocuments(databaseName: string, collectionName: string, page: number = 1, limit: number = 20) {
    const response = await this.request<APIResponse<any>>(
      `/api/databases/${encodeURIComponent(databaseName)}/collections/${encodeURIComponent(collectionName)}/documents?page=${page}&limit=${limit}`
    );
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch documents');
    }
    return response.data;
  }

  // Fetch collection details
  async getCollectionDetails(databaseName: string, collectionName: string) {
    const response = await this.request<APIResponse<any>>(
      `/api/databases/${encodeURIComponent(databaseName)}/collections/${encodeURIComponent(collectionName)}`
    );
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch collection details');
    }
    return response.data;
  }

  // ===================== WebSocket 실시간 기능 =====================

  // WebSocket 연결 초기화
  private initializeSocket(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    this.socket = io(this.baseURL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: false,
    });

    // 연결 이벤트 핸들러
    this.socket.on('connect', () => {
      console.log('🟢 WebSocket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔴 WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
    });

    // 서버에서 오는 실시간 데이터 처리
    this.socket.on('data', (data) => {
      this.handleRealtimeData(data);
    });

    this.socket.on('dataUpdate', (data) => {
      this.handleRealtimeChange(data);
    });

    this.socket.on('subscribed', (info) => {
      this.handleSubscribed(info);
    });

    this.socket.on('unsubscribed', (info) => {
      this.handleUnsubscribed(info);
    });

    this.socket.on('error', (error) => {
      this.handleRealtimeError(error);
    });

    return this.socket;
  }

  // 실시간 데이터 처리
  private handleRealtimeData(data: any) {
    const { collectionKey } = data;
    const handlers = this.subscriptions.get(collectionKey);
    if (handlers?.onData) {
      handlers.onData(data);
    }
  }

  // 실시간 변경사항 처리
  private handleRealtimeChange(data: any) {
    const { change, collectionKey } = data;
    const handlers = this.subscriptions.get(collectionKey || change?.collectionKey);
    if (handlers?.onChange && change) {
      handlers.onChange(change);
    }
    if (handlers?.onData && data.data) {
      handlers.onData(data);
    }
  }

  // 구독 성공 처리
  private handleSubscribed(info: { collectionKey: string; message: string }) {
    const handlers = this.subscriptions.get(info.collectionKey);
    if (handlers?.onSubscribed) {
      handlers.onSubscribed(info);
    }
  }

  // 구독 해제 처리
  private handleUnsubscribed(info: { collectionKey: string; message: string }) {
    const handlers = this.subscriptions.get(info.collectionKey);
    if (handlers?.onUnsubscribed) {
      handlers.onUnsubscribed(info);
    }
  }

  // 실시간 에러 처리
  private handleRealtimeError(error: any) {
    console.error('❌ Realtime error:', error);
    // 모든 구독에 에러 전파
    this.subscriptions.forEach((handlers, collectionKey) => {
      if (handlers.onError) {
        const errorObj = error instanceof Error ? error : new Error(error.error || error.message || 'Unknown realtime error');
        handlers.onError(errorObj);
      }
    });
  }

  // 컬렉션 실시간 구독
  subscribeToCollection(options: RealtimeSubscriptionOptions, handlers: RealtimeEventHandlers): string {
    const socket = this.initializeSocket();
    const collectionKey = `${options.dbName}.${options.collectionName}`;
    
    // 핸들러 저장
    this.subscriptions.set(collectionKey, handlers);
    
    // 서버에 구독 요청
    socket.emit('subscribe', {
      dbName: options.dbName,
      collectionName: options.collectionName,
      query: options.query || '{}',
      projection: options.projection || '{}',
      sort: options.sort || '{}',
      limit: options.limit || 20,
      skip: options.skip || 0
    });

    console.log(`📡 Subscribing to ${collectionKey}`);
    return collectionKey;
  }

  // 컬렉션 구독 해제
  unsubscribeFromCollection(dbName: string, collectionName: string): void {
    const collectionKey = `${dbName}.${collectionName}`;
    
    if (this.socket && this.socket.connected) {
      this.socket.emit('unsubscribe', {
        dbName,
        collectionName
      });
    }
    
    // 로컬 구독 정보 제거
    this.subscriptions.delete(collectionKey);
    console.log(`📡 Unsubscribed from ${collectionKey}`);
  }

  // 모든 구독 해제
  unsubscribeAll(): void {
    this.subscriptions.forEach((handlers, collectionKey) => {
      const [dbName, collectionName] = collectionKey.split('.');
      this.unsubscribeFromCollection(dbName, collectionName);
    });
  }

  // WebSocket 연결 해제
  disconnect(): void {
    if (this.socket) {
      this.unsubscribeAll();
      this.socket.disconnect();
      this.socket = null;
      console.log('🔴 WebSocket disconnected manually');
    }
    
    // MongoDB 상태 모니터링도 중지
    this.stopMongoDBStatusMonitoring();
  }

  // WebSocket 연결 상태 확인
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // 현재 구독 목록 반환
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  // ===================== MongoDB 서버 상태 모니터링 =====================

  // MongoDB 서버 상태 한 번 조회
  async getMongoDBStatus(): Promise<MongoDBStatus> {
    try {
      const response = await this.request<APIResponse<MongoDBStatus>>('/api/mongodb/status');
      if (!response.success) {
        throw new Error(response.error || 'Failed to get MongoDB status');
      }
      return response.data!;
    } catch (error) {
      console.error('❌ Failed to get MongoDB status:', error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // MongoDB 서버 상태 실시간 모니터링 시작
  startMongoDBStatusMonitoring(handler: MongoDBStatusChangeHandler, pollIntervalMs: number = 10000): void {
    // 기존 모니터링 중지
    this.stopMongoDBStatusMonitoring();
    
    this.mongoStatusHandler = handler;
    this.mongoStatusPollIntervalMs = pollIntervalMs;

    // 초기 상태 확인
    this.checkMongoDBStatus();

    // 주기적 상태 확인 시작
    this.mongoStatusPollInterval = setInterval(() => {
      this.checkMongoDBStatus();
    }, this.mongoStatusPollIntervalMs);

    console.log(`🟢 MongoDB status monitoring started (interval: ${pollIntervalMs}ms)`);
  }

  // MongoDB 서버 상태 모니터링 중지
  stopMongoDBStatusMonitoring(): void {
    if (this.mongoStatusPollInterval) {
      clearInterval(this.mongoStatusPollInterval);
      this.mongoStatusPollInterval = null;
      console.log('🔴 MongoDB status monitoring stopped');
    }
    this.mongoStatusHandler = null;
    this.lastKnownMongoStatus = null;
  }

  // MongoDB 상태 확인 및 변경사항 알림
  private async checkMongoDBStatus(): Promise<void> {
    try {
      const currentStatus = await this.getMongoDBStatus();
      
      // 상태 변경 확인
      const hasChanged = !this.lastKnownMongoStatus || 
                        this.lastKnownMongoStatus.connected !== currentStatus.connected ||
                        this.lastKnownMongoStatus.error !== currentStatus.error;

      // DB 연결이 끊어진 경우 자동으로 모든 ChangeStream 구독 해제
      if (this.lastKnownMongoStatus?.connected && !currentStatus.connected) {
        console.log('🔴 MongoDB connection lost - automatically unsubscribing all ChangeStreams');
        this.unsubscribeAll();
      }

      if (hasChanged && this.mongoStatusHandler?.onStatusChange) {
        this.mongoStatusHandler.onStatusChange(currentStatus);
      }

      this.lastKnownMongoStatus = currentStatus;
    } catch (error) {
      console.error('❌ Error during MongoDB status check:', error);
      
      // 네트워크 에러 등으로 상태 확인이 실패한 경우도 연결 끊어진 것으로 처리
      const disconnectedStatus: MongoDBStatus = {
        connected: false,
        error: error instanceof Error ? error.message : 'Status check failed'
      };
      
      // 이전에 연결되어 있었다면 ChangeStream 정리
      if (this.lastKnownMongoStatus?.connected) {
        console.log('🔴 MongoDB status check failed - unsubscribing all ChangeStreams');
        this.unsubscribeAll();
      }
      
      this.lastKnownMongoStatus = disconnectedStatus;
      
      if (this.mongoStatusHandler?.onError) {
        const errorObj = error instanceof Error ? error : new Error('Unknown status check error');
        this.mongoStatusHandler.onError(errorObj);
      }
      
      // 상태 변경 핸들러에도 알림
      if (this.mongoStatusHandler?.onStatusChange) {
        this.mongoStatusHandler.onStatusChange(disconnectedStatus);
      }
    }
  }

  // 마지막으로 알려진 MongoDB 상태 반환
  getLastKnownMongoDBStatus(): MongoDBStatus | null {
    return this.lastKnownMongoStatus;
  }

  // MongoDB 상태 모니터링 실행 중인지 확인
  isMongoDBStatusMonitoringActive(): boolean {
    return this.mongoStatusPollInterval !== null;
  }

  // ===================== ChangeStream 헬퍼 메서드 =====================

  // 변경된 필드의 깊은 경로 분석 (클라이언트 사이드)
  static findDeepestPaths(updatedFields: Record<string, any>): Array<{
    path: string;
    value: any;
    segments: string[];
    depth: number;
  }> {
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

  // 변경사항 타입 체크
  static isInsert(change: ChangeStreamEvent): boolean {
    return change.operationType === 'insert';
  }

  static isUpdate(change: ChangeStreamEvent): boolean {
    return change.operationType === 'update';
  }

  static isDelete(change: ChangeStreamEvent): boolean {
    return change.operationType === 'delete';
  }

  static isReplace(change: ChangeStreamEvent): boolean {
    return change.operationType === 'replace';
  }

  // 변경사항이 특정 문서에 해당하는지 확인
  static changeAffectsDocument(change: ChangeStreamEvent, documentId: any): boolean {
    return change.documentKey?._id?.toString() === documentId?.toString();
  }

  // 변경사항이 특정 필드에 해당하는지 확인
  static changeAffectsField(change: ChangeStreamEvent, fieldPath: string): boolean {
    if (!change.updateDescription?.updatedFields) return false;
    
    const updatedFields = Object.keys(change.updateDescription.updatedFields);
    return updatedFields.some(field => 
      field.startsWith(fieldPath) || fieldPath.startsWith(field)
    );
  }
}

// Export singleton instance
export const apiClient = new APIClient();

// Helper function to convert API database to UI database format
export function convertAPIToUIDatabase(apiDb: APIDatabase): import('../data/mockData').Database {
  return {
    name: apiDb.name,
    totalSize: formatBytes(apiDb.sizeOnDisk),
    totalCollections: apiDb.collections.length,
    collections: apiDb.collections.map(col => ({
      name: col.name,
      documentCount: col.documentCount || 0, // Use actual count from optimized endpoint
      size: 'Unknown', // Will be loaded separately when needed
      indexes: 0, // Will be loaded separately when needed
      database: apiDb.name,
    })),
  };
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
