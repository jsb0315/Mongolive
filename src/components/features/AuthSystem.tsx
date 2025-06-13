import React, { useState } from 'react';

interface AuthSystemProps {
  onAuthenticated: () => void;
  isSettings?: boolean;
}

const AuthSystem: React.FC<AuthSystemProps> = ({ onAuthenticated, isSettings = false }) => {
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('admin');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    console.log('Attempting login with:', { username, password: '***' });

    // Mock authentication
    setTimeout(() => {
      if (username === 'admin' && password === 'admin') {
        console.log('Login successful');
        onAuthenticated();
      } else {
        setError('Invalid username or password');
        console.log('Login failed');
      }
      setIsLoading(false);
    }, 100);
  };

  if (isSettings) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Authentication Settings</h3>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                <div>
                  <h4 className="font-medium text-green-800">Authentication Enabled</h4>
                  <p className="text-sm text-green-600">MongoDB authentication is active</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium text-gray-900">Current User</h5>
                <p className="text-sm text-gray-600">admin</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium text-gray-900">Role</h5>
                <p className="text-sm text-gray-600">Database Administrator</p>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-gray-900 mb-2">User Management</h5>
              <div className="space-y-2">
                <button className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                  Create New User
                </button>
                <button className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                  Manage User Roles
                </button>
                <button className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                  View Access Logs
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MongoDB Admin</h1>
          <p className="text-gray-600">Sign in to access the dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Demo credentials: admin / admin
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthSystem;