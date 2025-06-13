export interface Collection {
  name: string;
  documentCount: number;
  size: string;
  indexes: number;
  database: string; // 데이터베이스 정보 추가
}

export interface Database {
  name: string;
  collections: Collection[];
  totalSize: string;
  totalCollections: number;
}

export interface Document {
  _id: string;
  [key: string]: any;
}

export interface ChangeStreamLog {
  id: string;
  timestamp: string;
  operationType: 'insert' | 'update' | 'delete' | 'replace';
  database: string; // 데이터베이스 정보 추가
  collection: string;
  documentKey: { _id: string };
  fullDocument?: any;
}

export interface ConnectedClient {
  id: string;
  host: string;
  port: number;
  applicationName: string;
  connectionTime: string;
  isActive: boolean;
}

export interface PerformanceMetrics {
  cpu: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  connections: {
    current: number;
    available: number;
    totalCreated: number;
  };
  operations: {
    insert: number;
    query: number;
    update: number;
    delete: number;
  };
}

// 데이터베이스별 컬렉션 구성
export const mockDatabases: Database[] = [
  {
    name: 'Client',
    totalSize: '35.1 MB',
    totalCollections: 5,
    collections: [
      { name: 'users', documentCount: 15420, size: '2.3 MB', indexes: 3, database: 'Client' },
      { name: 'addresses', documentCount: 18920, size: '1.8 MB', indexes: 2, database: 'Client' },
      { name: 'inventory', documentCount: 8932, size: '3.2 MB', indexes: 4, database: 'Client' },
      { name: 'payments', documentCount: 45678, size: '15.6 MB', indexes: 6, database: 'Client' },
      { name: 'orders', documentCount: 23456, size: '12.1 MB', indexes: 4, database: 'Client' },
    ]
  },
  {
    name: 'Product',
    totalSize: '14.4 MB',
    totalCollections: 3,
    collections: [
      { name: 'products', documentCount: 8932, size: '5.7 MB', indexes: 5, database: 'Product' },
      { name: 'categories', documentCount: 156, size: '45 KB', indexes: 2, database: 'Product' },
      { name: 'reviews', documentCount: 34567, size: '8.9 MB', indexes: 3, database: 'Product' },
    ]
  },
  {
    name: 'Management',
    totalSize: '33.4 MB',
    totalCollections: 2,
    collections: [
      { name: 'notifications', documentCount: 89456, size: '4.5 MB', indexes: 3, database: 'Management' },
      { name: 'audit_logs', documentCount: 156789, size: '28.9 MB', indexes: 5, database: 'Management' },
    ]
  }
];

// 전체 컬렉션 목록 (하위 호환성을 위해 유지)
export const mockCollections: Collection[] = mockDatabases.flatMap(db => db.collections);

