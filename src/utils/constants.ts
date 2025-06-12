// filepath: /mongodb-admin-console/mongodb-admin-console/src/utils/constants.ts

export const API_BASE_URL = 'http://localhost:3001/api';
export const SOCKET_URL = 'http://localhost:3001';
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
};

export const COLLECTION_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
};

export const ERROR_MESSAGES = {
  REQUIRED: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  NOT_FOUND: 'Resource not found.',
  SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
};