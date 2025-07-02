import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Database } from '../data/mockData';
import { apiClient, convertAPIToUIDatabase } from '../utils/apiClient';

interface DatabaseContextType {
  selectedDatabase: Database | null;
  databases: Database[];
  selectDatabase: (databaseName: string) => void;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  currentCollection: string | null;
  setCurrentCollection: (collection: string | null) => void;
  refreshDatabases: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const useDatabaseContext = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabaseContext must be used within a DatabaseProvider');
  }
  return context;
};

interface DatabaseProviderProps {
  children: ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const [selectedDatabase, setSelectedDatabase] = useState<Database | null>(null);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCollection, setCurrentCollection] = useState<string | null>(null);

  // Database is considered connected if we have a selected database and no error
  const isConnected = selectedDatabase !== null && error === null;

  const loadDatabases = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const apiDatabases = await apiClient.getDatabases();
      const uiDatabases = apiDatabases.map(convertAPIToUIDatabase);
      
      setDatabases(uiDatabases);
      
      // Auto-select first database if none selected and databases exist
      if (uiDatabases.length > 0 && !selectedDatabase) {
        setSelectedDatabase(uiDatabases[0]);
      }
      
      // If currently selected database is no longer available, reset selection
      if (selectedDatabase && !uiDatabases.find(db => db.name === selectedDatabase.name)) {
        setSelectedDatabase(uiDatabases.length > 0 ? uiDatabases[0] : null);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load databases';
      setError(errorMessage);
      console.error('Error loading databases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshDatabases = async () => {
    await loadDatabases();
  };

  useEffect(() => {
    loadDatabases();
  }, []);

  const selectDatabase = (databaseName: string) => {
    const database = databases.find(db => db.name === databaseName);
    if (database) {
      setSelectedDatabase(database);
      console.log(`Database switched to: ${databaseName}`);
    } else {
      console.warn(`Database not found: ${databaseName}`);
    }
  };

  const value: DatabaseContextType = {
    selectedDatabase,
    databases,
    selectDatabase,
    isLoading,
    error,
    isConnected,
    currentCollection,
    setCurrentCollection,
    refreshDatabases,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};