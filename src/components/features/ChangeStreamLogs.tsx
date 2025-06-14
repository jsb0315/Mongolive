import React, { useState, useEffect } from 'react';
import { ObjectId } from 'bson';
import { mockChangeStreamLogs, ChangeStreamLog, mockDatabases } from '../../data/mockData';
import { useDatabaseContext } from '../../contexts/DatabaseContext';

const ChangeStreamLogs: React.FC = () => {
  const { selectedDatabase } = useDatabaseContext();
  const [logs, setLogs] = useState<ChangeStreamLog[]>([]);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [filteredLogs, setFilteredLogs] = useState<ChangeStreamLog[]>([]);

  useEffect(() => {
    console.log('Loading MongoDB change stream logs...');
    setLogs(mockChangeStreamLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
  }, []);

  // 선택된 데이터베이스에 따라 로그 필터링
  useEffect(() => {
    if (selectedDatabase) {
      const filtered = logs.filter(log => log.ns.db === selectedDatabase.name);
      setFilteredLogs(filtered);
    } else {
      setFilteredLogs(logs);
    }
  }, [logs, selectedDatabase]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isWatching) {
      interval = setInterval(() => {
        // MongoDB 데이터베이스에서 랜덤 선택
        const databases = mockDatabases;
        const randomDb = databases[Math.floor(Math.random() * databases.length)];
        const randomCollection = randomDb.collections[Math.floor(Math.random() * randomDb.collections.length)];
        
        const operations: Array<'insert' | 'update' | 'delete' | 'replace'> = ['insert', 'update', 'delete', 'replace'];
        const randomOperation = operations[Math.floor(Math.random() * operations.length)];
        
        const newLog: ChangeStreamLog = {
          _id: new ObjectId(),
          timestamp: new Date(),
          clusterTime: new Date(),
          operationType: randomOperation,
          ns: {
            db: randomDb.name,
            coll: randomCollection.name
          },
          documentKey: { _id: new ObjectId() },
          fullDocument: randomOperation === 'insert' || randomOperation === 'replace' ? {
            _id: new ObjectId(),
            // Mock document content based on collection
            ...(randomCollection.name === 'users' && {
              username: `user_${Date.now()}`,
              email: `user${Date.now()}@example.com`,
              status: 'active',
              createdAt: new Date()
            }),
            ...(randomCollection.name === 'products' && {
              name: `Product ${Date.now()}`,
              price: Math.floor(Math.random() * 1000) + 50,
              status: 'active',
              createdAt: new Date()
            }),
            ...(randomCollection.name === 'orders' && {
              orderNumber: `ORD-${Date.now()}`,
              status: 'pending',
              total: Math.floor(Math.random() * 500) + 100,
              createdAt: new Date()
            })
          } : undefined,
          updateDescription: randomOperation === 'update' ? {
            updatedFields: {
              updatedAt: new Date(),
              ...(Math.random() > 0.5 && { status: 'updated' }),
              ...(Math.random() > 0.7 && { lastModified: new Date() })
            },
            removedFields: Math.random() > 0.8 ? ['tempField'] : []
          } : undefined
        };
        
        console.log('New MongoDB change stream event:', newLog);
        setLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep last 100 events
      }, 2000 + Math.random() * 3000); // Random interval between 2-5 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWatching]);

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'insert': return 'text-green-600 bg-green-100 border-green-200';
      case 'update': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'delete': return 'text-red-600 bg-red-100 border-red-200';
      case 'replace': return 'text-purple-600 bg-purple-100 border-purple-200';
      case 'drop': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'dropDatabase': return 'text-red-800 bg-red-200 border-red-300';
      case 'rename': return 'text-indigo-600 bg-indigo-100 border-indigo-200';
      case 'invalidate': return 'text-gray-600 bg-gray-100 border-gray-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getDatabaseColor = (database: string) => {
    switch (database) {
      case 'ecommerce': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'blog': return 'text-green-700 bg-green-50 border-green-200';
      case 'analytics': return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'system': return 'text-gray-700 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'insert':
        return (
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
      case 'update':
        return (
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      case 'delete':
        return (
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        );
      case 'replace':
        return (
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return timestamp.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* 상단 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{filteredLogs.length}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Insert Operations</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredLogs.filter(log => log.operationType === 'insert').length}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Update Operations</p>
              <p className="text-2xl font-bold text-blue-600">
                {filteredLogs.filter(log => log.operationType === 'update').length}
              </p>
            </div>
            <div className="p-2 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Delete Operations</p>
              <p className="text-2xl font-bold text-red-600">
                {filteredLogs.filter(log => log.operationType === 'delete').length}
              </p>
            </div>
            <div className="p-2 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 Change Stream 패널 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                MongoDB Change Stream Events
              </h3>
              {selectedDatabase && (
                <p className="text-sm text-gray-500 mt-1">
                  Watching database: <span className="font-medium text-blue-600">{selectedDatabase.name}</span>
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
                  console.log(`MongoDB Change Stream watching: ${!isWatching}`);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                  isWatching
                    ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg'
                    : 'bg-green-500 text-white hover:bg-green-600 shadow-lg'
                }`}
              >
                {isWatching ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
                    </svg>
                    <span>Stop Watching</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M15 14h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Start Watching</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 활성 상태 표시 */}
          {isWatching && (
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-600 font-medium">Live monitoring active</span>
            </div>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-lg font-medium">No Change Stream Events</p>
              <p className="text-sm">
                {selectedDatabase 
                  ? `No events found for database "${selectedDatabase.name}"`
                  : 'No events found. Start watching to see real-time changes.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredLogs.map((log) => (
                <div key={log._id.toString()} className="p-4 hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getOperationIcon(log.operationType)}
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getOperationColor(log.operationType)}`}>
                        {log.operationType.toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 rounded border text-xs font-medium ${getDatabaseColor(log.ns.db)}`}>
                        {log.ns.db}
                      </span>
                      <span className="font-medium text-gray-900 text-sm">{log.ns.coll}</span>
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                      <div>{formatTimestamp(log.timestamp)}</div>
                      <div className="font-mono">{log.timestamp.toLocaleTimeString()}</div>
                    </div>
                  </div>
                  
                  <div className="ml-7 space-y-2">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Document ID:</span>
                      <span className="font-mono ml-2 bg-gray-100 px-2 py-1 rounded text-xs">
                        {log.documentKey._id.toString()}
                      </span>
                    </div>

                    {/* Cluster Time */}
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Cluster Time:</span>
                      <span className="font-mono ml-2">{log.clusterTime.toISOString()}</span>
                    </div>

                    {/* Update Description */}
                    {log.updateDescription && (
                      <div className="mt-2">
                        <details className="group">
                          <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 flex items-center">
                            <svg className="w-4 h-4 mr-1 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            View Update Details
                          </summary>
                          <div className="mt-2 pl-5 border-l-2 border-blue-200">
                            {log.updateDescription.updatedFields && Object.keys(log.updateDescription.updatedFields).length > 0 && (
                              <div className="mb-2">
                                <div className="text-xs font-medium text-gray-700 mb-1">Updated Fields:</div>
                                <pre className="text-xs bg-blue-50 p-2 rounded border overflow-x-auto">
                                  {JSON.stringify(log.updateDescription.updatedFields, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.updateDescription.removedFields && log.updateDescription.removedFields.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-gray-700 mb-1">Removed Fields:</div>
                                <div className="text-xs bg-red-50 p-2 rounded border">
                                  {log.updateDescription.removedFields.join(', ')}
                                </div>
                              </div>
                            )}
                          </div>
                        </details>
                      </div>
                    )}

                    {/* Full Document */}
                    {log.fullDocument && (
                      <div className="mt-2">
                        <details className="group">
                          <summary className="cursor-pointer text-sm text-green-600 hover:text-green-800 flex items-center">
                            <svg className="w-4 h-4 mr-1 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            View Full Document
                          </summary>
                          <div className="mt-2 pl-5 border-l-2 border-green-200">
                            <pre className="text-xs bg-green-50 p-3 rounded border overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(log.fullDocument, null, 2)}
                            </pre>
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangeStreamLogs;