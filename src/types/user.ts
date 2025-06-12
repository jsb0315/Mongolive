// filepath: mongodb-admin-console/src/types/user.ts
export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserResponse {
  success: boolean;
  data: User | null;
  error?: string;
}

export interface UserListResponse {
  success: boolean;
  data: User[];
  error?: string;
}