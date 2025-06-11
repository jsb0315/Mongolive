import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

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

const socket: Socket = io(`http://${process.env.REACT_APP_IP}:3001`, {
  transports: ['websocket']
});

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState<boolean>(false);
  const [content, setContent] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');
  const [projection, setProjection] = useState<string>('');

  useEffect(() => {
    const handleConnect = (): void => {
      console.log('Connected to server');
  
      // 세션 스토리지에서 데이터 가져오기
      const savedQuery: string = sessionStorage.getItem('query') || ''; 
      const savedProjection: string = sessionStorage.getItem('projection') || '';
  
      setQuery(savedQuery);
      setProjection(savedProjection);
  
      try {
        socket.emit('searchUsers', { query: savedQuery, projection: savedProjection });
        console.log('------------------');
      } catch (error) {
        console.error('Invalid data in sessionStorage:', error);
      }
    };
  
    socket.on('connect', handleConnect);
    socket.on('updateUsers', handleUpdateUsers);
    socket.on('connect_error', handleError);
  
    return () => {
      socket.off('connect', handleConnect);
      socket.off('updateUsers', handleUpdateUsers);
      socket.off('connect_error', handleError);
    };
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

  const handleSearchClick = (): void => {
    sessionStorage.setItem('query', query);
    sessionStorage.setItem('projection', projection);
    socket.emit('searchUsers', { query: query, projection: projection });
  };

  const handleResetClick = (): void => {
    setQuery('');
    setProjection('');
    sessionStorage.setItem('query', '');
    sessionStorage.setItem('projection', '');
    socket.emit('searchUsers', { query: '', projection: '' });
  };

  return (
    <div style={styles.container}>
      <h1>MongoDB User Management</h1>
      <div style={{display: 'flex', margin: '10px'}}>
        <div style={{display: 'flex', flexDirection: 'column'}}>
          <input 
            type="text" 
            value={query} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)} 
            placeholder="Search users..." 
            />
          <input 
            type="text" 
            value={projection} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProjection(e.target.value)} 
            placeholder="Projection..." 
            />
        </div>
        <button onClick={handleSearchClick}>Search</button>
        <button onClick={handleResetClick}>Reset</button>
      </div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{width: '20%'}}>ID</th>
            <th style={{width: '10%'}}>Name</th>
            <th style={{width: '40%'}}>Details</th>
            <th style={{width: '30%'}}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user: User) => (
            <tr key={user._id}>
              <td style={styles.td}>{user._id}</td>
              <td style={styles.td}>{user.name}</td>
              <td style={styles.td}>
                <details>
                  <summary>View Details</summary>
                  <div style={styles.details}>
                    <strong>JSON Data:</strong>
                    <br />
                    <code style={styles.code}>
                      {JSON.stringify(user, null, 2)}
                    </code>
                  </div>
                </details>
              </td>
              <td>
                <button onClick={() => handleEditClick(user._id, user)}>Edit</button>
                {open && selectedUserId === user._id && (
                  <div style={styles.details}>
                    <strong>JSON Data:</strong>
                    <br />
                    <textarea
                      style={styles.textarea}
                      value={content}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                    />
                    <button onClick={handleConfirmClick}>Confirm</button>
                  </div>
                )}
                <button>Delete</button>
              </td>
            </tr>
          ))}
          {!users.length && <tr><td colSpan={4} style={{padding: 30, textAlign: 'center'}}>Result not found</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  table: {
    width: '50vw',
    borderCollapse: 'collapse',
    margin: '0 auto',
    textAlign: 'left',
    border: '1px solid #000'
  },
  td: {
    verticalAlign: 'top',
    padding: '10px',
  },
  details: {
    margin: '10px 0',
    padding: '5px',
    backgroundColor: '#f9f9f9',
    maxHeight: '30vh',
    overflowY: 'auto',
    border: '1px solid #ddd',
  },
  code: {
    whiteSpace: 'pre-wrap',
    display: 'block',
  },
  textarea: {
    whiteSpace: 'pre-wrap',
    display: 'block',
    minHeight: '100px',
    width: '200px',
    overflowY: 'scroll',
  }
};

export default App;
