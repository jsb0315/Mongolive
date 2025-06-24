import { MongoDocument } from '../data/mockData';

export interface FieldPath {
  name: string; // 클릭한 필드 이름
  value: any; // 필드의 값 (ObjectId, Document 등)
  path: string[]; // 필드의 경로 (예: ['field1', 'field2'])
  type: string | string[]; // 필드의 타입 (예: 'ObjectId', 'Document', 'Array', 'String' 등)
  isObjectId: boolean;  // ObjectId 여부 --> 왜있어야됨??
  isDocument_type: false | string[];  // Document 여부 (true면 Document, false면 일반 값, 배열이면 Document 타입 배열) --> 왜있어야됨??
  isArray: boolean;  // Array 여부 --> 왜있어야됨??
  hasSubDocuments: boolean;  // SubDocument 여부 --> 왜있어야됨??
  // Reference 관련
  hasReference: boolean;  // Reference 여부 --> 
  // 참조 정보 - 
  referencedDatabase: string | null;  // 참조된 데이터베이스
  referencedCollection: string[] | null;  // 참조된 컬렉션
  referencedDocuments: MongoDocument[] | null;  // 참조된 문서
  // ReferencedDocument 관련 추가 필드 (상위 문서의 ObjectID 저장)
  isReferencedDocument: string | null;  // ReferencedDocument 여부
  originalDocument?: MongoDocument;  // 원본 문서
}