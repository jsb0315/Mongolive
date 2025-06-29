import React, { useState, useEffect } from 'react';
import {
  mockDocuments,
  Collection,
  MongoDocument,
} from '../../data/mockData';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import { FieldPath } from '../../types/collectionTypes';
import FieldSection from './FieldSection';
import {
  isObjectId,
  canTraverse,
  getMongoType,
  getValueByPath,
  resolveReference,
} from '../../utils/mongoUtils';

const CollectionExplorer: React.FC = () => {
  const { selectedDatabase } = useDatabaseContext();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [documents, setDocuments] = useState<MongoDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<MongoDocument | null>(null);
  const [selectedFields, setSelectedFields] = useState<(string | null)[]>([]);
  const [fieldStack, setFieldStack] = useState<FieldPath[]>([]);
  const [currentDepth, setCurrentDepth] = useState<number>(0);

  // 선택된 데이터베이스가 변경될 때마다 컬렉션 목록 업데이트
  useEffect(() => {
    if (selectedDatabase) {
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

    console.log(`\n==================================== \nSelecting collection: ${collectionName} from database: ${selectedDatabase.name}`);
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
    console.log(`\n==================================== \nSelecting document: `, document);
    setSelectedDocument(document);
    setSelectedFields([]);
    setFieldStack([]);
    setCurrentDepth(0);
  };

  const handleFieldSelect = (selectedField: FieldPath, parentPath: string[] = [], depth: number) => {
    const { name: fieldName, value: fieldValue, path: fieldPath, type: fieldType, referencedDocuments: refDocs } = selectedField;

    console.log(`\n====================================\nField clicked: `, selectedField, `\nfieldPath:`, fieldPath.join('.'), '\ncanTraverse', canTraverse(fieldValue, fieldType), fieldName, selectedFields[depth]);

    /**
     * Ref Field임 
     */
    const isRefField = fieldType.length === 2 && fieldType.includes("ObjectId") && fieldType.includes("Referenced");

    if (!selectedDocument) return;

    // 깊이 추가 안되는 원시 타입일때
    if (!canTraverse(fieldValue, fieldType)) {
      if (depth < currentDepth) {
        handleBackNavigation(depth);
      } else if (fieldName === selectedFields[depth]) {
        setSelectedFields(prev => {
          const newFields = [...prev];
          newFields[depth] = null;
          return newFields;
        });
        return;
      }
    }

    setSelectedFields(prev => {
      const newFields = [...prev];
      newFields[depth] = fieldName;
      return newFields.slice(0, depth + 1);
    });

    if (canTraverse(fieldValue, fieldType)) {
      // depth에 해당하는 selectedField 설정
      const newField: FieldPath = {
        name: fieldName,
        value: fieldValue,
        path: fieldPath,
        type: getMongoType(fieldValue),
        referencedDocuments: isRefField ? refDocs : null,
        referencedCollection: selectedField.referencedCollection,
        referencedDatabase: selectedField.referencedDatabase,
        referencedId: selectedField.referencedId,
        // originalDocument
      };


      if (depth === currentDepth) {
        console.log(`Adding new field to stack at depth ${depth} \n`, newField)
        setFieldStack(prev => [...prev, newField]);
        setCurrentDepth(prev => prev + 1);
      } else {
        console.log(`Updating field stack at depth ${depth} from ${currentDepth} \n`, newField);
        handleBackNavigation(currentDepth + (depth - currentDepth + 1));
        setFieldStack(prev => [...prev.slice(0, -1), newField]);
      }
      console.log(`Field stack updated:`, fieldValue, fieldStack);
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
  const getFieldsAtDepth = (depth: number): FieldPath[] => {
    if (!selectedDocument) return [];

    if (depth === 0) {
      // 루트 레벨 필드들
      return Object.keys(selectedDocument)
        .filter(key => key !== '_id') // _id 제외
        .map(key => {
          const value = selectedDocument[key];
          const fieldType = getMongoType(value);
          let database = null;
          let document: any[] | null = null;
          let collection: any[] | null = null;

          if (isObjectId(value)) {
            console.log(`====>\n Depth 0 Resolving: ${key}`);
            const resolvedRef = resolveReference(value, selectedDatabase);
            database = resolvedRef.database || null;
            document = resolvedRef?.document ? [resolvedRef?.document] : [{}];
            collection = resolvedRef.collection ? [resolvedRef.collection] : [{}];
          }

          return {
            name: key,
            value: value,
            path: [key],
            type: fieldType,
            referencedDatabase: database,
            referencedCollection: collection,
            referencedDocuments: document,
            referencedId: isObjectId(value) ? value : null,
          } as FieldPath;
        });
    } else {
      // 중첩된 레벨의 필드들
      const parentField = fieldStack[depth - 1];  //  현재 선택한 필드
      const parentType = parentField?.type || ['ObjectId', 'Document', 'Array', 'String', 'Boolean', 'Int32', 'Double', 'Embedded'];
      // if (!parentField) return [];

      /**
       * 누르면 RefField로 진입하는거
      */
      const isRefField = parentType.length === 2 && parentType.includes("ObjectId") && parentType.includes("Referenced"); // Ref Field, 
      const isArrayField = parentType.includes('Array'); // Array Field 여부
      const refDocs = parentField.referencedDocuments;
      const targetValue = isRefField ? parentField.referencedDocuments![0] : parentField.value; // Ref Field면 refDocs, 아니면 fieldValue
      console.log('\n----------------------\ngetFieldsAtDepth called for depth:', depth, '\nparentField:', parentField, '\ntargetValue:', targetValue, '\nisRefField:', isRefField, '\ncanTraverse:', canTraverse(targetValue, parentType));

      if (!canTraverse(targetValue, parentType)) return []; // 현재 필드가 탐색 가능한지 확인

      return (isArrayField ? targetValue : Object.entries(targetValue).filter(([key]) => key !== '_id')).map((item: any, index: number) => {
        { // Array면 [a, b, c]=> a/b/c 반환
          // Array 아니면(=Doc) {a:1, b:2, c:3} => ['a', 1]/[Object.entries(targetValue).filter([key] !== '_id')'b', 2]/['c', 3] 반환)
          const key = isArrayField ? `[${index}]` : item[0];
          const value = isArrayField ? item : item[1];
          const fieldType = getMongoType(value);
          const isRefField = fieldType.length === 2 && fieldType.includes("ObjectId") && fieldType.includes("Referenced");
          let resolvedRef = null;
          if (isRefField) {
            resolvedRef = resolveReference(value, selectedDatabase);
            console.log(`====>\n Depth ${depth} Resolving: ${value}`, resolvedRef);
          }
          return {
            name: key,
            value: value,
            path: [...parentField.path, key],
            type: fieldType,
            referencedDatabase: isRefField ? resolvedRef?.database || null : parentField.referencedDatabase,
            referencedCollection: isRefField ? resolvedRef?.collection || null : parentField.referencedCollection,
            referencedDocuments: isRefField ? (resolvedRef?.document ? [resolvedRef.document] : [{}]) : null,
            referencedId: isRefField ? value : parentField.referencedId, // Ref Field면 ObjectId, 아니면 null
          } as FieldPath;
        }
      });
    }
  };

  // 현재 위치 네비게이션 생성 (Reference와 ReferencedDocument 정보 추가)
  const getBreadcrumb = () => {
    const items = [];
    // if (selectedDatabase) {
    //   items.push(selectedDatabase.name);
    // }
    if (selectedCollection) {
      items.push(selectedCollection);
    }
    if (selectedDocument) {
      items.push(`${selectedDocument._id.toString().substring(0, 8)}...`);
    }
    fieldStack.forEach(field => {
      if (field.type.includes('ObjectId') && field.type.length === 2 && field.referencedDatabase && field.referencedCollection) {
        // 참조된 필드 이름과 데이터베이스/컬렉션 정보 추가
        items.push(`${field.name} → (${field.referencedDatabase}/${field.referencedCollection})`);
      } else if (field.referencedId && field.referencedDatabase && field.referencedCollection) {
        // 참조된 필드 이름과 데이터베이스/컬렉션 정보 추가
        items.push(`${field.name} (${field.referencedDatabase}/${field.referencedCollection})`);
      } else {
        // 일반 필드 이름만 추가
        items.push(`${field.name}`);
      }
    });
    return items;
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-2 pt-3 pb-3 mb-4 overflow-hidden">
        <div className="relative">
          <div className="flex items-center space-x-3 text-sm overflow-x-auto scrollbar-hide p-1 pt-0"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none',
             }}
            ref={(el) => {
              if (el) {
                el.scrollLeft = el.scrollWidth - el.clientWidth;
              }
            }}>
            <div className="flex items-center space-x-3 min-w-fit">
              <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-slate-200">
                <svg className="w-4 h-4 text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                <span className="text-slate-700 font-medium whitespace-nowrap">{selectedDatabase ? selectedDatabase.name : 'Database'}</span>
              </div>

              {getBreadcrumb().map((item, index) => (
                <React.Fragment key={index}>
                  <div className="flex items-center space-x-3">
                    <svg className="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <button
                      onClick={() => {
                        if (index > 1) {
                          handleBackNavigation(index - 1);
                        } else {
                          setCurrentDepth(0);
                          handleBackNavigation(0);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all duration-200 border backdrop-blur-sm ${index === getBreadcrumb().length - 1
                          ? 'bg-gray-50 border-gray-200 text-gray-600 font-semibold shadow-sm'
                          : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white hover:text-slate-800 hover:border-slate-300 hover:shadow-sm'
                        }`}
                    >
                      {item}
                    </button>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* 스크롤 힌트 그라데이션 */}
          {/* <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-l from-transparent to-white pointer-events-none z-50"></div> */}
        </div>
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
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 overflow-hidden ${index === collections.length - 1 ? 'mb-0' : 'mb-2'
                      } ${selectedCollection === collection.name
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
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 overflow-hidden ${index === documents.length - 1 ? 'mb-0' : 'mb-2'
                        } ${selectedDocument?._id.toString() === doc._id.toString()
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

            const parentType = parentField?.type || [];
            const hasRefField = parentField?.type.includes('ObjectId') || false;
            const isRefField = parentType.length === 2 && parentType.includes("ObjectId") && parentType.includes("Referenced");
            const referencedId = parentField?.referencedId;  // Ref ObjectID O

            return (
              <div
                key={index}
                className={`${isLastSection ? 'w-[50%]' : 'w-[25%]'} overflow-x-hidden`}
              >
                <FieldSection
                  depth={index}
                  title={
                    index === 0
                      ? selectedDocument
                        ? 'Document Fields'
                        : 'Field Details'
                      : isRefField
                        ? 'Referenced Documents'
                        : `${fieldStack[index - 1]?.name || 'Field'} Properties`
                  }
                  icon={
                    <svg className="w-4 h-4 mr-2 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  }
                  fields={getFieldsAtDepth(index)}
                  selectedFieldAtDepth={selectedFields[index] || null}
                  currentDepth={currentDepth}
                  isActive={index <= currentDepth}
                  hasRefField={hasRefField}
                  isRefField={isRefField}
                  referencedId={referencedId}
                  referencedDatabase={parentField?.referencedDatabase || null}
                  referencedCollection={parentField?.referencedCollection || null}
                  parentFieldPath={parentField?.path || []}
                  onFieldSelect={handleFieldSelect}
                  onBackNavigation={handleBackNavigation}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CollectionExplorer;