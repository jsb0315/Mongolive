// filepath: /mongodb-admin-console/mongodb-admin-console/src/types/database.ts
export interface Database {
  _id: string;
  name: string;
  collections: Collection[];
}

export interface Collection {
  _id: string;
  name: string;
  documentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  _id: string;
  [key: string]: any; // Allows for dynamic fields in the document
}

export interface Query {
  filter?: Record<string, any>;
  projection?: Record<string, boolean>;
  sort?: Record<string, 1 | -1>;
  limit?: number;
}