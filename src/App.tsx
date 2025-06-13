import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import CollectionExplorer from './components/features/CollectionExplorer';
import ChangeStreamLogs from './components/features/ChangeStreamLogs';
import QueryExecutor from './components/features/QueryExecutor';
import ClientMonitoring from './components/features/ClientMonitoring';
import PerformanceMetrics from './components/features/PerformanceMetrics';
import AuthSystem from './components/features/AuthSystem';
import { DatabaseProvider } from './contexts/DatabaseContext';

import JsonExplorer from './test';


const sampleData = {
    a: 1,
    b: [1, 2, 3],
    c: {
      c_c: {
        c_C_C: 123,
        js: {
          framework: 'React',
          language: 'TypeScript',
          version: '18.0',
          nested: {
            deep: {
              value: 'Hello World from deep nested object',
              number: 42,
              boolean: true,
              array: [
                { id: 1, name: 'Item 1' },
                { id: 2, name: 'Item 2' },
                { id: 3, name: 'Item 3' }
              ],
              moreNested: {
                level1: {
                  level2: {
                    level3: {
                      finalValue: 'You found me!'
                    }
                  }
                }
              }
            }
          }
        }
      },
      another: {
        test: 'value',
        numbers: [10, 20, 30, 40, 50]
      }
    },
    simpleArray: [1, 2, 3, 4, 5],
    complexArray: [
      { name: 'Object 1', value: 100 },
      { name: 'Object 2', value: 200 }
    ]
  };

interface User {
  _id: string;
  name: string;
  [key: string]: any;
}

interface UpdateUsersResponse {
  success?: boolean;
  data?: User[];
  error?: string;
}

interface SearchParams {
  query: string;
  projection: string;
}

// const socket: Socket = io(`http://${process.env.REACT_APP_IP}:3001`, {
//   transports: ['websocket']
// });

type ActiveTab = 'collections' | 'changestream' | 'query' | 'clients' | 'performance' | 'auth';

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState<boolean>(false);
  const [content, setContent] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');
  const [projection, setProjection] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('collections');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    // const handleConnect = (): void => {
    //   console.log('Connected to server');
  
    //   // 세션 스토리지에서 데이터 가져오기
    //   const savedQuery: string = sessionStorage.getItem('query') || ''; 
    //   const savedProjection: string = sessionStorage.getItem('projection') || '';
  
    //   setQuery(savedQuery);
    //   setProjection(savedProjection);
  
    //   try {
    //     socket.emit('searchUsers', { query: savedQuery, projection: savedProjection });
    //     console.log('------------------');
    //   } catch (error) {
    //     console.error('Invalid data in sessionStorage:', error);
    //   }
    // };
  
    // socket.on('connect', handleConnect);
    // socket.on('updateUsers', handleUpdateUsers);
    // socket.on('connect_error', handleError);
  
    // return () => {
    //   socket.off('connect', handleConnect);
    //   socket.off('updateUsers', handleUpdateUsers);
    //   socket.off('connect_error', handleError);
    // };
  }, []);

  const handleUpdateUsers = (updatedUsers: UpdateUsersResponse): void => {
    updatedUsers.success && setUsers(updatedUsers.data || []);
    updatedUsers.error && console.error('Failed to fetch users:', updatedUsers.error);
  };

  const handleError = (err: Error): void => {
    console.log('Connection Error:', err);
  };

  const handleEditClick = (userId: string, userContent: User): void => {
    setSelectedUserId(userId);
    setContent(JSON.stringify(userContent, null, 2));
    setOpen(!open);
  };

  const handleConfirmClick = async (): Promise<void> => {
    try {
      const updatedData: User = JSON.parse(content);
      await axios.put(`http://${process.env.REACT_APP_IP}:3001/api/users/${selectedUserId}`, updatedData);
      resetEditState();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const resetEditState = (): void => {
    setOpen(false);
    setSelectedUserId(null);
    setContent('');
  };

  // const handleSearchClick = (): void => {
  //   sessionStorage.setItem('query', query);
  //   sessionStorage.setItem('projection', projection);
  //   socket.emit('searchUsers', { query: query, projection: projection });
  // };

  // const handleResetClick = (): void => {
  //   setQuery('');
  //   setProjection('');
  //   sessionStorage.setItem('query', '');
  //   sessionStorage.setItem('projection', '');
  //   socket.emit('searchUsers', { query: '', projection: '' });
  // };

  const renderContent = () => {
    switch (activeTab) {
      case 'collections':
        return <CollectionExplorer />;
      case 'changestream':
        return <JsonExplorer data={sampleData} />;
      case 'query':
        return <QueryExecutor />;
      case 'clients':
        return <ClientMonitoring />;
      case 'performance':
        return <PerformanceMetrics />;
      case 'auth':
        return <AuthSystem onAuthenticated={() => {}} isSettings={true} />;
      default:
        return <CollectionExplorer />;
    }
  };

  if (!isAuthenticated) {
    return <AuthSystem onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <DatabaseProvider>
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onLogout={() => setIsAuthenticated(false)} />
        <main className="flex-1 overflow-auto p-6">
          {renderContent()}
        </main>
      </div>
    </div>
    </DatabaseProvider>
  );
}

export default App;
