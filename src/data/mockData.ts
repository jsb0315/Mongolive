import { ObjectId, Decimal128 } from 'bson';

export interface Collection {
  name: string;
  documentCount: number;
  size: string;
  indexes: number;
  database: string;
}

export interface Database {
  name: string;
  collections: Collection[];
  totalSize: string;
  totalCollections: number;
}

export interface MongoDocument {
  _id: ObjectId | string;
  [key: string]: any;
}

export interface ChangeStreamLog {
  _id: ObjectId;
  timestamp: Date;
  operationType: 'insert' | 'update' | 'delete' | 'replace' | 'drop' | 'dropDatabase' | 'rename' | 'invalidate';
  ns: {
    db: string;
    coll: string;
  };
  documentKey: { _id: ObjectId | string };
  fullDocument?: any;
  updateDescription?: {
    updatedFields?: any;
    removedFields?: string[];
  };
  clusterTime: Date;
}

export interface ConnectedClient {
  connectionId: number;
  client: string;
  clientMetadata: {
    driver: {
      name: string;
      version: string;
    };
    os: {
      type: string;
      name: string;
      architecture: string;
      version: string;
    };
    platform: string;
    application?: {
      name: string;
    };
  };
  active: boolean;
  currentOp?: string;
  effectiveUsers: Array<{
    user: string;
    db: string;
  }>;
  runBy: Array<{
    user: string;
    db: string;
  }>;
}

export interface PerformanceMetrics {
  serverStatus: {
    uptime: number;
    uptimeMillis: number;
    localTime: Date;
    connections: {
      current: number;
      available: number;
      totalCreated: number;
    };
    opcounters: {
      insert: number;
      query: number;
      update: number;
      delete: number;
      getmore: number;
      command: number;
    };
    mem: {
      resident: number;
      virtual: number;
      supported: boolean;
    };
    globalLock: {
      totalTime: number;
      lockTime: number;
      currentQueue: {
        total: number;
        readers: number;
        writers: number;
      };
      activeClients: {
        total: number;
        readers: number;
        writers: number;
      };
    };
  };
  dbStats: {
    db: string;
    collections: number;
    views: number;
    objects: number;
    avgObjSize: number;
    dataSize: number;
    storageSize: number;
    indexes: number;
    indexSize: number;
  };
}

// MongoDB 데이터베이스 구성
export const mockDatabases: Database[] = [
  {
    name: 'ecommerce',
    totalSize: '156.8 MB',
    totalCollections: 8,
    collections: [
      { name: 'users', documentCount: 15420, size: '12.3 MB', indexes: 5, database: 'ecommerce' },
      { name: 'products', documentCount: 8932, size: '25.7 MB', indexes: 7, database: 'ecommerce' },
      { name: 'orders', documentCount: 23456, size: '45.2 MB', indexes: 6, database: 'ecommerce' },
      { name: 'categories', documentCount: 156, size: '245 KB', indexes: 3, database: 'ecommerce' },
      { name: 'reviews', documentCount: 34567, size: '18.9 MB', indexes: 4, database: 'ecommerce' },
      { name: 'inventory', documentCount: 8932, size: '8.2 MB', indexes: 4, database: 'ecommerce' },
      { name: 'carts', documentCount: 5247, size: '3.1 MB', indexes: 3, database: 'ecommerce' },
      { name: 'wishlists', documentCount: 12890, size: '2.9 MB', indexes: 2, database: 'ecommerce' },
    ]
  },
  {
    name: 'blog',
    totalSize: '89.4 MB',
    totalCollections: 5,
    collections: [
      { name: 'posts', documentCount: 2456, size: '45.2 MB', indexes: 8, database: 'blog' },
      { name: 'comments', documentCount: 15678, size: '25.6 MB', indexes: 5, database: 'blog' },
      { name: 'authors', documentCount: 234, size: '1.8 MB', indexes: 4, database: 'blog' },
      { name: 'tags', documentCount: 567, size: '345 KB', indexes: 2, database: 'blog' },
      { name: 'categories', documentCount: 89, size: '156 KB', indexes: 2, database: 'blog' },
    ]
  },
  {
    name: 'analytics',
    totalSize: '2.3 GB',
    totalCollections: 4,
    collections: [
      { name: 'page_views', documentCount: 5647890, size: '1.8 GB', indexes: 6, database: 'analytics' },
      { name: 'user_sessions', documentCount: 234567, size: '456 MB', indexes: 5, database: 'analytics' },
      { name: 'events', documentCount: 1234567, size: '89 MB', indexes: 4, database: 'analytics' },
      { name: 'reports', documentCount: 1234, size: '12 MB', indexes: 3, database: 'analytics' },
    ]
  },
  {
    name: 'system',
    totalSize: '45.2 MB',
    totalCollections: 3,
    collections: [
      { name: 'audit_logs', documentCount: 156789, size: '35.9 MB', indexes: 8, database: 'system' },
      { name: 'notifications', documentCount: 89456, size: '7.5 MB', indexes: 4, database: 'system' },
      { name: 'configs', documentCount: 156, size: '1.8 MB', indexes: 2, database: 'system' },
    ]
  }
];

// 전체 컬렉션 목록
export const mockCollections: Collection[] = mockDatabases.flatMap(db => db.collections);

// MongoDB 문서 데이터
export const mockDocuments: { [key: string]: MongoDocument[] } = {
  // E-commerce Database
  'ecommerce/users': [
    {
      _id: new ObjectId('507f1f77bcf86cd799439011'),
      username: 'johndoe123',
      email: 'john.doe@example.com',
      password: '$2b$10$K7L/8Y3i4m9n0O1p2Q3r4S5t6U7v8W9x0Y1z2A3b4C5d6E7f8G9h',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1985-06-15'),
        gender: 'male',
        avatar: {
          url: 'https://cdn.example.com/avatars/507f1f77bcf86cd799439011.jpg',
          uploadedAt: new Date('2024-01-15T10:30:00Z')
        },
        phone: {
          countryCode: '+1',
          number: '5551234567',
          verified: true,
          verifiedAt: new Date('2024-01-15T11:00:00Z')
        }
      },
      addresses: [
        123,
        {
          test: 123
        },
        {
          _id: new ObjectId('60a7b7e1c5f4a2b3d4e5f601'),
          type: 'home',
          isDefault: true,
          recipient: 'John Doe',
          addressLine1: '123 Main Street',
          addressLine2: 'Apt 4B',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
          coordinates: {
            type: 'Point',
            coordinates: [-74.0060, 40.7128] // [longitude, latitude]
          },
          createdAt: new Date('2024-01-15T10:30:00Z')
        },
        {
          _id: new ObjectId('60a7b7e1c5f4a2b3d4e5f602'),
          type: 'work',
          isDefault: false,
          recipient: 'John Doe',
          addressLine1: '456 Business Ave',
          addressLine2: 'Floor 15',
          city: 'New York',
          state: 'NY',
          zipCode: '10002',
          country: 'USA',
          coordinates: {
            type: 'Point',
            coordinates: [-74.0059, 40.7130]
          },
          createdAt: new Date('2024-01-16T09:20:00Z')
        }
      ],
      test : [
        {hello: 'world'},
        {hello: 'universe'},
        {hello: 'galaxy'}
      ],
      preferences: {
        language: 'en-US',
        currency: 'USD',
        timezone: 'America/New_York',
        notifications: {
          email: {
            orderUpdates: true,
            promotions: true,
            newsletter: false
          },
          push: {
            orderUpdates: true,
            promotions: false
          }
        },
        privacy: {
          profileVisibility: 'public',
          showEmail: false,
          allowDataCollection: true
        }
      },
      // References to other documents
      orderHistory: [
        new ObjectId('507f1f77bcf86cd799439011'),
        new ObjectId('507f191e810c19729de860ea'),
      ],
      wishlistId: new ObjectId('507f1f77bcf86cd799439042'),
      cartId: new ObjectId('507f191e810c19729de860f2'),
      // Account status
      status: 'active',
      emailVerified: true,
      emailVerifiedAt: new Date('2024-01-15T10:35:00Z'),
      lastLoginAt: new Date('2024-01-20T09:15:00Z'),
      loginAttempts: 0,
      lockedUntil: null,
      // Audit fields
      createdAt: new Date('2024-01-15T10:30:00Z'),
      updatedAt: new Date('2024-01-20T09:15:00Z'),
      createdBy: 'system',
      version: 3
    },
    {
      _id: new ObjectId('507f1f77bcf86cd799439012'),
      username: 'janesmith456',
      email: 'jane.smith@example.com',
      password: '$2b$10$M8N/9Z4j5n0o1P2q3R4s5T6u7V8w9X0y1Z2b3C4d5E6f7G8h9I0j',
      profile: {
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: new Date('1990-03-22'),
        gender: 'female',
        avatar: {
          url: 'https://cdn.example.com/avatars/507f1f77bcf86cd799439012.jpg',
          uploadedAt: new Date('2024-01-16T14:22:00Z')
        },
        phone: {
          countryCode: '+1',
          number: '5559876543',
          verified: true,
          verifiedAt: new Date('2024-01-16T15:00:00Z')
        }
      },
      addresses: [
        {
          _id: new ObjectId('60a7b7e1c5f4a2b3d4e5f603'),
          type: 'home',
          isDefault: true,
          recipient: 'Jane Smith',
          addressLine1: '789 Oak Boulevard',
          addressLine2: null,
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210',
          country: 'USA',
          coordinates: {
            type: 'Point',
            coordinates: [-118.2437, 34.0522]
          },
          createdAt: new Date('2024-01-16T14:22:00Z')
        }
      ],
      preferences: {
        language: 'en-US',
        currency: 'USD',
        timezone: 'America/Los_Angeles',
        notifications: {
          email: {
            orderUpdates: true,
            promotions: false,
            newsletter: true
          },
          push: {
            orderUpdates: true,
            promotions: true
          }
        },
        privacy: {
          profileVisibility: 'private',
          showEmail: false,
          allowDataCollection: false
        }
      },
      orderHistory: [new ObjectId('507f191e810c19729de860ec')],
      wishlistId: new ObjectId('507f191e810c19729de860f2'),
      cartId: new ObjectId('507f191e810c19729de860f3'),
      status: 'active',
      emailVerified: true,
      emailVerifiedAt: new Date('2024-01-16T14:30:00Z'),
      lastLoginAt: new Date('2024-01-19T18:30:00Z'),
      loginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date('2024-01-16T14:22:00Z'),
      updatedAt: new Date('2024-01-19T18:30:00Z'),
      createdBy: 'system',
      version: 2
    }
  ],

  'ecommerce/products': [
    {
      _id: new ObjectId('507f191e810c19729de860ea'),
      name: 'MacBook Pro 14-inch M3 Pro',
      slug: 'macbook-pro-14-m3-pro',
      description: 'The most advanced MacBook Pro ever, featuring the M3 Pro chip for exceptional performance.',
      shortDescription: 'Professional laptop with M3 Pro chip, 14-inch display, and all-day battery life.',
      sku: 'MBP-14-M3P-SG-512',
      brand: 'Apple',
      model: 'MacBook Pro',
      category: {
        primary: new ObjectId('507f1f77bcf86cd799439041'), // Reference to categories
        breadcrumb: ['Electronics', 'Computers', 'Laptops']
      },
      pricing: {
        basePrice: new Decimal128('2399.99'),
        salePrice: null,
        currency: 'USD',
        taxRate: new Decimal128('0.0875'), // 8.75%
        costPrice: new Decimal128('1899.99'),
        margin: new Decimal128('20.85') // percentage
      },
      inventory: {
        sku: 'MBP-14-M3P-SG-512',
        stock: 74,
        reserved: 5,
        available: 69,
        reorderLevel: 10,
        maxOrderQuantity: 2,
        trackInventory: true,
        backorderAllowed: false,
        warehouse: {
          id: 'WH-001',
          name: 'Main Warehouse',
          location: 'Cupertino, CA'
        }
      },
      specifications: {
        processor: {
          name: 'Apple M3 Pro',
          cores: '11-core CPU',
          gpu: '14-core GPU',
          neuralEngine: '16-core Neural Engine'
        },
        memory: {
          size: '18GB',
          type: 'Unified Memory'
        },
        storage: {
          size: '512GB',
          type: 'SSD'
        },
        display: {
          size: '14.2-inch',
          resolution: '3024 x 1964',
          type: 'Liquid Retina XDR',
          brightness: '1000 nits sustained, 1600 nits peak (HDR)'
        },
        dimensions: {
          width: new Decimal128('31.26'), // cm
          depth: new Decimal128('22.12'), // cm
          height: new Decimal128('1.55'), // cm
          weight: new Decimal128('1.61') // kg
        },
        connectivity: [
          '3 × Thunderbolt 4 (USB-C)',
          'HDMI port',
          'SDXC card slot',
          'MagSafe 3 port',
          '3.5mm headphone jack'
        ],
        color: 'Space Gray',
        warranty: '1 year limited warranty'
      },
      media: {
        images: [
          {
            url: 'https://cdn.example.com/products/mbp-14-m3p-sg-1.jpg',
            alt: 'MacBook Pro 14-inch M3 Pro - Front view',
            isPrimary: true,
            order: 1
          },
          {
            url: 'https://cdn.example.com/products/mbp-14-m3p-sg-2.jpg',
            alt: 'MacBook Pro 14-inch M3 Pro - Side view',
            isPrimary: false,
            order: 2
          }
        ],
        videos: [
          {
            url: 'https://cdn.example.com/products/mbp-14-m3p-demo.mp4',
            thumbnail: 'https://cdn.example.com/products/mbp-14-m3p-thumb.jpg',
            duration: 120, // seconds
            title: 'MacBook Pro M3 Pro Overview'
          }
        ]
      },
      seo: {
        title: 'MacBook Pro 14-inch M3 Pro - Ultimate Performance Laptop',
        description: 'Experience unprecedented performance with the MacBook Pro featuring M3 Pro chip. Perfect for professionals and creators.',
        keywords: ['macbook', 'laptop', 'm3 pro', 'apple', 'professional'],
        canonicalUrl: 'https://example.com/products/macbook-pro-14-m3-pro'
      },
      // Related products and recommendations
      relatedProducts: [
        new ObjectId('507f191e810c19729de860eb'),
        new ObjectId('507f191e810c19729de860ec')
      ],
      variants: [
        {
          _id: new ObjectId('507f191e810c19729de860ed'),
          name: '16-inch variant',
          sku: 'MBP-16-M3P-SG-512',
          priceDifference: new Decimal128('400.00')
        }
      ],
      // Status and availability
      status: 'active',
      publishedAt: new Date('2024-01-10T12:00:00Z'),
      isDigital: false,
      requiresShipping: true,
      isFeatured: true,
      // Reviews and ratings
      reviews: {
        averageRating: new Decimal128('4.6'),
        totalReviews: 128,
        ratingDistribution: {
          5: 89,
          4: 25,
          3: 10,
          2: 3,
          1: 1
        }
      },
      // Audit fields
      createdAt: new Date('2024-01-10T12:00:00Z'),
      updatedAt: new Date('2024-01-18T16:45:00Z'),
      createdBy: new ObjectId('507f1f77bcf86cd799439013'), // Admin user
      version: 5
    }
  ],

  'ecommerce/orders': [
    {
      _id: new ObjectId('507f191e810c19729de860ea'),
      orderNumber: 'ORD-2024-000001',
      customerId: new ObjectId('507f1f77bcf86cd799439011'), // Reference to users
      customer: {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+15551234567'
      },
      status: {
        current: 'shipped',
        history: [
          {
            status: 'pending',
            timestamp: new Date('2024-01-18T16:45:00Z'),
            note: 'Order placed'
          },
          {
            status: 'confirmed',
            timestamp: new Date('2024-01-18T17:00:00Z'),
            note: 'Payment confirmed'
          },
          {
            status: 'processing',
            timestamp: new Date('2024-01-19T09:00:00Z'),
            note: 'Order is being prepared'
          },
          {
            status: 'shipped',
            timestamp: new Date('2024-01-19T14:30:00Z'),
            note: 'Order shipped via FedEx',
            trackingNumber: 'FDX123456789'
          }
        ]
      },
      items: [
        {
          _id: new ObjectId('507f191e810c19729de860f1'),
          productId: new ObjectId('507f191e810c19729de860ea'), // Reference to products
          productName: 'MacBook Pro 14-inch M3 Pro',
          sku: 'MBP-14-M3P-SG-512',
          quantity: 1,
          unitPrice: new Decimal128('2399.99'),
          discount: {
            type: 'percentage',
            value: new Decimal128('0.00'),
            amount: new Decimal128('0.00'),
            couponCode: null
          },
          tax: {
            rate: new Decimal128('8.75'),
            amount: new Decimal128('209.99')
          },
          totalPrice: new Decimal128('2609.98'),
          specifications: {
            color: 'Space Gray',
            storage: '512GB',
            memory: '18GB'
          }
        }
      ],
      pricing: {
        subtotal: new Decimal128('2399.99'),
        discountTotal: new Decimal128('0.00'),
        taxTotal: new Decimal128('209.99'),
        shippingTotal: new Decimal128('0.00'), // Free shipping
        total: new Decimal128('2609.98')
      },
      shipping: {
        method: 'standard',
        carrier: 'FedEx',
        service: 'FedEx Ground',
        cost: new Decimal128('0.00'),
        estimatedDelivery: new Date('2024-01-22T17:00:00Z'),
        trackingNumber: 'FDX123456789',
        address: {
          recipient: 'John Doe',
          addressLine1: '123 Main Street',
          addressLine2: 'Apt 4B',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
          phone: '+15551234567'
        }
      },
      billing: {
        address: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main Street',
          addressLine2: 'Apt 4B',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        }
      },
      payment: {
        method: 'credit_card',
        status: 'paid',
        transactionId: 'txn_1234567890abcdef',
        gateway: 'stripe',
        card: {
          brand: 'visa',
          last4: '4242',
          expiryMonth: 12,
          expiryYear: 2028
        },
        paidAt: new Date('2024-01-18T16:47:00Z'),
        amount: new Decimal128('2609.98'),
        currency: 'USD',
        refunds: []
      },
      // Fulfillment information
      fulfillment: {
        warehouseId: 'WH-001',
        packedAt: new Date('2024-01-19T10:30:00Z'),
        packedBy: new ObjectId('507f1f77bcf86cd799439041'), // Staff member
        shippedAt: new Date('2024-01-19T14:30:00Z'),
        deliveredAt: null
      },
      // Customer communication
      notifications: {
        orderConfirmation: {
          sent: true,
          sentAt: new Date('2024-01-18T16:50:00Z')
        },
        shippingConfirmation: {
          sent: true,
          sentAt: new Date('2024-01-19T14:35:00Z')
        },
        deliveryConfirmation: {
          sent: false,
          sentAt: null
        }
      },
      notes: {
        customer: null,
        internal: 'High-value customer - priority shipping'
      },
      // Audit fields
      createdAt: new Date('2024-01-18T16:45:00Z'),
      updatedAt: new Date('2024-01-19T14:30:00Z'),
      version: 4
    }
  ],

  'ecommerce/categories': [
    {
      _id: new ObjectId('507f1f77bcf86cd799439041'),
      name: 'Electronics',
      slug: 'electronics',
      description: 'Discover the latest in electronic devices and technology accessories',
      parentId: null, // Root category
      path: 'electronics',
      level: 0,
      children: [
        new ObjectId('507f1f77bcf86cd799439042'), // Computers
        new ObjectId('60a7b7e1c5f4a2b3d4e5f621'), // Mobile Devices
        new ObjectId('507f1f77bcf86cd799439044')  // Audio
      ],
      image: {
        url: 'https://cdn.example.com/categories/electronics.jpg',
        alt: 'Electronics Category',
        uploadedAt: new Date('2024-01-01T00:00:00Z')
      },
      banner: {
        url: 'https://cdn.example.com/banners/electronics-banner.jpg',
        alt: 'Electronics Category Banner',
        uploadedAt: new Date('2024-01-01T00:00:00Z')
      },
      seo: {
        title: 'Electronics - Latest Tech Products & Gadgets',
        description: 'Shop the latest electronics including computers, smartphones, tablets, and tech accessories with fast shipping.',
        keywords: ['electronics', 'tech', 'gadgets', 'computers', 'smartphones'],
        canonicalUrl: 'https://example.com/categories/electronics'
      },
      display: {
        isVisible: true,
        isFeatured: true,
        sortOrder: 1,
        showInMenu: true,
        showOnHomepage: true
      },
      stats: {
        productCount: 1247,
        activeProductCount: 1189,
        totalSales: new Decimal128('2456789.99'),
        averageOrderValue: new Decimal128('489.50')
      },
      // Audit fields
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-15T12:00:00Z'),
      createdBy: new ObjectId('507f1f77bcf86cd799439013'),
      version: 2
    },
    {
      _id: new ObjectId('507f1f77bcf86cd799439042'),
      name: 'Computers',
      slug: 'computers',
      description: 'Professional computers, laptops, and computing accessories',
      parentId: new ObjectId('507f1f77bcf86cd799439041'), // Electronics
      path: 'electronics/computers',
      level: 1,
      children: [
        new ObjectId('507f1f77bcf86cd799439045'), // Laptops
        new ObjectId('507f1f77bcf86cd799439046')  // Desktops
      ],
      image: {
        url: 'https://cdn.example.com/categories/computers.jpg',
        alt: 'Computers Category',
        uploadedAt: new Date('2024-01-01T00:00:00Z')
      },
      seo: {
        title: 'Computers - Laptops, Desktops & Computing Solutions',
        description: 'Find the perfect computer for work or play. Shop laptops, desktops, and computing accessories.',
        keywords: ['computers', 'laptops', 'desktops', 'computing', 'workstations'],
        canonicalUrl: 'https://example.com/categories/electronics/computers'
      },
      display: {
        isVisible: true,
        isFeatured: true,
        sortOrder: 1,
        showInMenu: true,
        showOnHomepage: false
      },
      stats: {
        productCount: 234,
        activeProductCount: 220,
        totalSales: new Decimal128('1234567.89'),
        averageOrderValue: new Decimal128('1299.99')
      },
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-10T15:30:00Z'),
      createdBy: new ObjectId('507f1f77bcf86cd799439013'),
      version: 1
    }
  ],

  'ecommerce/reviews': [
    {
      _id: new ObjectId('60a7b7e1c5f4a2b3d4e5f621'),
      productId: new ObjectId('507f191e810c19729de860ea'), // Reference to products
      customerId: new ObjectId('507f1f77bcf86cd799439011'), // Reference to users
      orderId: new ObjectId('507f191e810c19729de860ea'), // Reference to orders
      rating: 5,
      title: 'Exceptional Performance and Build Quality',
      content: 'This MacBook Pro with M3 Pro chip is absolutely incredible. The performance is lightning fast, the display is stunning, and the build quality is top-notch. Perfect for my development work and video editing. Battery life easily lasts a full workday.',
      pros: [
        'Blazing fast M3 Pro performance',
        'Stunning Liquid Retina XDR display',
        'Excellent build quality and design',
        'All-day battery life',
        'Great for professional workflows'
      ],
      cons: [
        'Premium price point',
        'Limited port selection'
      ],
      images: [
        {
          url: 'https://cdn.example.com/reviews/60a7b7e1c5f4a2b3d4e5f621-1.jpg',
          alt: 'MacBook Pro setup photo',
          uploadedAt: new Date('2024-01-15T12:45:00Z')
        }
      ],
      helpfulVotes: {
        helpful: 23,
        notHelpful: 2
      },
      verified: {
        isPurchaseVerified: true,
        verifiedAt: new Date('2024-01-15T12:30:00Z')
      },
      status: 'approved',
      moderation: {
        flagCount: 0,
        moderatedAt: new Date('2024-01-15T13:00:00Z'),
        moderatedBy: new ObjectId('507f1f77bcf86cd799439015'), // Moderator
        reason: null
      },
      replies: [
        {
          _id: new ObjectId('60a7b7e1c5f4a2b3d4e5f622'),
          authorType: 'vendor',
          authorId: new ObjectId('507f1f77bcf86cd799439016'), // Vendor representative
          authorName: 'Apple Support',
          content: 'Thank you for the wonderful review! We\'re thrilled that you\'re enjoying your new MacBook Pro.',
          createdAt: new Date('2024-01-16T10:15:00Z')
        }
      ],
      // Audit fields
      createdAt: new Date('2024-01-15T12:30:00Z'),
      updatedAt: new Date('2024-01-16T10:15:00Z'),
      version: 2
    }
  ],

  'ecommerce/carts': [
    {
      _id: new ObjectId('507f191e810c19729de86021'),
      customerId: new ObjectId('507f1f77bcf86cd799439011'),
      sessionId: 'sess_1234567890abcdef',
      status: 'active',
      items: [
        {
          _id: new ObjectId('507f1f77bcf86cd799439012'),
          productId: new ObjectId('507f191e810c19729de860ea'),
          productName: 'MacBook Pro 14-inch M3 Pro',
          sku: 'MBP-14-M3P-SG-512',
          quantity: 1,
          unitPrice: new Decimal128('2399.99'),
          totalPrice: new Decimal128('2399.99'),
          addedAt: new Date('2024-01-20T14:30:00Z'),
          updatedAt: new Date('2024-01-20T14:30:00Z')
        }
      ],
      totals: {
        itemCount: 1,
        subtotal: new Decimal128('2399.99'),
        estimatedTax: new Decimal128('209.99'),
        estimatedTotal: new Decimal128('2609.98')
      },
      shipping: {
        estimatedCost: new Decimal128('0.00'),
        method: null
      },
      appliedCoupons: [],
      // Cart abandonment tracking
      abandonment: {
        emailSent: false,
        emailSentAt: null,
        reminderCount: 0
      },
      expiresAt: new Date('2024-02-20T14:30:00Z'), // 30 days from creation
      createdAt: new Date('2024-01-20T14:30:00Z'),
      updatedAt: new Date('2024-01-20T14:30:00Z'),
      version: 1
    }
  ]
};

