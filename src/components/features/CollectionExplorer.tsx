import React, { useState, useEffect } from 'react';
import { mockDocuments, Collection, Document } from '../../data/mockData';
import { useDatabaseContext } from '../../contexts/DatabaseContext';

interface FieldPath {
  name: string;
  value: any;
  path: string[];
  type: string;
  isReference: boolean;
  isReferenceArray: boolean;
  isSubCollection: boolean;
}

const CollectionExplorer: React.FC = () => {
  const { selectedDatabase } = useDatabaseContext();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [fieldStack, setFieldStack] = useState<FieldPath[]>([]);
  const [currentDepth, setCurrentDepth] = useState<number>(0);

  // 선택된 데이터베이스가 변경될 때마다 컬렉션 목록 업데이트
  useEffect(() => {
    if (selectedDatabase) {
      console.log(`Loading collections for database: ${selectedDatabase.name}`);
      setCollections(selectedDatabase.collections);
      // 데이터베이스가 변경되면 선택 상태 초기화
      setSelectedCollection(null);
      setDocuments([]);
      setSelectedDocument(null);
      setSelectedField(null);
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
    setSelectedField(null);
    setFieldStack([]);
    setCurrentDepth(0);
  };

  const handleDocumentSelect = (document: Document) => {
    console.log(`Selecting document: ${document._id}`);
    setSelectedDocument(document);
    setSelectedField(null);
    setFieldStack([]);
    setCurrentDepth(0);
  };

  const handleFieldSelect = (fieldName: string, parentPath: string[] = []) => {
    if (!selectedDocument) return;

    const fullPath = [...parentPath, fieldName];
    const fieldValue = getValueByPath(selectedDocument, fullPath);

    console.log(`Selecting field: ${fullPath.join('.')}`);
    setSelectedField(fieldName);

    // Object나 Reference인 경우에만 스택에 추가하고 깊이 증가
    if (isObjectOrReference(fieldValue)) {
      const newField: FieldPath = {
        name: fieldName,
        value: fieldValue,
        path: fullPath,
        type: Array.isArray(fieldValue) ? 'Array' : typeof fieldValue,
        isReference: typeof fieldValue === 'string' && fieldValue.match(/^[0-9a-fA-F]{24}$/) !== null,
        isReferenceArray: Array.isArray(fieldValue) && fieldValue.length > 0 && typeof fieldValue[0] === 'string' && fieldValue[0].match(/^[0-9a-fA-F]{24}$/) !== null,
        isSubCollection: Array.isArray(fieldValue) && fieldValue.length > 0 && typeof fieldValue[0] === 'object'
      };

      setFieldStack(prev => [...prev, newField]);
      setCurrentDepth(prev => prev + 1);
    }
  };

  const handleBackNavigation = (targetDepth: number) => {
    setFieldStack(prev => prev.slice(0, targetDepth));
    setCurrentDepth(targetDepth);
    if (targetDepth === 0) {
      setSelectedField(null);
    }
  };

  const getValueByPath = (obj: any, path: string[]): any => {
    return path.reduce((current, key) => current?.[key], obj);
  };

  const isObjectOrReference = (value: any): boolean => {
    if (typeof value === 'string' && value.match(/^[0-9a-fA-F]{24}$/)) return true; // Reference
    if (Array.isArray(value) && value.length > 0) {
      if (typeof value[0] === 'string' && value[0].match(/^[0-9a-fA-F]{24}$/)) return true; // Reference Array
      if (typeof value[0] === 'object') return true; // SubCollection
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) return true; // Object
    return false;
  };

  // 현재 위치 네비게이션 생성
  const getBreadcrumb = () => {
    const items = [];
    if (selectedDatabase) {
      items.push(selectedDatabase.name);
    }
    if (selectedCollection) {
      items.push(selectedCollection);
    }
    if (selectedDocument) {
      items.push(`Document: ${selectedDocument._id.substring(0, 8)}...`);
    }
    fieldStack.forEach(field => {
      items.push(`Field: ${field.name}`);
    });
    return items;
  };

  // 현재 문서 또는 필드의 필드 정보 추출
  const getFieldsAtDepth = (depth: number) => {
    if (depth === 0) {
      // Root 레벨 - 문서의 필드들
      return getDocumentFields();
    } else {
      // 중첩된 레벨 - 스택의 해당 깊이 필드의 하위 필드들
      const targetField = fieldStack[depth - 1];
      if (!targetField) return [];

      return getNestedFields(targetField.value);
    }
  };

  const getNestedFields = (value: any) => {
    if (!value || typeof value !== 'object') return [];

    if (Array.isArray(value)) {
      // 배열인 경우 첫 번째 요소의 구조 분석
      if (value.length > 0 && typeof value[0] === 'object') {
        return Object.entries(value[0])
          .map(([key, val]) => ({
            name: `[0].${key}`,
            type: Array.isArray(val) ? 'Array' : typeof val,
            value: val,
            isReference: typeof val === 'string' && val.match(/^[0-9a-fA-F]{24}$/) !== null,
            isReferenceArray: Array.isArray(val) && val.length > 0 && typeof val[0] === 'string' && val[0].match(/^[0-9a-fA-F]{24}$/) !== null,
            isSubCollection: Array.isArray(val) && val.length > 0 && typeof val[0] === 'object'
          }));
      }
      return [];
    }

    return Object.entries(value)
      .map(([key, val]) => ({
        name: key,
        type: Array.isArray(val) ? 'Array' : typeof val,
        value: val,
        isReference: typeof val === 'string' && val.match(/^[0-9a-fA-F]{24}$/) !== null,
        isReferenceArray: Array.isArray(val) && val.length > 0 && typeof val[0] === 'string' && val[0].match(/^[0-9a-fA-F]{24}$/) !== null,
        isSubCollection: Array.isArray(val) && val.length > 0 && typeof val[0] === 'object'
      }));
  };

  // 선택된 문서의 필드 정보 추출
  const getDocumentFields = () => {
    if (!selectedDocument) return [];

    return Object.entries(selectedDocument)
      .filter(([key]) => key !== '_id')
      .map(([key, value]) => ({
        name: key,
        type: Array.isArray(value) ? 'Array' : typeof value,
        value: value,
        isReference: typeof value === 'string' && value.match(/^[0-9a-fA-F]{24}$/) !== null,
        isReferenceArray: Array.isArray(value) && value.length > 0 && typeof value[0] === 'string' && value[0].match(/^[0-9a-fA-F]{24}$/) !== null,
        isSubCollection: Array.isArray(value) && value.length > 0 && typeof value[0] === 'object'
      }));
  };

  const renderFieldValue = (field: any) => {
    if (field.isReference) {
      return (
        <div className="text-blue-600">
          <span className="text-xs bg-blue-100 px-2 py-1 rounded">Reference</span>
          <div className="font-mono text-sm mt-1 break-words">{field.value}</div>
        </div>
      );
    }

    if (field.isReferenceArray) {
      return (
        <div className="text-blue-600">
          <span className="text-xs bg-blue-100 px-2 py-1 rounded">Reference Array</span>
          <div className="text-sm mt-1">{field.value.length} references</div>
        </div>
      );
    }

    if (field.isSubCollection) {
      return (
        <div className="text-purple-600">
          <span className="text-xs bg-purple-100 px-2 py-1 rounded">SubCollection</span>
          <div className="text-sm mt-1">{field.value.length} items</div>
        </div>
      );
    }

    if (typeof field.value === 'object' && field.value !== null) {
      return (
        <div className="text-orange-600">
          <span className="text-xs bg-orange-100 px-2 py-1 rounded">Object</span>
          <div className="text-sm mt-1">{Object.keys(field.value).length} properties</div>
        </div>
      );
    }

    return (
      <div className='flex-1 truncate min-w-0'>
        <span className={`text-xs px-2 py-1 rounded ${field.type === 'string' ? 'bg-green-100 text-green-600' :
          field.type === 'number' ? 'bg-blue-100 text-blue-600' :
            field.type === 'boolean' ? 'bg-yellow-100 text-yellow-600' :
              'bg-gray-100 text-gray-600'
          }`}>
          {field.type}
        </span>
        <p className="text-sm mt-1 truncate text-ellipsis">{String(field.value)}</p>
      </div>
    );
  };

  const renderFieldSection = (depth: number, title: string, icon: React.ReactNode, colSpan: number = 1) => {
    const fields = getFieldsAtDepth(depth);
    const isActive = depth <= currentDepth;

    return (
      <div
        className={`${colSpan === 2 ? 'col-span-2' : ''} bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full transition-all duration-300 ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
          }`}
        style={{
          transform: isActive ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center truncate flex-1 min-w-0">
              {icon}
              <span className="truncate">{title}</span>
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
        <div className="flex flex-col overflow-y-auto p-2 max-h-full overflow-x-hidden">
          {fields.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              {depth === 0 ? 'Select a document to view fields' : 'No nested fields'}
            </div>
          ) : (
            fields.map((field, index) => (
              <div
                key={field.name}
                onClick={() => handleFieldSelect(field.name, depth === 0 ? [] : fieldStack[depth - 1]?.path || [])}
                className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${index === fields.length - 1 ? 'mb-0' : 'mb-2'
                  } ${selectedField === field.name
                    ? 'bg-purple-50 border border-purple-200 shadow-sm'
                    : 'hover:bg-gray-50 border border-transparent'
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 truncate min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{field.name}</h4>
                      {(field.isReference || field.isReferenceArray) && (
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      )}
                      {field.isSubCollection && (
                        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      )}
                      {isObjectOrReference(field.value) && (
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                    {renderFieldValue(field)}
                  </div>
                </div>

                {/* 선택된 필드의 상세 정보 */}
                {selectedField === field.name && depth === currentDepth && (
                  <div className="mt-3 pt-3 border-t border-purple-200">
                    <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto max-h-32">
                      {JSON.stringify(field.value, null, 2)}
                    </pre>
                    {isObjectOrReference(field.value) && (
                      <div className="mt-2 flex space-x-2">
                        <button className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors duration-200">
                          {field.isReference || field.isReferenceArray ? 'Follow Reference' : 'Explore Object'}
                        </button>
                        <button className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors duration-200">
                          Edit Value
                        </button>
                      </div>
                    )}
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
      <div className="Collection_Panel_Navigation bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <nav className="flex items-center space-x-2 text-sm">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
          {getBreadcrumb().map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
              <button
                onClick={() => {
                  if (index >= 3) { // Database, Collection, Document 이후는 필드 네비게이션
                    handleBackNavigation(index - 3);
                  }
                }}
                className={`${index === getBreadcrumb().length - 1 ? 'text-green-600 font-medium' : 'text-gray-600 hover:text-gray-900 cursor-pointer'
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
          className="flex transition-all duration-500 ease-in-out h-full gap-4"
          style={{
            width: `calc(100% + ${currentDepth * 25}%)`,
            transform: `translateX(calc(-1 * ( ${currentDepth * 25}%))`
          }}
        >
          {/* 첫 번째 섹션: 컬렉션 목록 */}
          <div className={`flex-[1_1_0%] overflow-x-hidden`}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
              <div className="p-3 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="truncate">Collections ({collections.length})</span>
                </h3>
              </div>
              <div className="flex flex-col overflow-y-auto p-2 max-h-full">
                {collections.map((collection, index) => (
                  <div
                    key={collection.name}
                    onClick={() => handleCollectionSelect(collection.name)}
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${index === collections.length - 1 ? 'mb-0' : 'mb-2'
                      } ${selectedCollection === collection.name
                        ? 'bg-green-50 border border-green-200 shadow-sm'
                        : 'hover:bg-gray-50 border border-transparent'
                      } flex-1 truncate min-w-0`}
                  >
                    <div className="flex items-center justify-between relative">
                      <h4 className="font-medium text-gray-900 text-sm">{collection.name}</h4>
                      {selectedCollection === collection.name && (
                        <svg className="w-4 h-4 text-green-600 absolute right-0 bg-green-50" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      <div>{collection.documentCount.toLocaleString()} docs</div>
                      <div>{collection.size}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 두 번째 섹션: 문서 목록 */}
          <div className={`flex-[1_1_0%] overflow-x-hidden`}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
              <div className="p-3 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="truncate">Documents {selectedCollection && `(${documents.length})`}</span>
                </h3>
              </div>
              <div className="flex flex-col overflow-y-auto p-2 max-h-full">
                {!selectedCollection ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Select a collection to view documents
                  </div>
                ) : documents.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No documents found
                  </div>
                ) : (
                  documents.map((doc, index) => (
                    <div
                      key={doc._id}
                      onClick={() => handleDocumentSelect(doc)}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${index === documents.length - 1 ? 'mb-0' : 'mb-2'
                        } ${selectedDocument?._id === doc._id
                          ? 'bg-blue-50 border border-blue-200 shadow-sm'
                          : 'hover:bg-gray-50 border border-transparent'
                        }`}
                    >
                      <div className="flex items-center justify-between relative">
                        <div className="font-mono text-xs text-gray-600 truncate">
                          {doc._id}
                        </div>
                        {selectedDocument?._id === doc._id && (
                          <svg className="w-4 h-4 text-blue-600 flex-shrink-0 absolute right-0 bg-blue-50 " fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {Object.keys(doc).filter(key => key !== '_id').length} fields
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 동적 필드 섹션들, N 번째 섹션 */}
          {Array.from({ length: Math.max(1, currentDepth + 1) }, (_, index) => {
            const totalSections = Math.max(1, currentDepth + 1);
            const isLastSection = index === totalSections - 1;

            return (
              <div
                key={index}
                className={`${isLastSection ? 'flex-[2_1_0%]' : 'flex-[1_1_0%]'} overflow-x-hidden`}
              >
                {renderFieldSection(
                  index,
                  index === 0
                    ? (selectedDocument ? 'Document Fields & References' : 'Field Details')
                    : `${fieldStack[index - 1]?.name || 'Object'} Properties`,
                  <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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