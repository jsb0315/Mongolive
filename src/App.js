import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const socket = io(`http://${process.env.REACT_APP_IP}:3001`, {
  transports: ['websocket']
});

function App() {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [query, setQuery] = useState('');
  const [projection, setProjection] = useState('');

  useEffect(() => {
    socket.on('updateUsers', handleUpdateUsers);
    socket.on('connect_error', handleError);

    return () => {
      socket.off('updateUsers', handleUpdateUsers);
      socket.off('connect_error', handleError);
    };
  }, []);

  const handleUpdateUsers = (updatedUsers) => {
    if (updatedUsers.success) {
      setUsers(updatedUsers.data);
    } else {
      console.error('Failed to fetch users:', updatedUsers.error);
    }
  };

  const handleError = (err) => {
    console.log('Connection Error:', err);
  };

  const handleEditClick = (userId, userContent) => {
    setSelectedUserId(userId);
    setContent(JSON.stringify(userContent, null, 2));
    setOpen(!open);
  };

  const handleConfirmClick = async () => {
    try {
      const updatedData = JSON.parse(content);
      await axios.put(`http://${process.env.REACT_APP_IP}:3001/api/users/${selectedUserId}`, updatedData);
      resetEditState();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const resetEditState = () => {
    setOpen(false);
    setSelectedUserId(null);
    setContent('');
  };

  const handleSearchClick = () => {
    socket.emit('searchUsers', {query: query, projection: projection});
  };

  const handleResetClick = () => {
    setQuery('');
    setProjection('');
    socket.emit('searchUsers', '');
  };

  return (
    <div style={styles.container}>
      <h1>MongoDB User Management</h1>
      <div style={{display: 'flex', margin: '10px'}}>
        <div style={{display: 'flex', flexDirection: 'column'}}>
          <input 
            type="text" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="Search users..." 
            />
          <input 
            type="text" 
            value={projection} 
            onChange={(e) => setProjection(e.target.value)} 
            placeholder="Projection..." 
            />
        </div>
        <button onClick={handleSearchClick}>Search</button>
        <button onClick={handleResetClick}>Reset</button>
      </div>
      <table border="1" style={styles.table}>
        <thead>
          <tr>
            <th style={{width: '20%'}}>ID</th>
            <th style={{width: '10%'}}>Name</th>
            <th style={{width: '40%'}}>Details</th>
            <th style={{width: '30%'}}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
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
                      onChange={(e) => setContent(e.target.value)}
                    />
                    <button onClick={handleConfirmClick}>Confirm</button>
                  </div>
                )}
                <button>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
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
    posidisplay: 'flex',
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
