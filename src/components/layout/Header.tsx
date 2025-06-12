import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-blue-600 text-white p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold">MongoDB Admin Console</h1>
      <nav>
        <ul className="flex space-x-4">
          <li>
            <a href="/" className="hover:underline">Home</a>
          </li>
          <li>
            <a href="/databases" className="hover:underline">Databases</a>
          </li>
          <li>
            <a href="/collections" className="hover:underline">Collections</a>
          </li>
          <li>
            <a href="/users" className="hover:underline">Users</a>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;