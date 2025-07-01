// API client for MongoDB Live application
const API_BASE_URL = process.env.REACT_APP_API_URL || `http://${process.env.REACT_APP_IP}:3001`;

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
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class APIClient {
  private baseURL: string;

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

  // Fetch all databases
  async getDatabases(): Promise<APIDatabase[]> {
    const response = await this.request<APIResponse<APIDatabase[]>>('/api/databases');
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch databases');
    }
    return response.data || [];
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
      documentCount: 0, // Will be loaded separately when needed
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
