import React, { useState, useEffect } from 'react';
import { mockPerformanceMetrics, PerformanceMetrics as MetricsType } from '../../data/mockData';

const PerformanceMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsType>(mockPerformanceMetrics);

  useEffect(() => {
    console.log('Loading performance metrics...');
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        cpu: Math.max(0, Math.min(100, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: {
          ...prev.memory,
          percentage: Math.max(0, Math.min(100, prev.memory.percentage + (Math.random() - 0.5) * 5))
        },
        connections: {
          ...prev.connections,
          current: Math.max(0, prev.connections.current + Math.floor((Math.random() - 0.5) * 5))
        },
        operations: {
          insert: prev.operations.insert + Math.floor(Math.random() * 5),
          query: prev.operations.query + Math.floor(Math.random() * 20),
          update: prev.operations.update + Math.floor(Math.random() * 8),
          delete: prev.operations.delete + Math.floor(Math.random() * 2),
        }
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-600 bg-green-100';
    if (percentage < 80) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">CPU Usage</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.cpu.toFixed(1)}%</p>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(metrics.cpu)}`}>
              {metrics.cpu < 50 ? 'Good' : metrics.cpu < 80 ? 'Warning' : 'Critical'}
            </div>
          </div>
          <div className="mt-4 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${metrics.cpu}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Memory Usage</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.memory.used.toFixed(1)} / {metrics.memory.total.toFixed(1)} GB
              </p>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(metrics.memory.percentage)}`}>
              {metrics.memory.percentage.toFixed(1)}%
            </div>
          </div>
          <div className="mt-4 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${metrics.memory.percentage}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Connections</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.connections.current}</p>
            </div>
            <div className="text-xs text-gray-500">
              / {metrics.connections.available} available
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Total created: {metrics.connections.totalCreated.toLocaleString()}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div>
            <p className="text-sm font-medium text-gray-600">Operations/sec</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Insert</span>
                <span className="font-medium">{metrics.operations.insert}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Query</span>
                <span className="font-medium">{metrics.operations.query}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Update</span>
                <span className="font-medium">{metrics.operations.update}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Delete</span>
                <span className="font-medium">{metrics.operations.delete}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Resource Usage</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">CPU</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${metrics.cpu}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-12">{metrics.cpu.toFixed(1)}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Memory</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${metrics.memory.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-12">{metrics.memory.percentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Database Activity</h4>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-green-50 p-2 rounded">
                  <div className="text-green-600 font-medium">Reads</div>
                  <div className="text-lg font-bold text-green-800">{metrics.operations.query}</div>
                </div>
                <div className="bg-blue-50 p-2 rounded">
                  <div className="text-blue-600 font-medium">Writes</div>
                  <div className="text-lg font-bold text-blue-800">
                    {metrics.operations.insert + metrics.operations.update + metrics.operations.delete}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;