// MongoDB Change Stream 로그
export const mockChangeStreamLogs: ChangeStreamLog[] = [
  {
    _id: new ObjectId('65a1b2c3d4e5f6789012345a'),
    timestamp: new Date('2024-01-20T10:30:15Z'),
    clusterTime: new Date('2024-01-20T10:30:15.123Z'),
    operationType: 'insert',
    ns: {
      db: 'ecommerce',
      coll: 'users'
    },
    documentKey: { _id: new ObjectId('507f1f77bcf86cd799439014') },
    fullDocument: {
      _id: new ObjectId('507f1f77bcf86cd799439014'),
      username: 'alicebrown789',
      email: 'alice.brown@example.com',
      profile: {
        firstName: 'Alice',
        lastName: 'Brown'
      },
      status: 'active',
      createdAt: new Date('2024-01-20T10:30:15Z')
    }
  },
  {
    _id: new ObjectId('65a1b2c3d4e5f6789012345b'),
    timestamp: new Date('2024-01-20T10:28:42Z'),
    clusterTime: new Date('2024-01-20T10:28:42.456Z'),
    operationType: 'update',
    ns: {
      db: 'ecommerce',
      coll: 'products'
    },
    documentKey: { _id: new ObjectId('507f191e810c19729de860ea') },
    updateDescription: {
      updatedFields: {
        'inventory.stock': 73,
        'updatedAt': new Date('2024-01-20T10:28:42Z')
      },
      removedFields: []
    }
  },
  {
    _id: new ObjectId('65a1b2c3d4e5f6789012345c'),
    timestamp: new Date('2024-01-20T10:25:18Z'),
    clusterTime: new Date('2024-01-20T10:25:18.789Z'),
    operationType: 'delete',
    ns: {
      db: 'ecommerce',
      coll: 'carts'
    },
    documentKey: { _id: new ObjectId('65a1b2c3d4e5f6789012345b') }
  }
];

