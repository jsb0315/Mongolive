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

  useEffect(() => {
    // Listen for updates from the server
    socket.on('updateUsers', (updatedUsers) => {
      setUsers(updatedUsers);
    });
    socket.on('connect_error', (err) => {
      console.log('Connection Error:', err);
    });

    // Cleanup listener on unmount
    return () => {
      socket.off('updateUsers');
    };
  }, []);

  const handleEditClick = (userId, userContent) => {
    setSelectedUserId(userId);
    setContent(JSON.stringify(userContent, null, 2));
    setOpen(!open);
  };

  const handleConfirmClick = async () => {
    try {
      const updatedData = JSON.parse(content);
      await axios.put(`http://${process.env.REACT_APP_IP}:3001/api/users/${selectedUserId}`, updatedData);
      setOpen(false);
      setSelectedUserId(null);
      setContent('');
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <h1>MongoDB User Management</h1>
      <table
        border="1"
        style={{
          width: '50vw',
          borderCollapse: 'collapse',
          margin: '0 auto',
          textAlign: 'left',
        }}
      >
        <thead >
          <tr>
          <th style={{ width: '20%' }}>ID</th>
          <th style={{ width: '10%' }}>Name</th>
          <th style={{ width: '30%' }}>Details</th>
          <th style={{ width: '10%' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id}>
              <td style={{ verticalAlign: 'top', padding: '10px' }}>{user._id}</td>
              <td style={{ verticalAlign: 'top', padding: '10px' }}>{user.name}</td>
              <td style={{ verticalAlign: 'top', padding: '10px' }}>
                <details>
                  <summary>View Details</summary>
                  <div
                    style={{
                      margin: '10px 0',
                      padding: '5px',
                      backgroundColor: '#f9f9f9',
                      maxHeight: '30vh',
                      overflowY: 'auto',
                      border: '1px solid #ddd',
                    }}
                  >
                    <strong>JSON Data:</strong>
                    <br />
                    <code
                      style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                      }}
                    >
                      {JSON.stringify(user, null, 2)}
                    </code>
                  </div>
                </details>
              </td>
              <td>
                <button onClick={() => handleEditClick(user._id, user)}>Edit</button>
                {open && selectedUserId === user._id && (
                  <div
                    style={{
                      margin: '10px 0',
                      padding: '5px',
                      backgroundColor: '#f9f9f9',
                      maxHeight: '30vh',
                      overflowY: 'auto',
                      border: '1px solid #ddd',
                    }}
                  >
                    <strong>JSON Data:</strong>
                    <br />
                    <textarea
                      style={{
                        whiteSpace: 'pre-wrap',
                        display: 'block',
                        minHeight: '20px',
                        width: '200px',
                        overflowY: 'scroll',
                      }}
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

export default App;
