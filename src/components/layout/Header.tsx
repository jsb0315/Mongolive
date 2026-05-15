import React, { useState, useEffect } from 'react';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import { apiClient, MongoDBStatus } from '../../utils/apiClient';

interface HeaderProps {
  onLogout: () => void;
  currentUser?: string;
}

function getDatabaseErrorInfo(error: string) {
  const isSecurityError = /access denied|whitelist|forbidden|unauthorized|not allowed/i.test(error);
  return {
    label: isSecurityError ? 'Access restricted' : 'Database load error',
    details: isSecurityError ? 'Access is restricted by security policy.' : error
  };
}

const Header: React.FC<HeaderProps> = ({ onLogout, currentUser = 'admin' }) => {
  const { selectedDatabase, databases, selectDatabase, isLoading, error, refreshDatabases } = useDatabaseContext();
  
  // MongoDB 서버 연결 상태 모니터링
  const [mongoStatus, setMongoStatus] = useState<MongoDBStatus | null>(null);
  const [mongoStatusLoading, setMongoStatusLoading] = useState(true);

  useEffect(() => {
    // MongoDB 상태 모니터링 시작
    const startMonitoring = () => {
      apiClient.startMongoDBStatusMonitoring({
        onStatusChange: (status: MongoDBStatus) => {
          console.log('🔄 MongoDB status changed:', status);
          setMongoStatus(status);
          setMongoStatusLoading(false);
          
          // DB 연결이 끊어진 경우 모든 ChangeStream 구독 해제
          if (!status.connected) {
            console.log('❌ MongoDB disconnected - unsubscribing all ChangeStreams');
            apiClient.unsubscribeAll();
          }
        },
        onError: (error: Error) => {
          console.error('❌ MongoDB status monitoring error:', error);
          setMongoStatus({
            connected: false,
            error: error.message
          });
          setMongoStatusLoading(false);
        }
      }, 5000); // 5초마다 체크
    };

    startMonitoring();

    // 컴포넌트 언마운트 시 모니터링 중지
    return () => {
      apiClient.stopMongoDBStatusMonitoring();
    };
  }, []);

  // MongoDB 연결 상태에 따른 표시 정보
  const getMongoStatusInfo = () => {
    if (mongoStatusLoading) {
      return {
        color: 'bg-yellow-500',
        text: 'Checking...',
        details: 'Checking MongoDB connection'
      };
    }
    
    if (!mongoStatus || !mongoStatus.connected) {
      return {
        color: 'bg-red-500',
        text: 'DB Disconnected',
        details: mongoStatus?.error || 'MongoDB server is not connected'
      };
    }
    
    return {
      color: 'bg-green-500',
      text: 'DB Connected',
      details: mongoStatus.serverInfo ? 
        `MongoDB ${mongoStatus.serverInfo.version} - ${mongoStatus.stats?.totalDatabases || 0} databases` :
        'MongoDB server is connected'
    };
  };

  const mongoStatusInfo = getMongoStatusInfo();
  const databaseErrorInfo = error ? getDatabaseErrorInfo(error) : null;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between md:h-full flex-wrap">
        <div className="flex items-end flex-wrap md:h-full">
            <div className="hidden md:block mr-6">
            <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
            <p className="text-sm text-gray-500">MongoDB Admin Console</p>
          </div>
          
          {/* Database Selection */}
          <div className="flex flex-col md:h-full justify-between">
            <div className="flex items-center space-x-2">
              <label htmlFor="database-select" className="text-sm font-medium text-gray-700">
                Database:
              </label>
              
              {error ? (
                <div className="flex items-center space-x-2">
                  <div
                    className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-sm"
                    title={databaseErrorInfo?.details}
                  >
                    {databaseErrorInfo?.label}
                  </div>
                  <button
                    onClick={refreshDatabases}
                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    title="Retry loading databases"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  <select
                    id="database-select"
                    value={selectedDatabase?.name || ''}
                    onChange={(e) => selectDatabase(e.target.value)}
                    disabled={isLoading || databases.length === 0}
                    className="px-2 py-0.5 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 min-w-24 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <option>Loading...</option>
                    ) : databases.length === 0 ? (
                      <option>No databases available</option>
                    ) : (
                      databases.map((db) => (
                        <option key={db.name} value={db.name}>
                          {db.name}
                        </option>
                      ))
                    )}
                  </select>
                  
                  {isLoading && (
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                      <span>Loading...</span>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Database Info */}
            {selectedDatabase && (
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>{selectedDatabase.totalCollections} collections</span>
                </div>
                <div className="flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  <span>{selectedDatabase.totalSize}</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex flex-col items-start shrink-0">
            {/* MongoDB Server Status */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className={`w-2 h-2 rounded-full ${mongoStatusInfo.color}`}></div>
              <span title={mongoStatusInfo.details}>{mongoStatusInfo.text}</span>
            </div>
            
            {/* Database Context Status */}
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className={`w-1.5 h-1.5 rounded-full ${error ? 'bg-red-400' : isLoading ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
              <span className="text-xs">{error ? 'Data Error' : isLoading ? 'Loading...' : 'Data Ready'}</span>
            </div>
          </div>
          
          {/* MongoDB Server Details */}
          {mongoStatus?.connected && mongoStatus.serverInfo && (
            <div className="hidden lg:flex items-center space-x-3 text-xs text-gray-500 border-l pl-3">
              <div className="flex items-center space-x-1" title={`MongoDB Version: ${mongoStatus.serverInfo.version}`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002 2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
                <span>v{mongoStatus.serverInfo.version}</span>
              </div>
              <div className="flex items-center space-x-1" title={`Active Connections: ${mongoStatus.serverInfo.connections.current}`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
                <span>{mongoStatus.serverInfo.connections.current}</span>
              </div>
              {mongoStatus.stats && (
                <div className="flex items-center space-x-1" title={`Total Databases: ${mongoStatus.stats.totalDatabases}`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  <span>{mongoStatus.stats.totalDatabases} DBs</span>
                </div>
              )}
            </div>
          )}
          
          {/* Current User Indicator */}
          <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center space-x-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>{currentUser}</span>
          </div>
          
          <button
            onClick={onLogout}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;