// Reference로 사용할 서브컬렉션 데이터
export const mockSubCollections: { [key: string]: Document[] } = {
  // Client DB - 사용자 주소 서브컬렉션
  'Client/users/507f1f77bcf86cd799439011/addresses': [
    { _id: '60a7b7e1c5f4a2b3d4e5f601', type: 'home', street: '123 Main St', city: 'New York', zipCode: '10001', isDefault: true },
    { _id: '60a7b7e1c5f4a2b3d4e5f602', type: 'work', street: '456 Office Ave', city: 'New York', zipCode: '10002', isDefault: false },
  ],
  'Client/users/507f1f77bcf86cd799439012/addresses': [
    { _id: '60a7b7e1c5f4a2b3d4e5f603', type: 'home', street: '789 Elm St', city: 'Los Angeles', zipCode: '90210', isDefault: true },
  ],

  // Client DB - 주문 아이템 서브컬렉션
  'Client/orders/507f1f77bcf86cd799439031/items': [
    { _id: '60a7b7e1c5f4a2b3d4e5f611', productId: '507f1f77bcf86cd799439021', quantity: 1, price: 2399.99, discount: 0 },
    { _id: '60a7b7e1c5f4a2b3d4e5f612', productId: '507f1f77bcf86cd799439023', quantity: 1, price: 249.99, discount: 0 },
  ],
  'Client/orders/507f1f77bcf86cd799439032/items': [
    { _id: '60a7b7e1c5f4a2b3d4e5f613', productId: '507f1f77bcf86cd799439022', quantity: 1, price: 999.99, discount: 50 },
  ],

  // Client DB - 결제 히스토리 서브컬렉션
  'Client/payments/507f1f77bcf86cd799439051/history': [
    { _id: '60a7b7e1c5f4a2b3d4e5f651', action: 'charge', amount: 2649.98, status: 'success', timestamp: '2024-01-18T16:45:30Z' },
    { _id: '60a7b7e1c5f4a2b3d4e5f652', action: 'refund', amount: -100.00, status: 'pending', timestamp: '2024-01-19T10:20:00Z' },
  ],

  // Product DB - 제품 리뷰 서브컬렉션
  'Product/products/507f1f77bcf86cd799439021/reviews': [
    { _id: '60a7b7e1c5f4a2b3d4e5f621', userId: '507f1f77bcf86cd799439011', rating: 5, comment: 'Amazing performance, worth every penny!', createdAt: '2024-01-15T12:30:00Z' },
    { _id: '60a7b7e1c5f4a2b3d4e5f622', userId: '507f1f77bcf86cd799439012', rating: 4, comment: 'Great laptop but expensive', createdAt: '2024-01-16T15:45:00Z' },
  ],
  'Product/products/507f1f77bcf86cd799439022/reviews': [
    { _id: '60a7b7e1c5f4a2b3d4e5f623', userId: '507f1f77bcf86cd799439013', rating: 5, comment: 'Best iPhone ever!', createdAt: '2024-01-17T10:20:00Z' },
  ],

  // Product DB - 제품 재고 히스토리 서브컬렉션
  'Product/products/507f1f77bcf86cd799439021/inventory_history': [
    { _id: '60a7b7e1c5f4a2b3d4e5f641', action: 'restock', quantity: 50, previousStock: 25, newStock: 75, timestamp: '2024-01-15T08:00:00Z' },
    { _id: '60a7b7e1c5f4a2b3d4e5f642', action: 'sale', quantity: -1, previousStock: 75, newStock: 74, timestamp: '2024-01-18T16:45:00Z' },
  ],

  // Management DB - 사용자 알림 서브컬렉션
  'Management/notifications/507f1f77bcf86cd799439011/user_notifications': [
    { _id: '60a7b7e1c5f4a2b3d4e5f631', type: 'order', title: 'Order Shipped', message: 'Your order #507f1f77bcf86cd799439031 has been shipped', read: false, createdAt: '2024-01-19T14:30:00Z' },
    { _id: '60a7b7e1c5f4a2b3d4e5f632', type: 'promotion', title: 'Special Offer', message: '20% off on all electronics', read: true, createdAt: '2024-01-18T09:15:00Z' },
  ],

  // Management DB - 감사 로그 상세 서브컬렉션
  'Management/audit_logs/507f1f77bcf86cd799439071/details': [
    { _id: '60a7b7e1c5f4a2b3d4e5f671', field: 'email', oldValue: 'old@example.com', newValue: 'new@example.com', changedBy: '507f1f77bcf86cd799439011' },
    { _id: '60a7b7e1c5f4a2b3d4e5f672', field: 'role', oldValue: 'user', newValue: 'admin', changedBy: '507f1f77bcf86cd799439011' },
  ],
};

