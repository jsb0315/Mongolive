import React, { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';

const QueryBuilder: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExecuteQuery = async (): Promise<void> => {
    setError(null);
    console.log('Executing query:', query);
    
    try {
      // const response = await fetch(`http://${process.env.REACT_APP_IP}:3001/api/query`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ query }),
      // });

      // if (!response.ok) {
      //   throw new Error('Failed to execute query');
      // }

      // const data = await response.json();
      // setResult(data);
      
      // Mock response based on query
      let mockResult;
      if (query.toLowerCase().includes('find')) {
        mockResult = [
          { _id: '1', name: 'John Doe', email: 'john@example.com' },
          { _id: '2', name: 'Jane Smith', email: 'jane@example.com' },
        ];
      } else if (query.toLowerCase().includes('count')) {
        mockResult = { count: 25 };
      } else {
        mockResult = { message: 'Query executed successfully', affectedDocuments: 3 };
      }
      
      setResult(mockResult);
      console.log('Query executed successfully:', mockResult);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to execute query';
      setError(errorMessage);
      console.error('Query execution failed:', errorMessage);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Query Builder</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          MongoDB Query
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your MongoDB query (e.g., db.users.find({}))"
          className="w-full h-32 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <Button onClick={handleExecuteQuery} text="Execute Query" />
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
      {result && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Query Result:</h3>
          <pre className="bg-gray-100 p-4 rounded border overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default QueryBuilder;