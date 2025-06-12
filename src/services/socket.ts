import { io, Socket } from 'socket.io-client';

const socket: Socket = io(`http://${process.env.REACT_APP_IP}:3001`, {
  transports: ['websocket'],
});

// Function to connect to the WebSocket server
export const connectSocket = () => {
  socket.connect();
};

// Function to disconnect from the WebSocket server
export const disconnectSocket = () => {
  socket.disconnect();
};

// Function to listen for updates from the server
export const onUpdateUsers = (callback: (data: any) => void) => {
  socket.on('updateUsers', callback);
};

// Function to emit a search request to the server
export const searchUsers = (query: string, projection: string) => {
  socket.emit('searchUsers', { query, projection });
};

// Function to handle socket errors
export const onError = (callback: (error: Error) => void) => {
  socket.on('connect_error', callback);
};

// Export the socket instance for direct usage if needed
export default socket;