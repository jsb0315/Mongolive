import React, { useState } from 'react';

const QueryExecutor: React.FC = () => {
  const [query, setQuery] = useState<string>('db.users.find({})');
  const [result, setResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);

  const executeQuery = async () => {
    setIsExecuting(true);
    console.log('Executing query:', query);

    // Mock query execution
    setTimeout(() => {
      const mockResult = {
        executionTime: Math.random() * 100 + 10,
        documentsReturned: Math.floor(Math.random() * 1000),
        data: [
          { _id: '507f1f77bcf86cd799439011', name: 'John Doe', email: 'john@example.com' },
          { _id: '507f1f77bcf86cd799439012', name: 'Jane Smith', email: 'jane@example.com' },
        ]
      };

      setResult(mockResult);
      setQueryHistory(prev => [query, ...prev].slice(0, 10));
      setIsExecuting(false);
      console.log('Query executed successfully:', mockResult);
    }, 1000);
  };

  const predefinedQueries = [
    'db.users.find({})',
    'db.users.find({role: "admin"})',
    'db.products.find({price: {$gt: 100}})',
    'db.orders.aggregate([{$group: {_id: "$status", count: {$sum: 1}}}])',
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Query Executor</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">MongoDB Query</label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter your MongoDB query..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={executeQuery}
              disabled={isExecuting}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isExecuting ? 'Executing...' : 'Execute Query'}
            </button>
            
            <select
              onChange={(e) => setQuery(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Select predefined query...</option>
              {predefinedQueries.map((q, index) => (
                <option key={index} value={q}>{q}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Query Results</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Execution Time</div>
              <div className="text-lg font-semibold text-green-800">{result.executionTime.toFixed(2)}ms</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Documents Returned</div>
              <div className="text-lg font-semibold text-blue-800">{result.documentsReturned}</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">Status</div>
              <div className="text-lg font-semibold text-purple-800">Success</div>
            </div>
          </div>

          <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto max-h-96 overflow-y-auto">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}

      {queryHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Query History</h3>
          <div className="space-y-2">
            {queryHistory.map((q, index) => (
              <div
                key={index}
                onClick={() => setQuery(q)}
                className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 font-mono text-sm"
              >
                {q}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryExecutor;