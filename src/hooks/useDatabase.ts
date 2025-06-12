import { useState, useEffect } from 'react';

interface Database {
  _id: string;
  name: string;
  collections?: string[];
}

const useDatabase = () => {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDatabases = async (): Promise<void> => {
      try {
        console.log('Loading databases...');
        // Mock data for prototype
        const mockDatabases: Database[] = [
          { _id: '1', name: 'ecommerce', collections: ['users', 'products', 'orders'] },
          { _id: '2', name: 'blog', collections: ['posts', 'comments', 'authors'] },
          { _id: '3', name: 'analytics', collections: ['events', 'sessions', 'users'] },
        ];
        
        setDatabases(mockDatabases);
        console.log('Databases loaded:', mockDatabases);
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to load databases';
        setError(errorMessage);
        console.error('Error loading databases:', errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadDatabases();
  }, []);

  const addDatabase = async (dbName: string): Promise<void> => {
    try {
      console.log('Creating database:', dbName);
      const newDatabase: Database = {
        _id: Date.now().toString(),
        name: dbName,
        collections: []
      };
      
      setDatabases((prev) => [...prev, newDatabase]);
      console.log('Database created successfully:', newDatabase);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to create database';
      setError(errorMessage);
      console.error('Error creating database:', errorMessage);
    }
  };

  const removeDatabase = async (dbName: string): Promise<void> => {
    try {
      console.log('Deleting database:', dbName);
      setDatabases((prev) => prev.filter((db) => db.name !== dbName));
      console.log('Database deleted successfully');
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to delete database';
      setError(errorMessage);
      console.error('Error deleting database:', errorMessage);
    }
  };

  const fetchCollections = async (dbName?: string): Promise<string[]> => {
    console.log('Fetching collections for database:', dbName || 'default');
    // Mock collections data
    const mockCollections = ['users', 'products', 'orders', 'categories', 'reviews'];
    console.log('Collections fetched:', mockCollections);
    return mockCollections;
  };

  const fetchDocuments = async (collectionName: string): Promise<any[]> => {
    console.log('Fetching documents from collection:', collectionName);
    // Mock documents data
    const mockDocuments = [
      { _id: '1', name: `Sample ${collectionName} 1`, data: JSON.stringify({ field1: 'value1', field2: 'value2' }) },
      { _id: '2', name: `Sample ${collectionName} 2`, data: JSON.stringify({ field1: 'value3', field2: 'value4' }) },
      { _id: '3', name: `Sample ${collectionName} 3`, data: JSON.stringify({ field1: 'value5', field2: 'value6' }) },
    ];
    console.log('Documents fetched:', mockDocuments);
    return mockDocuments;
  };

  return {
    databases,
    loading,
    error,
    addDatabase,
    removeDatabase,
    fetchCollections,
    fetchDocuments,
  };
};

export default useDatabase;