import axios from 'axios';
import { User } from '../types/user';
import { Database } from '../types/database';

// Base URL for the API
const API_URL = `http://${process.env.REACT_APP_IP}:3001/api`;

// Function to fetch all users from the database
export const fetchUsers = async (): Promise<User[]> => {
  try {
    const response = await axios.get(`${API_URL}/users`);
    return response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

// Function to fetch all databases
export const fetchDatabases = async (): Promise<Database[]> => {
  try {
    const response = await axios.get(`${API_URL}/databases`);
    return response.data;
  } catch (error) {
    console.error('Error fetching databases:', error);
    throw error;
  }
};

// Function to create a new database
export const createDatabase = async (dbName: string): Promise<void> => {
  try {
    await axios.post(`${API_URL}/databases`, { name: dbName });
  } catch (error) {
    console.error('Error creating database:', error);
    throw error;
  }
};

// Function to delete a database
export const deleteDatabase = async (dbName: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/databases/${dbName}`);
  } catch (error) {
    console.error('Error deleting database:', error);
    throw error;
  }
};

// Function to fetch collections in a specific database
export const fetchCollections = async (dbName: string): Promise<string[]> => {
  try {
    const response = await axios.get(`${API_URL}/databases/${dbName}/collections`);
    return response.data;
  } catch (error) {
    console.error('Error fetching collections:', error);
    throw error;
  }
};