import { MongoDocument } from '../data/mockData';

export interface FieldPath {
  name: string; // 클릭한 필드 이름
  value: any; // 필드의 값 (ObjectId, Document 등)
  path: string[]; // 필드의 경로 (예: ['field1', 'field2'])
  type: string[]; // 필드의 타입 (예: 'ObjectId', 'Document', 'Array', 'String' 등)
  // isObjectId: boolean;  // ObjectId 여부 --> 왜있어야됨??
  // isDocument_type: false | string[];  // Document 여부 (true면 Document, false면 일반 값, 배열이면 Document 타입 배열) --> 왜있어야됨??
  // isArray: boolean;  // Array 여부 --> 왜있어야됨?? Type에 Array 포함됨으로 땜빵
  // hasSubDocuments: boolean;  // SubDocument 여부 --> 왜있어야됨?? Type에 Embedded 포함됨으로 땜빵
  // hasReference: boolean;  // 필드 내부에 Reference 있는지 여부 --> 왜있어야됨?? Type에 ObjectId 포함됨으로 땜빵
  // isReference: Type이 Referenced인 경우로 땜빵

  // 참조 정보 - Reference 필드의 정보
  referencedDatabase: string | null;  // 참조된 데이터베이스
  referencedCollection: string[] | null;  // 참조된 컬렉션
  referencedDocuments: MongoDocument[] | null;  // Ref Doc 탐색 / 배열
  referencedId: string | null;  // Ref Doc인지 여부 (상위 문서의 ObjectID 저장)
  originalDocument?: MongoDocument;  // Ref Doc 탐색 / 일반
}