// 데이터베이스별 문서 목록
export const mockDocuments: { [key: string]: Document[] } = {
  // Client Database Documents
  'Client/users': [
    { 
      _id: '507f1f77bcf86cd799439011', 
      name: 'John Doe', 
      email: 'john@example.com', 
      role: 'admin', 
      createdAt: '2024-01-15T10:30:00Z',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        avatar: 'https://example.com/avatars/john.jpg',
        phoneNumber: '+1-555-0123',
        dateOfBirth: '1985-06-15',
        preferences: {
          language: 'en',
          timezone: 'America/New_York',
          notifications: {
            email: true,
            sms: false,
            push: true
          }
        }
      },
      // Cross-database references
      addresses: ['60a7b7e1c5f4a2b3d4e5f601', '60a7b7e1c5f4a2b3d4e5f602'],
      orderHistory: ['507f1f77bcf86cd799439031'],
      lastLoginAt: '2024-01-20T09:15:00Z',
      isActive: true
    },
    { 
      _id: '507f1f77bcf86cd799439012', 
      name: 'Jane Smith', 
      email: 'jane@example.com', 
      role: 'user', 
      createdAt: '2024-01-16T14:22:00Z',
      profile: {
        firstName: 'Jane',
        lastName: 'Smith',
        avatar: 'https://example.com/avatars/jane.jpg',
        phoneNumber: '+1-555-0124',
        dateOfBirth: '1990-03-22',
        preferences: {
          language: 'en',
          timezone: 'America/Los_Angeles',
          notifications: {
            email: true,
            sms: true,
            push: false
          }
        }
      },
      addresses: ['60a7b7e1c5f4a2b3d4e5f603'],
      orderHistory: ['507f1f77bcf86cd799439032'],
      lastLoginAt: '2024-01-19T18:30:00Z',
      isActive: true
    },
  ],

  'Client/orders': [
    { 
      _id: '507f1f77bcf86cd799439031', 
      userId: '507f1f77bcf86cd799439011', // Reference to Client/users
      total: 2649.98, 
      status: 'completed', 
      orderDate: '2024-01-18T16:45:00Z',
      shippingAddress: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA'
      },
      // Cross-database reference to Product/products
      productReferences: ['507f1f77bcf86cd799439021', '507f1f77bcf86cd799439023'],
      items: ['60a7b7e1c5f4a2b3d4e5f611', '60a7b7e1c5f4a2b3d4e5f612'],
      payment: {
        method: 'credit_card',
        cardLast4: '4242',
        transactionId: 'txn_1234567890',
        status: 'paid',
        paidAt: '2024-01-18T16:45:30Z'
      },
      createdAt: '2024-01-18T16:45:00Z',
      updatedAt: '2024-01-19T14:30:00Z'
    },
  ],

  'Client/addresses': [
    {
      _id: '60a7b7e1c5f4a2b3d4e5f601',
      userId: '507f1f77bcf86cd799439011', // Reference to Client/users
      type: 'home',
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
      isDefault: true,
      createdAt: '2024-01-15T10:30:00Z'
    },
  ],

  'Client/payments': [
    {
      _id: '507f1f77bcf86cd799439051',
      orderId: '507f1f77bcf86cd799439031', // Reference to Client/orders
      userId: '507f1f77bcf86cd799439011', // Reference to Client/users
      amount: 2649.98,
      method: 'credit_card',
      status: 'completed',
      transactionId: 'txn_1234567890',
      createdAt: '2024-01-18T16:45:30Z'
    },
  ],

  'Client/inventory': [
    {
      _id: '507f1f77bcf86cd799439061',
      productId: '507f1f77bcf86cd799439021', // Cross-database reference to Product/products
      sku: 'MBP-M3-14-SG-512',
      stock: 74,
      reserved: 5,
      reorderLevel: 10,
      location: 'Warehouse A',
      lastUpdated: '2024-01-18T16:45:00Z'
    },
  ],

  // Product Database Documents
  'Product/products': [
    { 
      _id: '507f1f77bcf86cd799439021', 
      name: 'MacBook Pro', 
      price: 2399.99, 
      category: 'Electronics', 
      inStock: true,
      categoryId: '507f1f77bcf86cd799439041', // Reference to Product/categories
      specifications: {
        processor: 'Apple M3 Pro',
        memory: '16GB',
        storage: '512GB SSD',
        display: '14-inch Liquid Retina XDR',
        weight: '3.5 lbs',
        color: 'Space Gray'
      },
      // Cross-database reference to Client/inventory
      inventoryId: '507f1f77bcf86cd799439061',
      reviews: ['60a7b7e1c5f4a2b3d4e5f621', '60a7b7e1c5f4a2b3d4e5f622'],
      rating: {
        average: 4.5,
        count: 128
      },
      images: [
        'https://example.com/products/mbp-1.jpg',
        'https://example.com/products/mbp-2.jpg'
      ],
      createdAt: '2024-01-10T12:00:00Z',
      updatedAt: '2024-01-18T16:45:00Z'
    },
  ],

  'Product/categories': [
    {
      _id: '507f1f77bcf86cd799439041',
      name: 'Electronics',
      description: 'Electronic devices and accessories',
      slug: 'electronics',
      parentCategory: null,
      subcategories: ['507f1f77bcf86cd799439042'],
      image: 'https://example.com/categories/electronics.jpg',
      isActive: true,
      sortOrder: 1,
      metaData: {
        title: 'Electronics - Premium Tech Products',
        description: 'Shop the latest electronics including smartphones, laptops, and accessories',
        keywords: ['electronics', 'tech', 'gadgets', 'smartphones', 'laptops']
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T12:00:00Z'
    },
  ],

  'Product/reviews': [
    {
      _id: '60a7b7e1c5f4a2b3d4e5f621',
      productId: '507f1f77bcf86cd799439021', // Reference to Product/products
      // Cross-database references
      userId: '507f1f77bcf86cd799439011', // Reference to Client/users
      orderId: '507f1f77bcf86cd799439031', // Reference to Client/orders
      rating: 5,
      title: 'Exceptional Performance',
      comment: 'Amazing performance, worth every penny! The M3 Pro chip handles everything I throw at it.',
      pros: ['Fast performance', 'Great display', 'Long battery life'],
      cons: ['Expensive', 'Limited ports'],
      isVerifiedPurchase: true,
      helpfulVotes: 15,
      reportedCount: 0,
      status: 'approved',
      images: ['https://example.com/reviews/review1-1.jpg'],
      createdAt: '2024-01-15T12:30:00Z',
      updatedAt: '2024-01-15T12:30:00Z'
    },
  ],

  // Management Database Documents
  'Management/notifications': [
    {
      _id: '60a7b7e1c5f4a2b3d4e5f631',
      // Cross-database reference
      userId: '507f1f77bcf86cd799439011', // Reference to Client/users
      type: 'order',
      title: 'Order Shipped',
      message: 'Your order #507f1f77bcf86cd799439031 has been shipped',
      priority: 'medium',
      channels: ['email', 'push'],
      read: false,
      readAt: null,
      createdAt: '2024-01-19T14:30:00Z',
      expiresAt: '2024-02-19T14:30:00Z'
    },
  ],

  'Management/audit_logs': [
    {
      _id: '507f1f77bcf86cd799439071',
      database: 'Client',
      collection: 'users',
      documentId: '507f1f77bcf86cd799439011', // Cross-database reference
      action: 'update',
      // Cross-database reference
      performedBy: '507f1f77bcf86cd799439011', // Reference to Client/users
      changes: {
        email: {
          from: 'old@example.com',
          to: 'john@example.com'
        },
        role: {
          from: 'user',
          to: 'admin'
        }
      },
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0...',
      timestamp: '2024-01-20T10:15:30Z',
      severity: 'medium'
    },
  ],
};

// 데이터베이스별 ChangeStream 로그
export const mockChangeStreamLogs: ChangeStreamLog[] = [
  {
    id: '1',
    timestamp: '2024-01-20T10:30:15Z',
    operationType: 'insert',
    database: 'Client',
    collection: 'users',
    documentKey: { _id: '507f1f77bcf86cd799439014' },
    fullDocument: { 
      name: 'Alice Brown', 
      email: 'alice@example.com', 
      role: 'user',
      addresses: [],
      orderHistory: []
    }
  },
  {
    id: '2',
    timestamp: '2024-01-20T10:28:42Z',
    operationType: 'update',
    database: 'Product',
    collection: 'products',
    documentKey: { _id: '507f1f77bcf86cd799439022' },
    fullDocument: { inStock: false }
  },
  {
    id: '3',
    timestamp: '2024-01-20T10:25:18Z',
    operationType: 'delete',
    database: 'Client',
    collection: 'orders',
    documentKey: { _id: '507f1f77bcf86cd799439033' },
  },
  {
    id: '4',
    timestamp: '2024-01-20T10:20:05Z',
    operationType: 'insert',
    database: 'Management',
    collection: 'notifications',
    documentKey: { _id: '60a7b7e1c5f4a2b3d4e5f633' },
    fullDocument: {
      userId: '507f1f77bcf86cd799439011',
      type: 'system',
      title: 'System Maintenance',
      message: 'Scheduled maintenance tonight at 2 AM'
    }
  },
  {
    id: '5',
    timestamp: '2024-01-20T10:15:30Z',
    operationType: 'insert',
    database: 'Management',
    collection: 'audit_logs',
    documentKey: { _id: '507f1f77bcf86cd799439072' },
    fullDocument: {
      database: 'Client',
      collection: 'users',
      action: 'login',
      performedBy: '507f1f77bcf86cd799439011'
    }
  },
];

