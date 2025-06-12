// import axios from 'axios';
// import { APIResponse, User, Database, Collection } from '../types/api';

// // Set the base URL for the API
// const API_URL = `${process.env.REACT_APP_API_URL}/api`;

// // Function to fetch all users
// export const fetchUsers = async (): Promise<APIResponse<User[]>> => {
//   try {
//     const response = await axios.get(`${API_URL}/users`);
//     return response.data;
//   } catch (error) {
//     return { success: false, error: error.message, data: [] };
//   }
// };

// // Function to fetch all databases
// export const fetchDatabases = async (): Promise<APIResponse<Database[]>> => {
//   try {
//     const response = await axios.get(`${API_URL}/databases`);
//     return response.data;
//   } catch (error) {
//     return { success: false, error: error.message, data: [] };
//   }
// };

// // Function to fetch collections for a specific database
// export const fetchCollections = async (databaseName: string): Promise<APIResponse<Collection[]>> => {
//   try {
//     const response = await axios.get(`${API_URL}/databases/${databaseName}/collections`);
//     return response.data;
//   } catch (error) {
//     return { success: false, error: error.message, data: [] };
//   }
// };

// // Function to create a new user
// export const createUser = async (userData: User): Promise<APIResponse<User>> => {
//   try {
//     const response = await axios.post(`${API_URL}/users`, userData);
//     return response.data;
//   } catch (error) {
//     return { success: false, error: error.message, data: null };
//   }
// };

// // Function to delete a user
// export const deleteUser = async (userId: string): Promise<APIResponse<null>> => {
//   try {
//     const response = await axios.delete(`${API_URL}/users/${userId}`);
//     return response.data;
//   } catch (error) {
//     return { success: false, error: error.message, data: null };
//   }
// };