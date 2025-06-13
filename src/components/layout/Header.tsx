import React from 'react';
import { useDatabaseContext } from '../../contexts/DatabaseContext';

interface HeaderProps {
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  const { selectedDatabase, databases, selectDatabase, isLoading } = useDatabaseContext();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-start flex-wrap">
          <div className='mr-6'>
            <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
            <p className="text-sm text-gray-500">MongoDB Admin Console</p>
          </div>
          
          {/* Database Selection */}
          <div className="flex items-center space-x-3">
            <label htmlFor="database-select" className="text-sm font-medium text-gray-700">
              Database:
            </label>
            <select
              id="database-select"
              value={selectedDatabase?.name || ''}
              onChange={(e) => selectDatabase(e.target.value)}
              disabled={isLoading}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 min-w-32"
            >
              {databases.map((db) => (
                <option key={db.name} value={db.name}>
                  {db.name}
                </option>
              ))}
            </select>
            
            {/* Database Info */}
            {selectedDatabase && (
              <div className="flex items-center space-x-4 text-xs text-gray-500 ml-4">
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
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Connected</span>
          </div>
          
          {/* Current Database Indicator */}
          {selectedDatabase && (
            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              {selectedDatabase.name}
            </div>
          )}
          
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