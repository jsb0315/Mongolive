import React from 'react';

const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 h-full bg-gray-800 text-white">
      <div className="p-4">
        <h2 className="text-lg font-bold">Admin Console</h2>
      </div>
      <nav className="mt-4">
        <ul>
          <li className="hover:bg-gray-700 p-2">
            <a href="/databases" className="block">Database Explorer</a>
          </li>
          <li className="hover:bg-gray-700 p-2">
            <a href="/collections" className="block">Collection Manager</a>
          </li>
          <li className="hover:bg-gray-700 p-2">
            <a href="/documents" className="block">Document Editor</a>
          </li>
          <li className="hover:bg-gray-700 p-2">
            <a href="/queries" className="block">Query Builder</a>
          </li>
          <li className="hover:bg-gray-700 p-2">
            <a href="/users" className="block">User Management</a>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;