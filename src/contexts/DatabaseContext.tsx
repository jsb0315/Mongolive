import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Database, mockDatabases, getDatabaseByName } from '../data/mockData';

interface DatabaseContextType {
  selectedDatabase: Database | null;
  databases: Database[];
  selectDatabase: (databaseName: string) => void;
  isLoading: boolean;
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
  const [databases] = useState<Database[]>(mockDatabases);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // 초기 데이터베이스 설정 (첫 번째 DB 선택)
    if (databases.length > 0 && !selectedDatabase) {
      setSelectedDatabase(databases[0]);
    }
    setIsLoading(false);
  }, [databases, selectedDatabase]);

  const selectDatabase = (databaseName: string) => {
    const database = getDatabaseByName(databaseName);
    if (database) {
      setSelectedDatabase(database);
      console.log(`Database switched to: ${databaseName}`);
    }
  };

  const value: DatabaseContextType = {
    selectedDatabase,
    databases,
    selectDatabase,
    isLoading,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};