import React, { useState, useEffect } from 'react';
import { mockConnectedClients, ConnectedClient } from '../../data/mockData';

const ClientMonitoring: React.FC = () => {
  const [clients, setClients] = useState<ConnectedClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('Loading MongoDB connected clients...');
    
    // Initial load
    setTimeout(() => {
      setClients(mockConnectedClients);
      setIsLoading(false);
    }, 1000);

    // Simulate real-time client updates
    const interval = setInterval(() => {
      setClients(prev => prev.map(client => ({
        ...client,
        // Simulate random operation changes
        currentOp: Math.random() > 0.7 ? 
          ['find', 'aggregate', 'insert', 'update', 'delete'][Math.floor(Math.random() * 5)] : 
          client.currentOp
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const killConnection = (connectionId: number) => {
    console.log(`Killing connection: ${connectionId}`);
    setClients(prev => prev.map(client => 
      client.connectionId === connectionId ? { ...client, active: false } : client
    ));
  };

  const formatConnectionTime = (connectionId: number) => {
    // Simulate connection duration based on connectionId
    const baseTime = Date.now() - (connectionId % 10000) * 1000; // Mock connection time
    const now = Date.now();
    const diffInSeconds = Math.floor((now - baseTime) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}s`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ${diffInSeconds % 60}s`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h ${Math.floor((diffInSeconds % 3600) / 60)}m`;
    } else {
      return `${Math.floor(diffInSeconds / 86400)}d ${Math.floor((diffInSeconds % 86400) / 3600)}h`;
    }
  };

  const getDriverIcon = (driverName: string) => {
    switch (driverName.toLowerCase()) {
      case 'mongodb compass':
        return (
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2L3 7v11h14V7l-7-5z"/>
            <path d="M10 2v16"/>
            <path d="M3 7h14"/>
          </svg>
        );
      case 'nodejs':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2L15 5v10l-5 3-5-3V5l5-3z"/>
          </svg>
        );
      case 'python':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getOperationColor = (operation?: string) => {
    switch (operation) {
      case 'find':
        return 'bg-blue-100 text-blue-800';
      case 'aggregate':
        return 'bg-purple-100 text-purple-800';
      case 'insert':
        return 'bg-green-100 text-green-800';
      case 'update':
        return 'bg-yellow-100 text-yellow-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading connected clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 상단 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Connections</p>
              <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Connections</p>
              <p className="text-2xl font-bold text-green-600">{clients.filter(c => c.active).length}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Inactive Connections</p>
              <p className="text-2xl font-bold text-red-600">{clients.filter(c => !c.active).length}</p>
            </div>
            <div className="p-2 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unique Drivers</p>
              <p className="text-2xl font-bold text-purple-600">
                {new Set(clients.map(c => c.clientMetadata.driver.name)).size}
              </p>
            </div>
            <div className="p-2 bg-purple-100 rounded-full">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 클라이언트 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Connected Clients
            </h3>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Active: {clients.filter(c => c.active).length}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-gray-600">Inactive: {clients.filter(c => !c.active).length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Connection
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver & Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Operation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User & Database
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((client) => (
                <tr key={client.connectionId} className={!client.active ? 'opacity-60 bg-gray-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        client.active ? 'bg-green-500' : 'bg-red-400'
                      }`}></div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          #{client.connectionId}
                        </div>
                        <div className="text-sm text-gray-500">
                          {client.active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-mono">
                      {client.client}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getDriverIcon(client.clientMetadata.driver.name)}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {client.clientMetadata.driver.name} {client.clientMetadata.driver.version}
                        </div>
                        <div className="text-sm text-gray-500">
                          {client.clientMetadata.os.name} {client.clientMetadata.os.version}
                        </div>
                        <div className="text-xs text-gray-400">
                          {client.clientMetadata.os.architecture}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {client.currentOp ? (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getOperationColor(client.currentOp)}`}>
                        {client.currentOp.toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">Idle</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {client.effectiveUsers.map((user, index) => (
                        <div key={index} className="flex items-center">
                          <span className="font-medium">{user.user}</span>
                          <span className="mx-1 text-gray-400">@</span>
                          <span className="text-gray-600">{user.db}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-mono">
                      {formatConnectionTime(client.connectionId)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {client.active ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => killConnection(client.connectionId)}
                          className="text-red-600 hover:text-red-900 transition-colors duration-200"
                        >
                          Kill Connection
                        </button>
                        <button className="text-blue-600 hover:text-blue-900 transition-colors duration-200">
                          View Details
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400">Disconnected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 클라이언트 상세 정보 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Driver Statistics</h3>
          <div className="space-y-3">
            {Array.from(new Set(clients.map(c => c.clientMetadata.driver.name))).map(driver => {
              const count = clients.filter(c => c.clientMetadata.driver.name === driver).length;
              const activeCount = clients.filter(c => c.clientMetadata.driver.name === driver && c.active).length;
              return (
                <div key={driver} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    {getDriverIcon(driver)}
                    <span className="ml-3 font-medium text-gray-900">{driver}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-green-600">{activeCount} active</span>
                    <span className="text-gray-500">{count} total</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Operation Activity</h3>
          <div className="space-y-3">
            {['find', 'aggregate', 'insert', 'update', 'delete'].map(operation => {
              const count = clients.filter(c => c.currentOp === operation).length;
              return (
                <div key={operation} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getOperationColor(operation)}`}>
                      {operation.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{count} connections</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientMonitoring;