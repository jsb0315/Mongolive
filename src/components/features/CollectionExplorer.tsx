import React, { useState, useEffect } from 'react';
import { ObjectId, Decimal128 } from 'bson';
import { 
  mockDocuments, 
  Collection, 
  MongoDocument,
  findDocumentByReference,
  crossDatabaseReferenceMap 
} from '../../data/mockData';
import { useDatabaseContext } from '../../contexts/DatabaseContext';

interface FieldPath {
  name: string;
  value: any;
  path: string[];
  type: string;
  isObjectId: boolean;
  isObjectIdArray: boolean;
  isEmbeddedDocument: boolean;
  isArray: boolean;
  hasSubDocuments: boolean;
  // Reference 관련 추가 필드
  hasReference?: boolean;
  referencedDocuments?: Array<MongoDocument> | null;
  referencedCollection?: string | null;
  referencedDatabase?: string | null;
  // ReferencedDocument 관련 추가 필드
  isReferencedDocument?: boolean;
  originalDocument?: MongoDocument;
}

const CollectionExplorer: React.FC = () => {
  const { selectedDatabase } = useDatabaseContext();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [documents, setDocuments] = useState<MongoDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<MongoDocument | null>(null);
  const [selectedFields, setSelectedFields] = useState<(string | null)[]>([]);
  const [fieldStack, setFieldStack] = useState<FieldPath[]>([]);
  const [currentDepth, setCurrentDepth] = useState<number>(0);

  // MongoDB ObjectId 형식 확인
  const isObjectId = (value: any): boolean => {
    if (value instanceof ObjectId) return true;
    return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
  };

  // ObjectId 배열 확인
  const isObjectIdArray = (value: any): boolean => {
    return Array.isArray(value) && 
           value.length > 0 && 
           value.every(item => isObjectId(item));
  };

  // Embedded Document 확인 (객체이면서 ObjectId가 아닌 경우)
  const isEmbeddedDocument = (value: any): boolean => {
    return value !== null && 
           typeof value === 'object' && 
           !Array.isArray(value) && 
           !(value instanceof Date) &&
           !(value instanceof ObjectId) &&
           !(value instanceof Decimal128) &&
           !isObjectId(value);
  };

  // SubDocument 확인 (_id 필드를 가진 임베디드 도큐먼트)
  const hasSubDocuments = (value: any): boolean => {
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
  const canTraverse = (value: any, hasReference: boolean = false, isReferencedDocument: boolean = false): boolean => {
    // Reference 필드도 탐색 가능
    if (hasReference) return true;
    // ReferencedDocument도 탐색 가능
    if (isReferencedDocument) return true;
    // SubDocument (_id를 가진 배열 아이템들)만 depth 증가
    return hasSubDocuments(value) || 
           (isEmbeddedDocument(value) && Object.keys(value).length > 0);
  };

  // MongoDB 타입 식별
  const getMongoType = (value: any): string => {
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
    if (value instanceof ObjectId) return 'ObjectId';
    if (value instanceof Decimal128) return 'Decimal128';
    if (Array.isArray(value)) {
      if (isObjectIdArray(value)) return 'Array<ObjectId>';
      if (hasSubDocuments(value)) return 'Array<SubDocument>';
      return 'Array';
    }
    if (isEmbeddedDocument(value)) return 'Document';
    return 'Mixed';
  };

  // 값 형식화 (MongoDB 스타일)
  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (value instanceof ObjectId) return `ObjectId("${value.toString()}")`;
    if (value instanceof Decimal128) return `NumberDecimal("${value.toString()}")`;
    if (value instanceof Date) return `ISODate("${value.toISOString()}")`;
    if (isObjectId(value)) return `ObjectId("${value}")`;
    if (isObjectIdArray(value)) return `[${value.length} ObjectIds]`;
    if (hasSubDocuments(value)) return `[${value.length} SubDocuments]`;
    if (Array.isArray(value)) return `Array(${value.length})`;
    if (isEmbeddedDocument(value)) return `{${Object.keys(value).length} fields}`;
    if (typeof value === 'string') {
      const truncated = value.length > 50 ? value.substring(0, 50) + '...' : value;
      return `"${truncated}"`;
    }
    return String(value);
  };

  // 경로로 값 가져오기
  const getValueByPath = (obj: any, path: string[]): any => {
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
  const resolveReference = (objectId: ObjectId | string, currentCollection?: string | null): {
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
  const resolveObjectIdArray = (objectIds: (ObjectId | string)[], currentCollection?: string | null): MongoDocument[] => {
    const resolvedDocs: MongoDocument[] = [];
    
    for (const objectId of objectIds) {
      const resolved = resolveReference(objectId, currentCollection);
      if (resolved.document) {
        resolvedDocs.push(resolved.document);
      }
    }
    
    return resolvedDocs;
  };

  // ReferencedDocument 상태인지 확인 (fieldStack에서 ReferencedDocument가 있는지 확인)
  const isInReferencedDocumentMode = (): boolean => {
    return fieldStack.some(field => field.isReferencedDocument || field.hasReference);
  };

  // 선택된 데이터베이스가 변경될 때마다 컬렉션 목록 업데이트
  useEffect(() => {
    if (selectedDatabase) {
      console.log(`Loading collections for database: ${selectedDatabase.name}`);
      setCollections(selectedDatabase.collections);
      // 데이터베이스가 변경되면 선택 상태 초기화
      setSelectedCollection(null);
      setDocuments([]);
      setSelectedDocument(null);
      setSelectedFields([]);
      setFieldStack([]);
      setCurrentDepth(0);
    } else {
      setCollections([]);
    }
  }, [selectedDatabase]);

  const handleCollectionSelect = (collectionName: string) => {
    if (!selectedDatabase) return;

    console.log(`Selecting collection: ${collectionName} from database: ${selectedDatabase.name}`);
    setSelectedCollection(collectionName);

    // 데이터베이스/컬렉션 형태로 키 생성
    const documentKey = `${selectedDatabase.name}/${collectionName}`;
    setDocuments(mockDocuments[documentKey] || []);
    setSelectedDocument(null);
    setSelectedFields([]);
    setFieldStack([]);
    setCurrentDepth(0);
  };

  const handleDocumentSelect = (document: MongoDocument) => {
    console.log(`Selecting document: ${document._id}`);
    setSelectedDocument(document);
    setSelectedFields([]);
    setFieldStack([]);
    setCurrentDepth(0);
  };

  const handleFieldSelect = (fieldName: string, parentPath: string[] = [], depth: number) => {
    const fullPath = [...parentPath, fieldName];

    // Referenced Document에서 필드를 선택하는 경우를 위한 특별 처리
    let fieldValue;
    const parentField = depth > 0 ? fieldStack[depth - 1] : null;
    
    if (parentField?.hasReference && parentField.referencedDocuments) {
      // Reference에서 특정 Referenced Document를 선택하는 경우
      if (/^\[\d+\]/.test(fieldName)) {
        const index = parseInt(fieldName.match(/^\[(\d+)\]/)?.[1] || '0');
        fieldValue = parentField.referencedDocuments[index];
      } else {
        // Reference의 단일 문서에서 필드를 선택하는 경우
        const refDoc = parentField.referencedDocuments[0];
        fieldValue = refDoc ? refDoc[fieldName] : undefined;
      }
    } else if (parentField?.isReferencedDocument && parentField.originalDocument) {
      // Referenced Document에서 필드를 선택하는 경우
      fieldValue = parentField.originalDocument[fieldName];
    } else {
      // 일반적인 경우
      fieldValue = selectedDocument ? getValueByPath(selectedDocument, fullPath) : undefined;
    }
    
    if (!selectedDocument) return;

    // Reference 확인
    const isRefField = isObjectId(fieldValue) || isObjectIdArray(fieldValue);
    // ReferencedDocument 확인 (Referenced Document 배열에서 개별 문서를 선택한 경우)
    const isRefDocField = (/^\[\d+\]/.test(fieldName) && parentField?.hasReference) || 
                         (fieldValue && typeof fieldValue === 'object' && '_id' in fieldValue && parentField?.hasReference);
    
    if (!canTraverse(fieldValue, isRefField, isRefDocField) && fieldName === selectedFields[depth]) {
      setSelectedFields(prev => {
        const newFields = [...prev];
        newFields[depth] = null;
        return newFields;
      });
      return;
    }

    console.log(`Selecting field: ${fullPath.join('.')}, fieldValue:`, fieldValue, 'hasReference:', isRefField, 'isReferencedDocument:', isRefDocField, 'canTraverse', canTraverse(fieldValue, isRefField, isRefDocField));
    
    // depth에 해당하는 selectedField 설정
    setSelectedFields(prev => {
      const newFields = [...prev];
      newFields[depth] = fieldName;
      return newFields.slice(0, depth + 1);
    });

    // Reference, ReferencedDocument 또는 SubDocument만 depth 증가
    if (canTraverse(fieldValue, isRefField, isRefDocField)) {
      let referencedDocuments = null;
      let referencedCollection = null;
      let referencedDatabase = null;
      let isReferencedDocument = false;
      let originalDocument = null;

      // ReferencedDocument 모드 유지 확인
      const shouldMaintainReferencedMode = isInReferencedDocumentMode();

      // ReferencedDocument 처리 (Reference 배열에서 개별 문서 선택)
      if (isRefDocField && parentField?.referencedDocuments) {
        if (/^\[\d+\]/.test(fieldName)) {
          const index = parseInt(fieldName.match(/^\[(\d+)\]/)?.[1] || '0');
          originalDocument = parentField.referencedDocuments[index];
        } else {
          // 단일 Referenced Document에서 다른 객체 필드를 선택한 경우
          originalDocument = fieldValue;
        }
        isReferencedDocument = true;
        referencedCollection = parentField.referencedCollection;
        referencedDatabase = parentField.referencedDatabase;
      }
      // Reference 해결
      else if (isRefField) {
        // Referenced Document 모드에서 Reference를 만난 경우, 기존 Referenced 정보 유지
        const currentCollection = shouldMaintainReferencedMode && parentField?.referencedCollection 
          ? parentField.referencedCollection 
          : selectedCollection;

        if (isObjectId(fieldValue)) {
          const resolved = resolveReference(fieldValue, currentCollection);
          referencedDocuments = resolved.document ? [resolved.document] : null;
          referencedCollection = resolved.collection;
          referencedDatabase = resolved.database;
        } else if (isObjectIdArray(fieldValue)) {
          const resolvedDocs = resolveObjectIdArray(fieldValue, currentCollection);
          if (resolvedDocs.length > 0) {
            referencedDocuments = resolvedDocs;
            const resolved = resolveReference(fieldValue[0], currentCollection);
            referencedCollection = resolved.collection;
            referencedDatabase = resolved.database;
          } else {
            referencedDocuments = [];
          }
        }
      }
      // 일반 SubDocument나 EmbeddedDocument인데 ReferencedDocument 모드인 경우
      else if (shouldMaintainReferencedMode && (hasSubDocuments(fieldValue) || isEmbeddedDocument(fieldValue))) {
        isReferencedDocument = true;
        originalDocument = fieldValue;
        // 상위 ReferencedDocument의 정보 상속
        const referencedParent = fieldStack.find(f => f.isReferencedDocument || f.hasReference);
        if (referencedParent) {
          referencedCollection = referencedParent.referencedCollection;
          referencedDatabase = referencedParent.referencedDatabase;
        }
      }

      const newField: FieldPath = {
        name: fieldName,
        value: fieldValue,
        path: fullPath,
        type: isRefDocField ? 'ReferencedDocument' : getMongoType(fieldValue),
        isObjectId: isObjectId(fieldValue),
        isObjectIdArray: isObjectIdArray(fieldValue),
        isEmbeddedDocument: isEmbeddedDocument(fieldValue),
        isArray: Array.isArray(fieldValue),
        hasSubDocuments: hasSubDocuments(fieldValue),
        hasReference: isRefField,
        referencedDocuments,
        referencedCollection,
        referencedDatabase,
        isReferencedDocument,
        originalDocument
      };

      if (depth === currentDepth) {
        setFieldStack(prev => [...prev, newField]);
        setCurrentDepth(prev => prev + 1);
      } else {
        console.log(`Updating field stack at depth ${depth} from ${currentDepth} \n`, newField);
        handleBackNavigation(currentDepth + (depth - currentDepth + 1));
        setFieldStack(prev => [...prev.slice(0, -1), newField]);
      }
    }
  };

  const handleBackNavigation = (targetDepth: number) => {
    setFieldStack(prev => prev.slice(0, targetDepth));
    setCurrentDepth(targetDepth);
    setSelectedFields(prev => prev.slice(0, targetDepth));
    
    if (targetDepth === 0) {
      setSelectedFields([]);
    }
  };

  // depth에 따른 필드 목록 가져오기 (Reference와 ReferencedDocument 지원 추가)
  const getFieldsAtDepth = (depth: number): Array<any> => {
    if (!selectedDocument) return [];

    if (depth === 0) {
      // 루트 레벨 필드들
      return Object.keys(selectedDocument)
        .filter(key => key !== '_id') // _id 제외
        .map(key => ({
          name: key,
          value: selectedDocument[key],
          path: [key],
          type: getMongoType(selectedDocument[key]),
          isObjectId: isObjectId(selectedDocument[key]),
          isObjectIdArray: isObjectIdArray(selectedDocument[key]),
          isEmbeddedDocument: isEmbeddedDocument(selectedDocument[key]),
          isArray: Array.isArray(selectedDocument[key]),
          hasSubDocuments: hasSubDocuments(selectedDocument[key]),
          hasReference: isObjectId(selectedDocument[key]) || isObjectIdArray(selectedDocument[key])
        }));
    } else {
      // 중첩된 레벨의 필드들
      const parentField = fieldStack[depth - 1];
      if (!parentField) return [];

      // ReferencedDocument 필드인 경우 (개별 Referenced Document의 필드들)
      if (parentField.isReferencedDocument && parentField.originalDocument) {
        const refDoc = parentField.originalDocument;
        return Object.keys(refDoc)
          .filter(key => key !== '_id')
          .map(key => ({
            name: key,
            value: refDoc[key],
            path: [...parentField.path, key],
            type: getMongoType(refDoc[key]),
            isObjectId: isObjectId(refDoc[key]),
            isObjectIdArray: isObjectIdArray(refDoc[key]),
            isEmbeddedDocument: isEmbeddedDocument(refDoc[key]),
            isArray: Array.isArray(refDoc[key]),
            hasSubDocuments: hasSubDocuments(refDoc[key]),
            hasReference: isObjectId(refDoc[key]) || isObjectIdArray(refDoc[key]),
            // ReferencedDocument 모드에서는 모든 하위 요소들도 ReferencedDocument로 마킹
            isReferencedDocument: isEmbeddedDocument(refDoc[key]) || hasSubDocuments(refDoc[key])
          }));
      }

      // Reference 필드인 경우 (Referenced Documents 목록)
      if (parentField.hasReference && parentField.referencedDocuments) {
        const refDocs = parentField.referencedDocuments;
        
        return refDocs.map((doc: MongoDocument, index: number) => ({
          name: `[${index}] ${doc._id.toString().substring(0, 8)}...`,
          value: doc,
          path: [...parentField.path, `[${index}]`],
          type: 'ReferencedDocument',
          isObjectId: false,
          isObjectIdArray: false,
          isEmbeddedDocument: true,
          isArray: false,
          hasSubDocuments: false,
          hasReference: false,
          isReferencedDocument: true,
          originalDocument: doc
        }));
      }

      const parentValue = parentField.value;
      
      if (hasSubDocuments(parentValue)) {
        // SubDocument 배열인 경우
        return parentValue.map((item: any, index: number) => ({
          name: `[${index}]`,
          value: item,
          path: [...parentField.path, `[${index}]`],
          type: getMongoType(item),
          isObjectId: isObjectId(item),
          isObjectIdArray: isObjectIdArray(item),
          isEmbeddedDocument: isEmbeddedDocument(item),
          isArray: Array.isArray(item),
          hasSubDocuments: hasSubDocuments(item),
          hasReference: false,
          // ReferencedDocument 모드인 경우 하위 요소들도 ReferencedDocument로 마킹
          isReferencedDocument: isInReferencedDocumentMode()
        }));
      } else if (isEmbeddedDocument(parentValue)) {
        // 임베디드 도큐먼트인 경우
        return Object.keys(parentValue).map(key => ({
          name: key,
          value: parentValue[key],
          path: [...parentField.path, key],
          type: getMongoType(parentValue[key]),
          isObjectId: isObjectId(parentValue[key]),
          isObjectIdArray: isObjectIdArray(parentValue[key]),
          isEmbeddedDocument: isEmbeddedDocument(parentValue[key]),
          isArray: Array.isArray(parentValue[key]),
          hasSubDocuments: hasSubDocuments(parentValue[key]),
          hasReference: isObjectId(parentValue[key]) || isObjectIdArray(parentValue[key]),
          // ReferencedDocument 모드인 경우 하위 요소들도 ReferencedDocument로 마킹
          isReferencedDocument: isInReferencedDocumentMode() && (isEmbeddedDocument(parentValue[key]) || hasSubDocuments(parentValue[key]))
        }));
      }

      return [];
    }
  };

  // 현재 위치 네비게이션 생성 (Reference와 ReferencedDocument 정보 추가)
  const getBreadcrumb = () => {
    const items = [];
    if (selectedDatabase) {
      items.push(selectedDatabase.name);
    }
    if (selectedCollection) {
      items.push(selectedCollection);
    }
    if (selectedDocument) {
      items.push(`${selectedDocument._id.toString().substring(0, 8)}...`);
    }
    fieldStack.forEach(field => {
      if (field.hasReference && field.referencedDatabase && field.referencedCollection) {
        items.push(`${field.name} → ${field.referencedDatabase}/${field.referencedCollection}`);
      } else if (field.isReferencedDocument && field.referencedDatabase && field.referencedCollection) {
        items.push(`${field.name} (${field.referencedDatabase}/${field.referencedCollection})`);
      } else {
        items.push(`${field.name}`);
      }
    });
    return items;
  };

  // 필드 값 렌더링 (ReferencedDocument 정보 추가)
  const renderFieldValue = (field: any) => {
    const { value, type, isObjectId, isObjectIdArray, hasSubDocuments, hasReference, isReferencedDocument, referencedDocuments, originalDocument, referencedCollection, referencedDatabase } = field;

    return (
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
            type === 'ObjectId' ? 'bg-blue-100 text-blue-700' :
            type === 'Document' ? 'bg-purple-100 text-purple-700' :
            type === 'ReferencedDocument' ? 'bg-cyan-100 text-cyan-700' :
            type === 'Array<ObjectId>' ? 'bg-cyan-100 text-cyan-700' :
            type === 'Array<SubDocument>' ? 'bg-indigo-100 text-indigo-700' :
            type === 'Array' ? 'bg-green-100 text-green-700' :
            type === 'String' ? 'bg-gray-100 text-gray-700' :
            type === 'Int32' || type === 'Double' || type === 'Decimal128' ? 'bg-yellow-100 text-yellow-700' :
            type === 'Boolean' ? 'bg-orange-100 text-orange-700' :
            type === 'Date' ? 'bg-pink-100 text-pink-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {type}
          </span>

          {/* Reference 표시 */}
          {hasReference && (
            <span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-600 border border-blue-200">
              REF
            </span>
          )}

          {/* ReferencedDocument 표시 */}
          {isReferencedDocument && (
            <span className="px-2 py-1 text-xs rounded-full bg-cyan-50 text-cyan-600 border border-cyan-200">
              DOC
            </span>
          )}

          {/* SubDocument 표시 */}
          {hasSubDocuments && (
            <span className="px-2 py-1 text-xs rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
              SUB
            </span>
          )}
        </div>
        
        <div className="text-sm text-gray-600 font-mono truncate">
          {formatValue(value)}
        </div>

        {/* Reference 정보 */}
        {hasReference && referencedDocuments && (
          <div className="text-xs mt-2">
            <div className="bg-blue-50 p-2 rounded border">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-blue-700">Referenced Documents</span>
                {referencedDatabase && referencedCollection && (
                  <span className="text-blue-600 text-xs bg-white px-2 py-1 rounded">
                    {referencedDatabase}/{referencedCollection}
                  </span>
                )}
              </div>
              <div className="text-blue-600">
                {referencedDocuments.length} document{referencedDocuments.length !== 1 ? 's' : ''} found
              </div>
            </div>
          </div>
        )}

        {/* ReferencedDocument 정보 */}
        {isReferencedDocument && originalDocument && (
          <div className="text-xs mt-2">
            <div className="bg-cyan-50 p-2 rounded border">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-cyan-700">Document Fields</span>
                {referencedDatabase && referencedCollection && (
                  <span className="text-cyan-600 text-xs bg-white px-2 py-1 rounded">
                    {referencedDatabase}/{referencedCollection}
                  </span>
                )}
              </div>
              <div className="text-cyan-600">
                {Object.keys(originalDocument).filter(k => k !== '_id').length} field{Object.keys(originalDocument).filter(k => k !== '_id').length !== 1 ? 's' : ''} available
              </div>
            </div>
          </div>
        )}

        {/* Reference 해결 실패 */}
        {hasReference && !referencedDocuments && (
          <div className="text-xs text-gray-500 mt-1">
            Reference not resolved
          </div>
        )}
      </div>
    );
  };

  const renderFieldSection = (depth: number, title: string, icon: React.ReactNode, colSpan: number = 1) => {
    const fields = getFieldsAtDepth(depth);
    const isActive = depth <= currentDepth;
    const selectedFieldAtDepth = selectedFields[depth] || null;

    // Reference 또는 ReferencedDocument 섹션인지 확인
    const parentField = depth > 0 ? fieldStack[depth - 1] : null;
    const hasReferenceSection = parentField?.hasReference;
    const isReferencedDocumentSection = parentField?.isReferencedDocument || isInReferencedDocumentMode();

    return (
      <div
        className={`${colSpan === 2 ? 'col-span-2' : ''} bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full transition-all duration-300 ${
          isActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
        } ${hasReferenceSection ? 'border-blue-300 shadow-blue-100' : ''} ${isReferencedDocumentSection ? 'border-cyan-300 shadow-cyan-100' : ''}`}
        style={{
          transform: isActive ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        <div className={`p-3 border-b border-gray-200 overflow-hidden ${
          hasReferenceSection ? 'bg-blue-50' : 
          isReferencedDocumentSection ? 'bg-cyan-50' : 
          'bg-gray-50'
        }`}>
          <div className="flex items-center justify-between min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center truncate flex-1 min-w-0">
              {hasReferenceSection ? (
                <svg className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              ) : isReferencedDocumentSection ? (
                <svg className="w-4 h-4 mr-2 text-cyan-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ) : icon}
              <span className="truncate">{title}</span>
              {(hasReferenceSection || isReferencedDocumentSection) && parentField?.referencedDatabase && parentField?.referencedCollection && (
                <span className={`ml-2 px-2 py-1 text-xs rounded ${
                  hasReferenceSection ? 'bg-blue-100 text-blue-700' : 'bg-cyan-100 text-cyan-700'
                }`}>
                  {parentField.referencedDatabase}/{parentField.referencedCollection}
                </span>
              )}
            </h3>
            {depth > 0 && (
              <button
                onClick={() => handleBackNavigation(depth - 1)}
                className="p-1 hover:bg-gray-200 rounded transition-colors duration-200 flex-shrink-0 ml-2"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 flex-col overflow-y-auto p-2 max-h-full overflow-x-hidden">
          {fields.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              <div className="truncate">
                {depth === 0 ? 'Select a document to view fields' : 
                 hasReferenceSection ? 'Reference not resolved' : 
                 isReferencedDocumentSection ? 'Document has no fields' :
                 'No nested fields'}
              </div>
            </div>
          ) : (
            fields.map((field, index) => (
              <div
                key={field.name}
                onClick={() => {console.log('Field clicked:', field);handleFieldSelect(field.name, depth === 0 ? [] : fieldStack[depth - 1]?.path || [], depth)}}
                className={`p-3 rounded-lg cursor-pointer transition-all duration-200 overflow-hidden ${
                  index === fields.length - 1 ? 'mb-0' : 'mb-2'
                } ${
                  selectedFieldAtDepth === field.name
                    ? 'bg-purple-50 border border-purple-200 shadow-sm'
                    : 'hover:bg-gray-50 border border-transparent'
                } ${field.hasReference ? 'ring-1 ring-blue-200' : ''} ${field.isReferencedDocument ? 'ring-1 ring-cyan-200' : ''}`}
              >
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="flex-1 min-w-0 overflow-hidden">
                    {/* 키 이름 */}
                    <div className="flex items-center gap-2 mb-2 min-w-0">
                      <span className="font-medium text-gray-900 text-sm truncate flex-1 min-w-0">
                        {field.name}
                      </span>
                      
                      {/* MongoDB 특화 아이콘들 */}
                      {field.hasReference && (
                        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      )}

                      {field.isReferencedDocument && (
                        <svg className="w-4 h-4 text-cyan-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      
                      {field.hasSubDocuments && (
                        <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      )}
                      
                      {canTraverse(field.value, field.hasReference, field.isReferencedDocument) && (
                        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                    
                    {/* 필드 값 */}
                    <div className="overflow-hidden">
                      {renderFieldValue(field)}
                    </div>
                  </div>
                </div>

                {/* 선택된 필드의 상세 정보 */}
                {selectedFieldAtDepth === field.name && depth === currentDepth && (
                  <div className="mt-3 pt-3 border-t border-purple-200 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}>
                    <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto max-h-32 whitespace-pre-wrap break-all">
                      {JSON.stringify(field.value, null, 2)}
                    </pre>
                    <div className="mt-2 flex space-x-2 flex-wrap">
                      {field.hasReference && (
                        <button className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors duration-200">
                          Query Reference
                        </button>
                      )}
                      {field.isReferencedDocument && (
                        <button className="px-3 py-1 bg-cyan-500 text-white text-xs rounded hover:bg-cyan-600 transition-colors duration-200">
                          Explore Document
                        </button>
                      )}
                      {canTraverse(field.value, field.hasReference, field.isReferencedDocument) && (
                        <button className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 transition-colors duration-200">
                          Explore Structure
                        </button>
                      )}
                      <button className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors duration-200">
                        Edit Value
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  if (!selectedDatabase) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
          <p className="text-lg font-medium">No Database Selected</p>
          <p className="text-sm">Please select a database from the header to continue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="CollectionExplorer h-full flex flex-col">
      {/* 상단 네비게이션 */}
      <div className="Collection_Panel_Navigation bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 overflow-x-auto overflow-y-hidden">
        <nav className="flex items-center space-x-2 text-sm">
          <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
          {getBreadcrumb().map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
              <button
                onClick={() => {
                  if (index >= 3) {
                    handleBackNavigation(index - 2);
                  } else handleBackNavigation(0);
                }}
                className={`truncate min-w-0 ${
                  index === getBreadcrumb().length - 1 ? 'text-green-600 font-medium' : 'text-gray-600 hover:text-gray-900 cursor-pointer'
                } transition-colors duration-200`}
              >
                {item}
              </button>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* 메인 컨텐츠 영역 - 동적 레이아웃 */}
      <div className="Collection_Panel overflow-hidden min-h-0 h-full w-full relative">
        <div
          className="flex transition-all duration-200 ease-in-out h-full gap-4 absolute right-0"
          style={{
            width: `calc(100% + ${currentDepth * 25}% + ${currentDepth * 0.5}rem)`,
          }}
        >
          {/* 첫 번째 섹션: 컬렉션 목록 */}
          <div className="w-[25%] overflow-x-hidden">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
              <div className="p-3 border-b border-gray-200 bg-gray-50 overflow-hidden">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center min-w-0">
                  <svg className="w-4 h-4 mr-2 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="truncate">Collections ({collections.length})</span>
                </h3>
              </div>
              <div className="flex-1 flex-col overflow-y-auto p-2 max-h-full overflow-x-hidden">
                {collections.map((collection, index) => (
                  <div
                    key={collection.name}
                    onClick={() => handleCollectionSelect(collection.name)}
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 overflow-hidden ${
                      index === collections.length - 1 ? 'mb-0' : 'mb-2'
                    } ${
                      selectedCollection === collection.name
                        ? 'bg-green-50 border border-green-200 shadow-sm'
                        : 'hover:bg-gray-50 border border-transparent'
                    } flex-1 min-w-0`}
                  >
                    <div className="flex items-center justify-between relative min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm truncate">{collection.name}</h4>
                      {selectedCollection === collection.name && (
                        <svg className="w-4 h-4 text-green-600 absolute right-0 bg-green-50 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 overflow-hidden">
                      <div className="truncate">{collection.documentCount.toLocaleString()} docs</div>
                      <div className="truncate">{collection.size}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 두 번째 섹션: 문서 목록 */}
          <div className="w-[25%] overflow-x-hidden">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
              <div className="p-3 border-b border-gray-200 bg-gray-50 overflow-hidden">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center min-w-0">
                  <svg className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="truncate">Documents {selectedCollection && `(${documents.length})`}</span>
                </h3>
              </div>
              <div className="flex-1 flex-col overflow-y-auto p-2 max-h-full overflow-x-hidden">
                {!selectedCollection ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    <div className="truncate">Select a collection to view documents</div>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    <div className="truncate">No documents found</div>
                  </div>
                ) : (
                  documents.map((doc, index) => (
                    <div
                      key={doc._id.toString()}
                      onClick={() => handleDocumentSelect(doc)}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 overflow-hidden ${
                        index === documents.length - 1 ? 'mb-0' : 'mb-2'
                      } ${
                        selectedDocument?._id.toString() === doc._id.toString()
                          ? 'bg-blue-50 border border-blue-200 shadow-sm'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between relative min-w-0">
                        <div className="font-mono text-xs text-gray-600 truncate">
                          {doc._id.toString()}
                        </div>
                        {selectedDocument?._id.toString() === doc._id.toString() && (
                          <svg className="w-4 h-4 text-blue-600 flex-shrink-0 absolute right-0 bg-blue-50" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 truncate">
                        {Object.keys(doc).filter(key => key !== '_id').length} fields
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 동적 필드 섹션들 */}
          {Array.from({ length: Math.max(1, currentDepth + 1) }, (_, index) => {
            const totalSections = Math.max(1, currentDepth + 1);
            const isLastSection = index === totalSections - 1;
            const parentField = index > 0 ? fieldStack[index - 1] : null;

            return (
              <div
                key={index}
                className={`${isLastSection ? 'w-[50%]' : 'w-[25%]'} overflow-x-hidden`}
              >
                {renderFieldSection(
                  index,
                  index === 0
                    ? (selectedDocument ? 'Document Fields' : 'Field Details')
                    : parentField?.hasReference 
                      ? `Referenced Documents`
                      : parentField?.isReferencedDocument
                        ? `Document Fields`
                        : `${fieldStack[index - 1]?.name || 'Field'} Properties`,
                  <svg className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CollectionExplorer;