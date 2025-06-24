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
  isObjectIdArray,
  isDocument,
  hasSubDocuments,
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

  // ReferencedDocument 상태인지 확인 (fieldStack에서 ReferencedDocument가 있는지 확인)
  const isInReferencedDocumentMode = (): boolean => {
    return fieldStack.some(field => field.isReferencedDocument || field.hasReference);
  };

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
    console.log(`Selecting document: `, document);
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

    const fieldType = getMongoType(fieldValue);
    // Reference 확인 (isObjectId && isArray 조건 통합)
    const isRefField = typeof fieldType === 'string' ? fieldType === 'ObjectId' : fieldType.includes('ObjectId');

    // ReferencedDocument 확인 (Referenced Document 배열에서 개별 문서를 선택한 경우)
    const isRefDocField = (/^\[\d+\]/.test(fieldName) && parentField?.hasReference) ||
      (fieldValue && typeof fieldValue === 'object' && '_id' in fieldValue && parentField?.hasReference);

    console.log('문제의 그부분 ----------------> ', isRefDocField, parentField?.hasReference)
    // 현재 depth와 선택된 필드가 일치하지 않으면 선택 해제
    if (!canTraverse(fieldValue, isRefField, isRefDocField ? 'temp' : null, fieldType) && fieldName === selectedFields[depth]) {
      setSelectedFields(prev => {
        const newFields = [...prev];
        newFields[depth] = null;
        return newFields;
      });
      return;
    }

    console.log(`Selecting field: ${fullPath.join('.')}, fieldValue:`, fieldValue, 'hasReference:', isRefField, 'isReferencedDocument:', isRefDocField, 'canTraverse', canTraverse(fieldValue, isRefField, isRefDocField ? 'temp' : null, fieldType));

    // depth에 해당하는 selectedField 설정
    setSelectedFields(prev => {
      const newFields = [...prev];
      newFields[depth] = fieldName;
      return newFields.slice(0, depth + 1);
    });

    let referencedDocuments = null;
    let referencedCollection: string[] | null = null;
    let referencedDatabase = null;
    let isReferencedDocument: string | null = null;
    let originalDocument = null;

    // parentField가 ReferencedDocument인 경우 정보 업데이트
    if (parentField?.isReferencedDocument) {
      referencedCollection = parentField.referencedCollection;
      referencedDatabase = parentField.referencedDatabase;
      isReferencedDocument = parentField.isReferencedDocument || fieldValue?._id?.toString();

      // ReferencedDocument의 하위 필드인 경우
      if (parentField.originalDocument) {
        if (hasSubDocuments(fieldValue) || isDocument(fieldValue) || Array.isArray(fieldValue)) {
          originalDocument = fieldValue;
        }
      }
    }

    // Reference, ReferencedDocument, SubDocument, Array만 depth 증가
    if (canTraverse(fieldValue, isRefField, isRefDocField ? 'temp' : null, fieldType)) {

      // ReferencedDocument 처리 (Reference 배열에서 개별 문서 선택)
      if (isRefDocField && parentField?.referencedDocuments) {
        if (/^\[\d+\]/.test(fieldName)) {
          const index = parseInt(fieldName.match(/^\[(\d+)\]/)?.[1] || '0');
          originalDocument = parentField.referencedDocuments[index];
          // 상위 문서의 ObjectId 저장
          isReferencedDocument = originalDocument?._id?.toString() || null;
          referencedCollection = [parentField.referencedCollection![index]];
        } else {
          // 단일 Referenced Document에서 다른 객체 필드를 선택한 경우
          originalDocument = fieldValue;
          isReferencedDocument = fieldValue?._id?.toString() || null;
          referencedCollection = parentField.referencedCollection;
        }
        referencedDatabase = parentField.referencedDatabase;
      }
      // Reference 해결
      else if (isRefField) {
        // ObjectId인 경우
        if (isObjectId(fieldValue) && !Array.isArray(fieldValue)) {
          const resolved = resolveReference(fieldValue, selectedDatabase);
          referencedDocuments = resolved.document ? [resolved.document] : null;
          referencedCollection = resolved.collection ? [resolved.collection] : null;
          referencedDatabase = selectedDatabase?.name || null;  // DB도 통째로 찾으려면 나중에 수정
        } 
        // ObjectId 배열인 경우
        else if ((isObjectId(fieldValue) && Array.isArray(fieldValue)) || isObjectIdArray(fieldValue)) {
          const resolvedRefs = fieldValue.map((id: any) => resolveReference(id, selectedDatabase));
          const resolvedDocs = resolvedRefs.map((ref: any) => ref.document);
          const resolvedCollections = resolvedRefs.map((ref: any) => ref.collection);
          if (resolvedDocs.length > 0 && resolvedDocs[0]) { 
            referencedDocuments = resolvedDocs;
            referencedDatabase = selectedDatabase?.name || null;
            referencedCollection = resolvedCollections;
          } else {
            referencedDocuments = [];
          }
        }
      }

      const newField: FieldPath = {
        name: fieldName,
        value: fieldValue,
        path: fullPath,
        type: isRefDocField ? 'Referenced' : getMongoType(fieldValue),
        isObjectId: isObjectId(fieldValue),
        isDocument_type: isDocument(fieldValue),
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
  const getFieldsAtDepth = (depth: number): FieldPath[] => {
    if (!selectedDocument) return [];

    if (depth === 0) {
      // 루트 레벨 필드들
      return Object.keys(selectedDocument)
        // .filter(key => key !== '_id') // _id 제외
        .map(key => {
          const fieldType = getMongoType(selectedDocument[key]);
          return {
            name: key,
            value: selectedDocument[key],
            path: [key],
            type: fieldType,
            isObjectId: isObjectId(selectedDocument[key]),
            isDocument_type: isDocument(selectedDocument[key]),
            isArray: Array.isArray(selectedDocument[key]),
            hasSubDocuments: hasSubDocuments(selectedDocument[key]),
            hasReference: typeof fieldType === 'string' ? fieldType === 'ObjectId' : fieldType.includes('ObjectId'),
            referencedDatabase: null,
            referencedCollection: null,
            referencedDocuments: null,
            isReferencedDocument: null
          }
        });
    } else {
      // 중첩된 레벨의 필드들
      const parentField = fieldStack[depth - 1];
      if (!parentField) return [];

      // ReferencedDocument 필드인 경우 (개별 Referenced Document의 필드들)
      if (parentField.isReferencedDocument && parentField.originalDocument) {
        const refDoc = parentField.originalDocument;
        return Object.keys(refDoc)
          // .filter(key => key !== '_id')
          .map(key => {
            const fieldType = getMongoType(refDoc[key]);
            return {
              name: key,
              value: refDoc[key],
              path: [...parentField.path, key],
              type: fieldType,
              isObjectId: isObjectId(refDoc[key]),
              isDocument_type: isDocument(refDoc[key]),
              isArray: Array.isArray(refDoc[key]),
              hasSubDocuments: hasSubDocuments(refDoc[key]),
              hasReference: typeof fieldType === 'string' ? fieldType === 'ObjectId' : fieldType.includes('ObjectId'),
              referencedDatabase: parentField.referencedDatabase,
              referencedCollection: parentField.referencedCollection,
              referencedDocuments: null,
              // ReferencedDocument 모드에서는 모든 하위 요소들도 ReferencedDocument로 마킹
              isReferencedDocument: refDoc[key]?._id?.toString() || parentField.isReferencedDocument
            }
          });
      }

      const refDocs = parentField?.referencedDocuments || null;
      // 단독 Reference 필드인 경우 (Referenced Documents 목록)
      if (parentField.hasReference && refDocs) {
        return refDocs.map((doc: MongoDocument, index: number) => {
          return {
            name: `[${index}] ${doc._id.toString()}${!parentField.isArray ? ' _' : ''}`,
            value: doc,
            path: [...parentField.path, `[${index}]`],
            type: 'Referenced',
            isObjectId: false,
            isDocument_type: ['Embedded'],
            isArray: false,
            hasSubDocuments: false,
            hasReference: false,
            referencedDocuments: null,
            referencedDatabase: parentField.referencedDatabase,
            referencedCollection: [parentField.referencedCollection![index]],
            isReferencedDocument: doc._id.toString(),
            originalDocument: doc
          }
        });
      }

      const parentValue = parentField.value;
      if (parentField.isArray) {
        // Array 필드인 경우 배열 요소들을 표시
        const arrayValue = parentField.value;
        if (Array.isArray(arrayValue)) {
          return arrayValue.map((item: any, index: number) => {
            {
              const fieldType = getMongoType(item);
              return {
                name: `[${index}]`,
                value: item,
                path: [...parentField.path, `[${index}]`],
                type: fieldType,
                isObjectId: isObjectId(item),
                isDocument_type: isDocument(item),
                isArray: Array.isArray(item),
                hasSubDocuments: hasSubDocuments(item),
                hasReference: typeof fieldType === 'string' ? fieldType === 'ObjectId' : fieldType.includes('ObjectId'),
                referencedDatabase: refDocs ? parentField.referencedDatabase : null,
                referencedCollection: refDocs ? [parentField.referencedCollection![index]] : null,
                referencedDocuments: null,
                // ReferencedDocument 모드인 경우 하위 요소들도 ReferencedDocument로 마킹
                isReferencedDocument: item?._id?.toString() || parentField.isReferencedDocument
              }
            }
          });
        }
        return [];
      }

      if (hasSubDocuments(parentValue)) {
        // SubDocument 배열인 경우
        return parentValue.map((item: any, index: number) => {
          const fieldType = getMongoType(item);
          return {
            name: `[${index}]`,
            value: item,
            path: [...parentField.path, `[${index}]`],
            type: fieldType,
            isObjectId: isObjectId(item),
            isDocument_type: isDocument(item),
            isArray: Array.isArray(item),
            hasSubDocuments: hasSubDocuments(item),
            hasReference: typeof fieldType === 'string' ? fieldType === 'ObjectId' : fieldType.includes('ObjectId'),
            referencedDatabase: refDocs ? parentField.referencedDatabase : null,
            referencedCollection: refDocs ? [parentField.referencedCollection![index]] : null,
            // ReferencedDocument 모드인 경우 하위 요소들도 ReferencedDocument로 마킹
            isReferencedDocument: item?._id?.toString() || parentField.isReferencedDocument
          }
        });
      } else if (isDocument(parentValue)) {
        // 도큐먼트인 경우
        return Object.keys(parentValue)
          // .filter(key => key !== '_id')
          .map(key => {
            const fieldType = getMongoType(parentValue[key]);
            return {
              name: key,
              value: parentValue[key],
              path: [...parentField.path, key],
              type: fieldType,
              isObjectId: isObjectId(parentValue[key]),
              isDocument_type: isDocument(parentValue[key]),
              isArray: Array.isArray(parentValue[key]),
              hasSubDocuments: hasSubDocuments(parentValue[key]),
              hasReference: typeof fieldType === 'string' ? fieldType === 'ObjectId' : fieldType.includes('ObjectId'),
              referencedDatabase: refDocs ? parentField.referencedDatabase : null,
              referencedCollection: refDocs ? parentField.referencedCollection : null,
              referencedDocuments: null,
              // ReferencedDocument 모드인 경우 하위 요소들도 ReferencedDocument로 마킹
              isReferencedDocument: parentValue[key]?._id?.toString() || parentField.isReferencedDocument
            }
          });
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
                className={`truncate min-w-0 ${index === getBreadcrumb().length - 1 ? 'text-green-600 font-medium' : 'text-gray-600 hover:text-gray-900 cursor-pointer'
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
                        {Object.keys(doc).length} fields
                        {/* {Object.keys(doc).filter(key => key !== '_id').length} fields */}
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
            const hasReferenceSection = parentField?.hasReference || false;
            const isReferencedDocumentSection = parentField?.isReferencedDocument;  // Ref ObjectID O

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
                      : parentField?.type === 'Referenced'
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
                  hasReferenceSection={hasReferenceSection}
                  isReferencedDocumentSection={isReferencedDocumentSection}
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