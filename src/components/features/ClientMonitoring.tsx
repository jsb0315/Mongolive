import React, { useState, useEffect } from 'react';
import { mockConnectedClients, ConnectedClient } from '../../data/mockData';

const ClientMonitoring: React.FC = () => {
  const [clients, setClients] = useState<ConnectedClient[]>([]);

  useEffect(() => {
    console.log('Loading connected clients...');
    setClients(mockConnectedClients);
  }, []);

  const disconnectClient = (clientId: string) => {
    console.log(`Disconnecting client: ${clientId}`);
    setClients(prev => prev.map(client => 
      client.id === clientId ? { ...client, isActive: false } : client
    ));
  };

  const getConnectionDuration = (connectionTime: string) => {
    const now = new Date();
    const connectedAt = new Date(connectionTime);
    const diffInMinutes = Math.floor((now.getTime() - connectedAt.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ${diffInMinutes % 60}m`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Connected Clients</h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Active: {clients.filter(c => c.isActive).length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-gray-600">Inactive: {clients.filter(c => !c.isActive).length}</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Host
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Application
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Connected
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((client) => (
                <tr key={client.id} className={!client.isActive ? 'opacity-60' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        client.isActive ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                      <span className={`text-sm font-medium ${
                        client.isActive ? 'text-green-800' : 'text-gray-500'
                      }`}>
                        {client.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{client.host}:{client.port}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{client.applicationName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {getConnectionDuration(client.connectionTime)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {client.isActive && (
                      <button
                        onClick={() => disconnectClient(client.id)}
                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                      >
                        Disconnect
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClientMonitoring;