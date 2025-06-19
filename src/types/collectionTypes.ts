import { MongoDocument } from '../data/mockData';

export interface FieldPath {
  name: string;
  value: any;
  path: string[];
  type: string | string[];
  isObjectId: boolean;
  isDocument_type: false | string[];
  isArray: boolean;
  hasSubDocuments: boolean;
  // Reference 관련 추가 필드
  hasReference: boolean;
  referencedDatabase: string | null;
  referencedCollection: string | null;
  referencedDocuments: Array<MongoDocument> | null;
  // ReferencedDocument 관련 추가 필드 (상위 문서의 ObjectID 저장)
  isReferencedDocument: string | null;
  originalDocument?: MongoDocument;
}