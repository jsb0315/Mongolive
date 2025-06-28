import { ObjectId, Decimal128 } from 'bson';
import { MongoDocument, findDocumentByReference, crossDatabaseReferenceMap } from '../data/mockData';

// MongoDB ObjectId 형식 확인
export const isObjectId = (value: any): boolean => {
  if (value instanceof ObjectId) return true;
  return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
};


// 탐색 가능한 구조 확인 (depth 증가 조건) - Reference와 ReferencedDocument 추가
export const canTraverse = (value: any, fieldType: string[]): boolean => {
  // ObjectId 타입 포함 확인
  if (fieldType.includes('ObjectId') || fieldType.includes('Array') || fieldType.includes('Document'))
    return true;
  else return false;

  // SubDocument (_id를 가진 배열 아이템들)만 depth 증가
  // return hasSubDocuments(value) ||
  //   (isDocument(value) && Object.keys(value).length > 0);
};

export function getObjectIdValues(obj: any): any[] {
  const objectIds: any[] = [];
  
  function traverse(value: any) {
    if (value === null || value === undefined) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(item => {
        if (isObjectId(item)) return objectIds.push(item);
        else traverse(item);
      });
    } else if (typeof value === 'object') {
      Object.keys(value).forEach(key => {
        if (key !== "_id" && isObjectId(value[key])) {
          objectIds.push(value[key]);
        } else {
          traverse(value[key]);
        }
      });
    }
  }
  
  traverse(obj);
  return objectIds;
}

// MongoDB 타입 식별
export const getMongoType = (value: any): string[] => {
  const types = new Set<string>();

  function classifyObject(obj: any): Set<string> {
    const keys = Object.keys(obj);

    const hasId = "_id" in obj;
    const idIsObjectId = isObjectId(obj["_id"]);

    const hasOtherObjectId = keys.some(
      (key) => key !== "_id" && isObjectId(obj[key])
    );

    if (hasId && idIsObjectId) return new Set(["Embedded", "Document"]); // _id O, ObjectId O
    if (!hasId && hasOtherObjectId) return new Set(["Referenced", "Document"]);  // _id X, ObjectId O
    if (!hasId && !hasOtherObjectId) return new Set(["Document"]); // _id X, ObjectId X
    return new Set(["ObjectId"]);
  }

  function traverse(value: any, key: string = '') {
    if (isObjectId(value) && key !== "_id") {
      types.add("Referenced");
      types.add("ObjectId");
      return
    }
    if (Array.isArray(value)) {
      types.add("Array");
      value.forEach((item, index) => traverse(item, `${key}[${index}]`));
    } else if (value !== null && typeof value === "object") {
      if (value instanceof Date) return types.add('Date');
      if (value instanceof Decimal128) return types.add('Decimal128');
      const objType = classifyObject(value);
      objType.forEach(type => types.add(type));
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          traverse(value[key], key);
        }
      }
    } else {
      if (types.has('Referenced') || types.has('Document') || types.has('Array') || types.has('Embedded')) return;  // ObjectId가 이미 발견되면 다른 타입은 무시
      if (typeof value === 'string') types.add('String');
      if (value === null) types.add('null');
      if (value === undefined) types.add('undefined');
      if (typeof value === 'boolean') types.add('Boolean');
      if (typeof value === 'number') Number.isInteger(value) ? types.add('Int32') : types.add('Double');
    }
  }

  traverse(value);

  // 우선순위 필터링 출력 레벨에서 사용해야됨
  const finalTypes = new Set<string>(types);
  if (Array.from(types)[0] !== 'Array') // Array가 첫 번째 타입이 아니면 Array 제거
    finalTypes.delete("Array");
  // if (types.has("ObjectId") && types.has("Embedded")) {
  //   finalTypes.delete("Referenced");
  // }
  // if (types.has("Referenced")) {
  //   finalTypes.delete("Embedded");
  //   finalTypes.delete("Document");
  // } 
  // if (types.size === 2 && types.has("Referenced") && types.has("ObjectId")) {
  //   finalTypes.delete("ObjectId");
  // } 
  if (types.size > 1) {
    finalTypes.delete("Date");
    finalTypes.delete("Decimal128");
  }
  // if (types.has("Embedded")) {
  //   finalTypes.delete("Document");
  // }

  return Array.from(finalTypes);
}


// 값 형식화 (MongoDB 스타일)
export const formatValue = (value: any, type: string[]): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  
  // type 배열에 따른 우선순위 매핑
  if (type.includes('ObjectId')) {
    if (value instanceof ObjectId) return `ObjectId("${value.toString()}")`;
    if (isObjectId(value)) return `ObjectId("${value}")`;
    if (type.includes('Array')) return `[${value.length} ObjectIds]`;
  }
  
  if (type.includes('Decimal128')) {
    return `NumberDecimal("${value.toString()}")`;
  }
  
  if (type.includes('Date')) {
    return `ISODate("${value.toISOString()}")`;
  }
  
  if (type.includes('Embedded')) {
    if (Array.isArray(value)) return `[${value.length} SubDocuments]`;
    return `{${Object.keys(value).length - 1} fields}`; // _id 제외
  }
  
  if (type.includes('Referenced')) {
    return `{${Object.keys(value).length} fields with ObjectIds}`;
  }
  
  if (type.includes('Document')) {
    return `{${Object.keys(value).length} fields}`;
  }
  
  if (type.includes('Array')) {
    return `Array(${value.length})`;
  }
  
  if (type.includes('String')) {
    const truncated = value.length > 50 ? value.substring(0, 50) + '...' : value;
    return `"${truncated}"`;
  }
  
  if (type.includes('Boolean')) {
    return String(value);
  }
  
  if (type.includes('Int32') || type.includes('Double')) {
    return String(value);
  }
  
  return String(value);
};

// 경로로 값 가져오기
export const getValueByPath = (obj: any, path: string[]): any => {
  console.log(`Getting value by path: ${path.join('.')}`);
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
export const resolveReference = (objectId: any | string, selectedDatabase: any): {
  document: MongoDocument | null;
  collection: string | null;
  database: string | null;
} => {
  if (!isObjectId(objectId)) return { document: null, collection: null, database: null };
  if (!selectedDatabase) return { document: null, collection: null, database: null };

  // 선택된 데이터베이스의 모든 컬렉션에서 참조 검색
  const doc = findDocumentByReference(selectedDatabase.name, objectId);
  if (doc?.document) {
    console.log(`Resolved reference \nObjectId: ${objectId} \nLoc: ${selectedDatabase.name}/${doc.collection}`);
    return {
      document: doc.document,
      collection: doc.collection,
      database: doc.database
    };
  }

  return { document: null, collection: null, database: null };
};