export const mockConnectedClients: ConnectedClient[] = [
  {
    id: '1',
    host: '192.168.1.100',
    port: 27017,
    applicationName: 'MongoDB Compass',
    connectionTime: '2024-01-20T09:15:00Z',
    isActive: true
  },
  {
    id: '2',
    host: '10.0.0.25',
    port: 27017,
    applicationName: 'Node.js App',
    connectionTime: '2024-01-20T08:30:00Z',
    isActive: true
  },
  {
    id: '3',
    host: '172.16.0.10',
    port: 27017,
    applicationName: 'Python Script',
    connectionTime: '2024-01-20T07:45:00Z',
    isActive: false
  },
  {
    id: '4',
    host: '14.55.202.84',
    port: 27017,
    applicationName: 'MongoDB Admin Console',
    connectionTime: '2024-01-20T06:00:00Z',
    isActive: true
  },
];

export const mockPerformanceMetrics: PerformanceMetrics = {
  cpu: 23.5,
  memory: {
    used: 1.8,
    total: 8.0,
    percentage: 22.5
  },
  connections: {
    current: 42,
    available: 158,
    totalCreated: 1247
  },
  operations: {
    insert: 145,
    query: 892,
    update: 234,
    delete: 12
  }
};

// 헬퍼 함수들
export const getSubCollection = (path: string): Document[] => {
  return mockSubCollections[path] || [];
};

export const findDocumentByReference = (database: string, collectionName: string, id: string): Document | null => {
  const key = `${database}/${collectionName}`;
  const documents = mockDocuments[key] || [];
  return documents.find(doc => doc._id === id) || null;
};

export const getDatabaseByName = (name: string): Database | null => {
  return mockDatabases.find(db => db.name === name) || null;
};

export const getCollectionsByDatabase = (databaseName: string): Collection[] => {
  const database = getDatabaseByName(databaseName);
  return database ? database.collections : [];
};

// 데이터베이스 간 Reference 관계 매핑
export const crossDatabaseReferenceMap = {
  'Client/users': {
    addresses: 'Client/addresses',
    orderHistory: 'Client/orders',
    notifications: 'Management/notifications' // Cross-database reference
  },
  'Client/orders': {
    userId: 'Client/users',
    productReferences: 'Product/products', // Cross-database reference
    items: (orderId: string) => `Client/orders/${orderId}/items`
  },
  'Client/payments': {
    orderId: 'Client/orders',
    userId: 'Client/users'
  },
  'Client/inventory': {
    productId: 'Product/products' // Cross-database reference
  },
  'Product/products': {
    categoryId: 'Product/categories',
    inventoryId: 'Client/inventory', // Cross-database reference
    reviews: 'Product/reviews'
  },
  'Product/reviews': {
    productId: 'Product/products',
    userId: 'Client/users', // Cross-database reference
    orderId: 'Client/orders' // Cross-database reference
  },
  'Management/notifications': {
    userId: 'Client/users' // Cross-database reference
  },
  'Management/audit_logs': {
    documentId: (database: string, collection: string) => `${database}/${collection}`, // Dynamic cross-database reference
    performedBy: 'Client/users' // Cross-database reference
  }
};