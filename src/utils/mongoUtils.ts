import { ObjectId, Decimal128 } from 'bson';
import { MongoDocument, findDocumentByReference, crossDatabaseReferenceMap } from '../data/mockData';

// MongoDB ObjectId 형식 확인
export const isObjectId = (value: any): boolean => {
  if (value instanceof ObjectId) return true;
  return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
};

// ObjectId 배열 확인 (isObjectId && isArray로 대체)
export const isObjectIdArray = (value: any): boolean => {
  return Array.isArray(value) &&
    value.length > 0 &&
    value.every(item => isObjectId(item));
};

// Document 확인 (객체 O, ObjectId X, value._id X)
export const isDocument = (value: any): 'Document' | 'Embedded' | false => {
  if (value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof ObjectId) &&
    !(value instanceof Decimal128) &&
    !isObjectId(value))
    if (value._id)
      return 'Embedded'; // Document는 _id 필드가 없어야 함
    else return 'Document'; // 일반 Document
  else return false;
};

// SubDocument 확인 (_id 필드를 가진 임베디드 도큐먼트)
export const hasSubDocuments = (value: any): boolean => {
  if (Array.isArray(value) && value.length > 0) {
    return value.every(item =>
      typeof item === 'object' &&
      item !== null &&
      '_id' in item &&
      isObjectId(item._id)
    );
  }
  return false;
};

// 탐색 가능한 구조 확인 (depth 증가 조건) - Reference와 ReferencedDocument 추가
export const canTraverse = (value: any, hasReference: boolean = false, isReferencedDocument: string | null = null, isArray: boolean = false): boolean => {
  // Reference 필드도 탐색 가능
  if (hasReference) return true;
  // ReferencedDocument도 탐색 가능
  if (isReferencedDocument) return true;
  if (isArray) return true;
  // SubDocument (_id를 가진 배열 아이템들)만 depth 증가
  return hasSubDocuments(value) ||
    (isDocument(value) && Object.keys(value).length > 0);
};

// MongoDB 타입 식별
export const getMongoType = (value: any): string | string[] => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean') return 'Boolean';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'Int32' : 'Double';
  }
  if (typeof value === 'string') {
    if (isObjectId(value)) return 'ObjectId';
    return 'String';
  }
  if (value instanceof Date) return 'Date';
  if (value instanceof ObjectId) { 
    console.log('---------------- ', value); 
    return 'ObjectId';
  }
  if (value instanceof Decimal128) return 'Decimal128';
  if (Array.isArray(value)) {
    // ObjectId 배열 확인 (isObjectId && isArray)
    if (isObjectIdArray(value)) return ['Array', 'ObjectId'];
    const docTypes = Array.from(new Set(value.map(item => isDocument(item)).filter(type => type !== false)));
    if (docTypes.length > 0) return ['Array', ...docTypes];
    else return 'Array';
  }
  const isdoc = isDocument(value);
  if (isdoc) return isdoc;
  return 'Mixed';
};

// 값 형식화 (MongoDB 스타일)
export const formatValue = (value: any): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (value instanceof ObjectId) return `ObjectId("${value.toString()}")`;
  if (value instanceof Decimal128) return `NumberDecimal("${value.toString()}")`;
  if (value instanceof Date) return `ISODate("${value.toISOString()}")`;
  if (isObjectId(value)) return `ObjectId("${value}")`;
  // ObjectId 배열 확인 (isObjectId && isArray)
  if (isObjectIdArray(value)) return `[${value.length} ObjectIds]`;
  if (hasSubDocuments(value)) return `[${value.length} SubDocuments]`;
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (isDocument(value)) return `{${Object.keys(value).length} fields}`;
  if (typeof value === 'string') {
    const truncated = value.length > 50 ? value.substring(0, 50) + '...' : value;
    return `"${truncated}"`;
  }
  return String(value);
};

// 경로로 값 가져오기
export const getValueByPath = (obj: any, path: string[]): any => {
  return path.reduce((current, key) => {
    if (current && typeof current === 'object') {
      // 배열 인덱스 처리
      if (Array.isArray(current) && /^\[\d+\]$/.test(key)) {
        const index = parseInt(key.replace(/[\[\]]/g, ''));
        return current[index];
      }
      return current[key];
    }
    return undefined;
  }, obj);
};

// Reference 해결 (향상된 버전)
export const resolveReference = (objectId: ObjectId | string, selectedDatabase: any, currentCollection?: string | null): {
  document: MongoDocument | null;
  collection: string | null;
  database: string | null;
} => {
  if (!selectedDatabase || !currentCollection) {
    return { document: null, collection: null, database: null };
  }

  const collectionKey = `${selectedDatabase.name}/${currentCollection}`;
  const referenceMap = crossDatabaseReferenceMap[collectionKey as keyof typeof crossDatabaseReferenceMap];

  if (referenceMap) {
    // 가능한 참조 컬렉션들을 확인
    const possibleCollections = Object.values(referenceMap);
    for (const targetCollection of possibleCollections) {
      const [dbName, collName] = targetCollection.split('/');
      const doc = findDocumentByReference(dbName, collName, objectId);
      if (doc) {
        return {
          document: doc,
          collection: collName,
          database: dbName
        };
      }
    }
  }

  return { document: null, collection: null, database: null };
};

// 참조 해결을 위한 ObjectId 배열 처리
export const resolveObjectIdArray = (objectIds: (ObjectId | string)[], selectedDatabase: any, currentCollection?: string | null): MongoDocument[] => {
  const resolvedDocs: MongoDocument[] = [];

  for (const objectId of objectIds) {
    const resolved = resolveReference(objectId, selectedDatabase, currentCollection);
    if (resolved.document) {
      resolvedDocs.push(resolved.document);
    }
  }

  return resolvedDocs;
};