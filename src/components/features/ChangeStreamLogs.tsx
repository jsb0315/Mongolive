import React, { useState, useEffect } from 'react';
import { mockChangeStreamLogs, ChangeStreamLog } from '../../data/mockData';
import { useDatabaseContext } from '../../contexts/DatabaseContext';

const ChangeStreamLogs: React.FC = () => {
  const { selectedDatabase } = useDatabaseContext();
  const [logs, setLogs] = useState<ChangeStreamLog[]>([]);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [filteredLogs, setFilteredLogs] = useState<ChangeStreamLog[]>([]);

  useEffect(() => {
    console.log('Loading change stream logs...');
    setLogs(mockChangeStreamLogs);
  }, []);

  // 선택된 데이터베이스에 따라 로그 필터링
  useEffect(() => {
    if (selectedDatabase) {
      const filtered = logs.filter(log => log.database === selectedDatabase.name);
      setFilteredLogs(filtered);
    } else {
      setFilteredLogs(logs);
    }
  }, [logs, selectedDatabase]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isWatching) {
      interval = setInterval(() => {
        const databases = ['Client', 'Product', 'Management'];
        const collections = {
          'Client': ['users', 'orders', 'addresses', 'payments', 'inventory'],
          'Product': ['products', 'categories', 'reviews'],
          'Management': ['notifications', 'audit_logs']
        };
        
        const randomDb = databases[Math.floor(Math.random() * databases.length)];
        const dbCollections = collections[randomDb as keyof typeof collections];
        const randomCollection = dbCollections[Math.floor(Math.random() * dbCollections.length)];
        
        const newLog: ChangeStreamLog = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          operationType: ['insert', 'update', 'delete'][Math.floor(Math.random() * 3)] as any,
          database: randomDb,
          collection: randomCollection,
          documentKey: { _id: `new_${Date.now()}` },
        };
        
        console.log('New change stream event:', newLog);
        setLogs(prev => [newLog, ...prev].slice(0, 50));
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWatching]);

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'insert': return 'text-green-600 bg-green-100';
      case 'update': return 'text-blue-600 bg-blue-100';
      case 'delete': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDatabaseColor = (database: string) => {
    switch (database) {
      case 'Client': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Product': return 'text-green-600 bg-green-50 border-green-200';
      case 'Management': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Real-time Change Stream</h3>
            {selectedDatabase && (
              <p className="text-sm text-gray-500 mt-1">
                Watching database: <span className="font-medium">{selectedDatabase.name}</span>
              </p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{filteredLogs.length}</span> events
              {selectedDatabase && <span className="text-gray-400"> in {selectedDatabase.name}</span>}
            </div>
            <button
              onClick={() => {
                setIsWatching(!isWatching);
                console.log(`Change stream watching: ${!isWatching}`);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                isWatching
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {isWatching ? 'Stop Watching' : 'Start Watching'}
            </button>
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <p className="text-lg font-medium">No Change Stream Events</p>
              <p className="text-sm">
                {selectedDatabase 
                  ? `No events found for database "${selectedDatabase.name}"`
                  : 'No events found'
                }
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOperationColor(log.operationType)}`}>
                      {log.operationType.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded border text-xs font-medium ${getDatabaseColor(log.database)}`}>
                      {log.database}
                    </span>
                    <span className="font-medium text-gray-900">{log.collection}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p>Document ID: <span className="font-mono">{log.documentKey._id}</span></p>
                  {log.fullDocument && (
                    <details className="mt-2">
                      <summary className="cursor-pointer hover:text-gray-800">View Document</summary>
                      <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.fullDocument, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangeStreamLogs;