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

// Document 확인 (객체 O, ObjectId X, value._id X) - 배열 반환으로 변경
export const isDocument = (value: any): string[] | false => {
  if (value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof ObjectId) &&
    !(value instanceof Decimal128) &&
    !isObjectId(value)) {

    const types: string[] = [];

    // _id 필드 존재 여부에 따라 타입 결정
    if (value._id) {
      types.push('Embedded'); // _id가 있으면 Embedded Document
    } else {
      types.push('Document'); // _id가 없으면 일반 Document
      // 내부 값들을 순회하여 ObjectId가 있는지 확인
    }
    const hasObjectIdInside = Object.entries(value).some(([key, val]: [string, any]) => {
      if (key !== '_id' && isObjectId(val)) {
        types.push('ObjectId');
        return true;
      }
      if (isObjectIdArray(val)) return true;
      if (Array.isArray(val)) {
        return val.some(item => isObjectId(item));
      }
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        // 중첩된 객체의 경우 재귀적으로 확인
        return Object.values(val).some(nestedVal => isObjectId(nestedVal));
      }
      return;
    });

    if (hasObjectIdInside && !types.includes('ObjectId')) {
      types.push('ObjectId');
    }

    return types;
  }

  return false;
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
export const canTraverse = (value: any, hasReference: boolean = false, isReferencedDocument: string | null = null, fieldType: string | string[] = ''): boolean => {
  // type 배열도 ObjectId도 아니면 칼같이 false
  if (!Array.isArray(fieldType) && fieldType !== 'ObjectId') return false
  // ObjectId 타입 포함 확인
  if (typeof fieldType === 'string' ? fieldType === 'ObjectId' : fieldType.includes('ObjectId'))
    // Reference 필드도 탐색 가능
    if (hasReference) return true;
  // ReferencedDocument도 탐색 가능
  if (isReferencedDocument) return true;
  return true;

  // SubDocument (_id를 가진 배열 아이템들)만 depth 증가
  // return hasSubDocuments(value) ||
  //   (isDocument(value) && Object.keys(value).length > 0);
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
    return 'ObjectId';
  }
  if (value instanceof Decimal128) return 'Decimal128';
  if (Array.isArray(value)) {
    // ObjectId 배열 확인 (isObjectId && isArray)
    if (isObjectIdArray(value)) return ['Array', 'ObjectId'];
    const docTypes = Array.from(new Set(
      value
        .map(item => isDocument(item))
        .filter((type): type is string[] => type !== false) // 🔥 타입 내로잉
        .flat() // string[][] → string[]
    ));
    if (docTypes.length > 0) return ['Array', ...(docTypes.includes('Embedded') ? ['Embedded'] : docTypes)];
    else return 'Array';
  }
  const docResult = isDocument(value);
  if (docResult) return docResult;
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
  const docResult = isDocument(value);
  if (docResult) {
    const hasObjectId = docResult.includes('ObjectId') ? ' with ObjectIds' : '';
    return `{${Object.keys(value).length} fields${hasObjectId}}`;
  }
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
export const resolveReference = (objectId: ObjectId | string, selectedDatabase: any): {
  document: MongoDocument | null;
  collection: string | null;
  database: string | null;
} => {
  if (!selectedDatabase) {
    return { document: null, collection: null, database: null };
  }

  // 선택된 데이터베이스의 모든 컬렉션에서 참조 검색
  const doc = findDocumentByReference(selectedDatabase.name, objectId);
  if (doc?.document) {
    console.log(`Resolved reference for ObjectId ${objectId} in collection ${doc.collection} of database ${selectedDatabase.name}`);
    return {
      document: doc.document,
      collection: doc.collection,
      database: doc.database
    };
  }

  return { document: null, collection: null, database: null };
};