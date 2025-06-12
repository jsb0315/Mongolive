import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import DatabaseExplorer from './components/features/DatabaseExplorer';
import CollectionManager from './components/features/CollectionManager';
import DocumentEditor from './components/features/DocumentEditor';
import QueryBuilder from './components/features/QueryBuilder';
import UserManagement from './components/features/UserManagement';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/database-explorer" element={<DatabaseExplorer />} />
          <Route path="/collection-manager" element={<CollectionManager />} />
          <Route path="/document-editor" element={<DocumentEditor />} />
          <Route path="/query-builder" element={<QueryBuilder />} />
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/" element={
            <div className="p-4">
              <h1 className="text-2xl font-bold mb-4">Welcome to MongoDB Admin Console</h1>
              <p className="text-gray-600">Select a feature from the sidebar to get started.</p>
            </div>
          } />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;