// MongoDB 연결된 클라이언트
export const mockConnectedClients: ConnectedClient[] = [
  {
    connectionId: 123456,
    client: '192.168.1.100:54321',
    clientMetadata: {
      driver: {
        name: 'MongoDB Compass',
        version: '1.40.4'
      },
      os: {
        type: 'Darwin',
        name: 'macOS',
        architecture: 'x86_64',
        version: '13.6.1'
      },
      platform: 'MongoDB Compass 1.40.4',
      application: {
        name: 'MongoDB Compass'
      }
    },
    active: true,
    currentOp: 'find',
    effectiveUsers: [
      {
        user: 'admin',
        db: 'admin'
      }
    ],
    runBy: [
      {
        user: 'admin',
        db: 'admin'
      }
    ]
  },
  {
    connectionId: 123457,
    client: '10.0.0.25:43210',
    clientMetadata: {
      driver: {
        name: 'nodejs',
        version: '6.3.0'
      },
      os: {
        type: 'Linux',
        name: 'Ubuntu',
        architecture: 'x86_64',
        version: '20.04.6'
      },
      platform: 'Node.js v18.19.0, LE'
    },
    active: true,
    currentOp: 'aggregate',
    effectiveUsers: [
      {
        user: 'appuser',
        db: 'ecommerce'
      }
    ],
    runBy: [
      {
        user: 'appuser',
        db: 'ecommerce'
      }
    ]
  }
];

// MongoDB 성능 메트릭
export const mockPerformanceMetrics: PerformanceMetrics = {
  serverStatus: {
    uptime: 2847623, // seconds
    uptimeMillis: 2847623000,
    localTime: new Date('2024-01-20T10:30:00Z'),
    connections: {
      current: 42,
      available: 51158,
      totalCreated: 1247
    },
    opcounters: {
      insert: 245892,
      query: 1456783,
      update: 389245,
      delete: 23478,
      getmore: 567234,
      command: 2345678
    },
    mem: {
      resident: 1879, // MB
      virtual: 4096, // MB
      supported: true
    },
    globalLock: {
      totalTime: 2847623000000, // microseconds
      lockTime: 5694, // microseconds
      currentQueue: {
        total: 0,
        readers: 0,
        writers: 0
      },
      activeClients: {
        total: 3,
        readers: 2,
        writers: 1
      }
    }
  },
  dbStats: {
    db: 'ecommerce',
    collections: 8,
    views: 2,
    objects: 156234,
    avgObjSize: 1024.5,
    dataSize: 159954944, // bytes
    storageSize: 164429824, // bytes
    indexes: 42,
    indexSize: 15728640 // bytes
  }
};

// 서브컬렉션 및 임베디드 도큐먼트 참조 데이터
export const mockSubCollections: { [key: string]: MongoDocument[] } = {
  // User addresses subcollection
  'ecommerce/users/507f1f77bcf86cd799439011/addresses': [
    {
      _id: new ObjectId('60a7b7e1c5f4a2b3d4e5f601'),
      type: 'home',
      isDefault: true,
      recipient: 'John Doe',
      addressLine1: '123 Main Street',
      addressLine2: 'Apt 4B',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
      coordinates: {
        type: 'Point',
        coordinates: [-74.0060, 40.7128]
      },
      createdAt: new Date('2024-01-15T10:30:00Z')
    }
  ],

  // Order items subcollection
  'ecommerce/orders/507f191e810c19729de860ea/items': [
    {
      _id: new ObjectId('507f191e810c19729de860f1'),
      productId: new ObjectId('507f191e810c19729de860ea'),
      productName: 'MacBook Pro 14-inch M3 Pro',
      sku: 'MBP-14-M3P-SG-512',
      quantity: 1,
      unitPrice: new Decimal128('2399.99'),
      totalPrice: new Decimal128('2609.98'),
      specifications: {
        color: 'Space Gray',
        storage: '512GB',
        memory: '18GB'
      }
    }
  ]
};

// 헬퍼 함수들
export const getSubCollection = (path: string): MongoDocument[] => {
  return mockSubCollections[path] || [];
};

export const findDocumentByReference = (database: string, id: string | ObjectId): { document: MongoDocument, database: string, collection: string } | null => {
  const searchId = typeof id === 'string' ? id : id.toString();
  // testDB 전체에서 검색
  const dbPrefix = `${database}/`;
  for (const key of Object.keys(mockDocuments)) {
    if (key.startsWith(dbPrefix)) {
      const documents = mockDocuments[key] || [];
      const found = documents.find(doc => doc._id.toString() === searchId);
      if (found) {
        const [db, collection] = key.split('/');
        return {
          document: found,
          database: db,
          collection: collection
        };
      }
    }
  }
  return null;
};

export const getDatabaseByName = (name: string): Database | null => {
  return mockDatabases.find(db => db.name === name) || null;
};

export const getCollectionsByDatabase = (databaseName: string): Collection[] => {
  const database = getDatabaseByName(databaseName);
  return database ? database.collections : [];
};

// MongoDB Reference 관계 매핑
export const crossDatabaseReferenceMap = {
  'ecommerce/users': {
    orderHistory: 'ecommerce/orders',
    wishlistId: 'ecommerce/wishlists',
    cartId: 'ecommerce/carts'
  },
  'ecommerce/orders': {
    customerId: 'ecommerce/users',
    'items.productId': 'ecommerce/products'
  },
  'ecommerce/products': {
    'category.primary': 'ecommerce/categories',
    relatedProducts: 'ecommerce/products'
  },
  'ecommerce/reviews': {
    productId: 'ecommerce/products',
    customerId: 'ecommerce/users',
    orderId: 'ecommerce/orders'
  },
  'ecommerce/categories': {
    parentId: 'ecommerce/categories',
    children: 'ecommerce/categories'
  },
  'ecommerce/carts': {
    customerId: 'ecommerce/users',
    'items.productId': 'ecommerce/products'
  }
};