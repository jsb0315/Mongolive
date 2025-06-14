import React, { useState, useEffect } from 'react';
import { mockPerformanceMetrics, PerformanceMetrics as MetricsType } from '../../data/mockData';

const PerformanceMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsType>(mockPerformanceMetrics);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('Loading MongoDB performance metrics...');
    
    // Initial load
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    // Simulate real-time updates every 3 seconds
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        serverStatus: {
          ...prev.serverStatus,
          uptime: prev.serverStatus.uptime + 3,
          uptimeMillis: prev.serverStatus.uptimeMillis + 3000,
          localTime: new Date(),
          connections: {
            ...prev.serverStatus.connections,
            current: Math.max(1, Math.min(100, prev.serverStatus.connections.current + Math.floor((Math.random() - 0.5) * 10))),
            totalCreated: prev.serverStatus.connections.totalCreated + Math.floor(Math.random() * 3)
          },
          opcounters: {
            insert: prev.serverStatus.opcounters.insert + Math.floor(Math.random() * 10),
            query: prev.serverStatus.opcounters.query + Math.floor(Math.random() * 50),
            update: prev.serverStatus.opcounters.update + Math.floor(Math.random() * 15),
            delete: prev.serverStatus.opcounters.delete + Math.floor(Math.random() * 5),
            getmore: prev.serverStatus.opcounters.getmore + Math.floor(Math.random() * 20),
            command: prev.serverStatus.opcounters.command + Math.floor(Math.random() * 30)
          },
          mem: {
            ...prev.serverStatus.mem,
            resident: Math.max(500, Math.min(8192, prev.serverStatus.mem.resident + Math.floor((Math.random() - 0.5) * 100))),
            virtual: Math.max(1000, Math.min(16384, prev.serverStatus.mem.virtual + Math.floor((Math.random() - 0.5) * 200)))
          },
          globalLock: {
            ...prev.serverStatus.globalLock,
            totalTime: prev.serverStatus.globalLock.totalTime + 3000000,
            lockTime: prev.serverStatus.globalLock.lockTime + Math.floor(Math.random() * 1000),
            currentQueue: {
              total: Math.max(0, Math.floor(Math.random() * 10)),
              readers: Math.max(0, Math.floor(Math.random() * 5)),
              writers: Math.max(0, Math.floor(Math.random() * 3))
            },
            activeClients: {
              total: Math.max(0, Math.min(20, prev.serverStatus.globalLock.activeClients.total + Math.floor((Math.random() - 0.5) * 4))),
              readers: Math.max(0, Math.floor(Math.random() * 10)),
              writers: Math.max(0, Math.floor(Math.random() * 5))
            }
          }
        },
        dbStats: {
          ...prev.dbStats,
          objects: prev.dbStats.objects + Math.floor(Math.random() * 5),
          dataSize: prev.dbStats.dataSize + Math.floor(Math.random() * 1000),
          storageSize: prev.dbStats.storageSize + Math.floor(Math.random() * 2000)
        }
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // 계산된 메트릭들
  const memoryUsagePercent = (metrics.serverStatus.mem.resident / metrics.serverStatus.mem.virtual) * 100;
  const connectionUsagePercent = (metrics.serverStatus.connections.current / metrics.serverStatus.connections.available) * 100;
  const lockTimePercent = (metrics.serverStatus.globalLock.lockTime / metrics.serverStatus.globalLock.totalTime) * 100 * 1000000; // microsecond to percent
  
  // 서버 업타임 포맷팅
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  // 바이트를 MB로 변환
  const bytesToMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);
  const bytesToGB = (bytes: number) => (bytes / (1024 * 1024 * 1024)).toFixed(2);

  // 상태 색상 결정
  const getStatusColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-600 bg-green-100';
    if (percentage < 80) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading MongoDB metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 상단 메트릭 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 서버 업타임 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Server Uptime</p>
              <p className="text-2xl font-bold text-gray-900">{formatUptime(metrics.serverStatus.uptime)}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Started: {new Date(Date.now() - metrics.serverStatus.uptime * 1000).toLocaleDateString()}
          </div>
        </div>

        {/* 메모리 사용량 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Memory Usage</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.serverStatus.mem.resident} MB
              </p>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(memoryUsagePercent)}`}>
              {memoryUsagePercent.toFixed(1)}%
            </div>
          </div>
          <div className="mt-4 bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor(memoryUsagePercent)}`}
              style={{ width: `${Math.min(100, memoryUsagePercent)}%` }}
            ></div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Virtual: {metrics.serverStatus.mem.virtual} MB
          </div>
        </div>

        {/* 연결 상태 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Connections</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.serverStatus.connections.current}</p>
            </div>
            <div className="text-xs text-gray-500">
              / {metrics.serverStatus.connections.available.toLocaleString()}
            </div>
          </div>
          <div className="mt-4 bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor(connectionUsagePercent)}`}
              style={{ width: `${Math.min(100, connectionUsagePercent)}%` }}
            ></div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Total created: {metrics.serverStatus.connections.totalCreated.toLocaleString()}
          </div>
        </div>

        {/* Global Lock */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Global Lock</p>
              <p className="text-2xl font-bold text-gray-900">{lockTimePercent.toFixed(3)}%</p>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lockTimePercent)}`}>
              {lockTimePercent < 1 ? 'Good' : lockTimePercent < 5 ? 'Warning' : 'Critical'}
            </div>
          </div>
          <div className="mt-2 space-y-1 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Queue Total:</span>
              <span>{metrics.serverStatus.globalLock.currentQueue.total}</span>
            </div>
            <div className="flex justify-between">
              <span>Active Clients:</span>
              <span>{metrics.serverStatus.globalLock.activeClients.total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 운영 메트릭 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 데이터베이스 작업 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Database Operations
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-green-600 font-medium text-sm">Insert</div>
              <div className="text-2xl font-bold text-green-800">{metrics.serverStatus.opcounters.insert.toLocaleString()}</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-blue-600 font-medium text-sm">Query</div>
              <div className="text-2xl font-bold text-blue-800">{metrics.serverStatus.opcounters.query.toLocaleString()}</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-yellow-600 font-medium text-sm">Update</div>
              <div className="text-2xl font-bold text-yellow-800">{metrics.serverStatus.opcounters.update.toLocaleString()}</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-red-600 font-medium text-sm">Delete</div>
              <div className="text-2xl font-bold text-red-800">{metrics.serverStatus.opcounters.delete.toLocaleString()}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-purple-600 font-medium text-sm">GetMore</div>
              <div className="text-xl font-bold text-purple-800">{metrics.serverStatus.opcounters.getmore.toLocaleString()}</div>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="text-indigo-600 font-medium text-sm">Command</div>
              <div className="text-xl font-bold text-indigo-800">{metrics.serverStatus.opcounters.command.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* 데이터베이스 통계 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
            Database: {metrics.dbStats.db}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Collections</div>
                <div className="text-xl font-bold text-gray-900">{metrics.dbStats.collections}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Views</div>
                <div className="text-xl font-bold text-gray-900">{metrics.dbStats.views}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Objects</div>
                <div className="text-xl font-bold text-gray-900">{metrics.dbStats.objects.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Indexes</div>
                <div className="text-xl font-bold text-gray-900">{metrics.dbStats.indexes}</div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Data Size:</span>
                  <span className="font-medium">{bytesToMB(metrics.dbStats.dataSize)} MB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Storage Size:</span>
                  <span className="font-medium">{bytesToMB(metrics.dbStats.storageSize)} MB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Index Size:</span>
                  <span className="font-medium">{bytesToMB(metrics.dbStats.indexSize)} MB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Object Size:</span>
                  <span className="font-medium">{metrics.dbStats.avgObjSize.toFixed(0)} bytes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 시스템 상세 정보 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          System Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Memory Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Resident:</span>
                <span className="font-medium">{metrics.serverStatus.mem.resident} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Virtual:</span>
                <span className="font-medium">{metrics.serverStatus.mem.virtual} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Supported:</span>
                <span className={`font-medium ${metrics.serverStatus.mem.supported ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.serverStatus.mem.supported ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Lock Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Queue Readers:</span>
                <span className="font-medium">{metrics.serverStatus.globalLock.currentQueue.readers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Queue Writers:</span>
                <span className="font-medium">{metrics.serverStatus.globalLock.currentQueue.writers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active Readers:</span>
                <span className="font-medium">{metrics.serverStatus.globalLock.activeClients.readers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active Writers:</span>
                <span className="font-medium">{metrics.serverStatus.globalLock.activeClients.writers}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Server Info</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Local Time:</span>
                <span className="font-medium">{metrics.serverStatus.localTime.toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Uptime:</span>
                <span className="font-medium">{formatUptime(metrics.serverStatus.uptime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Available Conn:</span>
                <span className="font-medium">{metrics.serverStatus.connections.available.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;