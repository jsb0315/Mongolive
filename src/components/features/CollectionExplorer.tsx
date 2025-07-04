import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDatabaseContext } from '../../contexts/DatabaseContext';
import { useChangeStream } from '../../contexts/ChangeStreamContext';
import { DocumentProvider } from '../../contexts/DocumentContext';
import { FieldPath } from '../../types/collectionTypes';
import FieldSection from './FieldSection';
import {
  isObjectId,
  canTraverse,
  getMongoType,
  getValueByPath,
  resolveReference,
} from '../../utils/mongoUtils';
import { 
  apiClient, 
  APIClient,
  APIDatabase, 
  APICollection, 
  APICollectionSummary, 
  APIDocumentSummary,
  ChangeStreamEvent,
  RealtimeSubscriptionOptions,
  RealtimeEventHandlers
} from '../../utils/apiClient';

interface MongoDocument {
  _id: any;
  [key: string]: any;
}
interface CollectionExplorerProps {
  onCollectionChange?: (collection: string | null) => void;
  onDatabaseConnectionChange?: (isConnected: boolean) => void;
  isRealtimeEnabled?: boolean; // 실시간 기능 활성화 여부
}

const CollectionExplorer: React.FC<CollectionExplorerProps> = ({
  onCollectionChange,
  onDatabaseConnectionChange,
  isRealtimeEnabled = false
}) => {
  const { selectedDatabase, setCurrentCollection } = useDatabaseContext();
  const { subscribeToCollection, unsubscribeFromCollection, changeNotifications } = useChangeStream();
  
  // State 관리
  const [databases, setDatabases] = useState<APIDatabase[]>([]);
  const [collections, setCollections] = useState<APICollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [collectionSummary, setCollectionSummary] = useState<APICollectionSummary | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<MongoDocument | null>(null);
  const [selectedFields, setSelectedFields] = useState<(string | null)[]>([]);
  const [fieldStack, setFieldStack] = useState<FieldPath[]>([]);
  const [currentDepth, setCurrentDepth] = useState<number>(0);
  
  // 실시간 기능 상태 - Context에서 관리되므로 로컬 상태 제거
  const [lastChangeEvent, setLastChangeEvent] = useState<ChangeStreamEvent | null>(null);
  const maxNotifications = 10; // 최대 알림 개수
  
  // 변경 알림 처리를 위한 ref
  const lastProcessedNotificationRef = useRef<string | null>(null);
  const [isProcessingNotification, setIsProcessingNotification] = useState<boolean>(false);
  const [recentlyChangedPaths, setRecentlyChangedPaths] = useState<string[]>([]);
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());
  
  // 실시간 구독 관리
  const activeSubscriptionRef = useRef<string | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState({
    databases: false,
    collections: false,
    documents: false,
    document: false,
    realtime: false
  });
  
  const [error, setError] = useState<string | null>(null);

  // 데이터베이스 목록 로드 (summary endpoint 사용)
  useEffect(() => {
    const loadDatabases = async () => {
      try {
        setLoading(prev => ({ ...prev, databases: true }));
        setError(null);
        const databaseList = await apiClient.getDatabasesSummary();
        setDatabases(databaseList);
      } catch (err) {
        console.error('Failed to load databases:', err);
        setError(err instanceof Error ? err.message : 'Failed to load databases');
      } finally {
        setLoading(prev => ({ ...prev, databases: false }));
      }
    };

    loadDatabases();
  }, []);

  // 선택된 데이터베이스가 변경될 때 컬렉션 목록 업데이트
  useEffect(() => {
    if (selectedDatabase) {
      // summary API에서 로드한 데이터베이스 목록에서 선택된 데이터베이스 찾기
      const dbData = databases.find(db => db.name === selectedDatabase.name);
      if (dbData) {
        setCollections(dbData.collections);
      }
      
      // 데이터베이스가 변경되면 선택 상태 초기화
      setSelectedCollection(null);
      setCurrentCollection(null); // DatabaseContext에도 알림
      setCollectionSummary(null);
      setSelectedDocumentId(null);
      setSelectedDocument(null);
      setSelectedFields([]);
      setFieldStack([]);
      setCurrentDepth(0);
    } else {
      setCollections([]);
      setCurrentCollection(null); // DatabaseContext에도 알림
    }
  }, [selectedDatabase, databases]);

  // 변경된 필드들로 네비게이션하는 함수
  const navigateToChangedFields = useCallback(async (updatedFields: Record<string, any>, documentToUse?: MongoDocument) => {
    const fieldPaths = Object.keys(updatedFields);
    if (fieldPaths.length === 0) return;

    console.log('🎯 Navigating to changed fields:', fieldPaths);

    // 사용할 문서 결정 (파라미터로 받은 문서 또는 현재 선택된 문서)
    const currentDocument = documentToUse || selectedDocument;
    if (!currentDocument) return;

    // 필드 경로 분석을 위한 헬퍼 함수
    const analyzeFieldPath = (path: string, document: MongoDocument) => {
      const segments = path.split('.');
      let currentValue = document;
      let pathInfo = [];

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        
        // 숫자인지 확인 (배열 인덱스)
        const isArrayIndex = /^\d+$/.test(segment);
        
        if (isArrayIndex) {
          // 이전 값이 배열이어야 함
          if (Array.isArray(currentValue)) {
            const index = parseInt(segment);
            pathInfo.push({
              segment: `[${segment}]`,
              type: 'array-index',
              parentType: 'array',
              value: currentValue[index]
            });
            currentValue = currentValue[index];
          } else {
            console.warn(`Expected array but got ${typeof currentValue} at segment ${segment}`);
            break;
          }
        } else {
          // 객체 속성
          if (currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue)) {
            pathInfo.push({
              segment: segment,
              type: 'object-property',
              parentType: 'object',
              value: currentValue[segment]
            });
            currentValue = currentValue[segment];
          } else {
            console.warn(`Expected object but got ${typeof currentValue} at segment ${segment}`);
            break;
          }
        }
      }

      return pathInfo;
    };

    // 각 변경된 경로 분석
    fieldPaths.forEach(changedPath => {
      const pathInfo = analyzeFieldPath(changedPath, currentDocument);
      console.log(`📊 Path analysis for '${changedPath}':`, pathInfo);
      
      // 예: 'dfjg.2.value'의 경우
      // pathInfo[0]: { segment: 'dfjg', type: 'object-property', parentType: 'object', value: [...] }
      // pathInfo[1]: { segment: '[2]', type: 'array-index', parentType: 'array', value: {...} }
      // pathInfo[2]: { segment: 'value', type: 'object-property', parentType: 'object', value: "..." }
    });

    // 현재 필드 경로 구성 (fieldStack 기반)
    const currentFieldPath = fieldStack.map(field => field.name).join('.');
    console.log('📍 Current field path:', currentFieldPath);

    // 1. 현재 경로로 다시 네비게이션 (최신 문서 사용)
    await navigateToCurrentPath(currentFieldPath, currentDocument);

    // 2. 변경된 경로들과 현재 경로의 공통 상위 경로를 찾아 하이라이트
    const fieldsToHighlight = new Set<string>();
    
    for (const changedPath of fieldPaths) {
      console.log('🔍 Processing changed path:', changedPath, 'Current path:', currentFieldPath);
      
      // 경로 분석을 통해 실제 필드 구조 파악
      const pathInfo = analyzeFieldPath(changedPath, currentDocument);
      
      // MongoDB dot notation을 UI 경로로 변환
      // 예: 'dfjg.2.value' -> 'dfjg.[2].value' (배열 인덱스를 명시적으로 표현)
      const uiPath = pathInfo.map(info => info.segment).join('.');
      console.log(`🔄 Converted '${changedPath}' to UI path: '${uiPath}'`);
      
      // 현재 경로와 변경된 경로 간의 관계 분석
      const currentSegments = currentFieldPath.split('.');
      const changedSegments = uiPath.split('.');
      
      // 빈 경로 처리
      if (currentFieldPath === '' || currentFieldPath === null) {
        // 루트 레벨에서는 변경된 경로의 첫 번째 세그먼트를 하이라이트
        if (changedSegments.length > 0) {
          fieldsToHighlight.add(changedSegments[0]);
          console.log('✅ Root level highlight:', changedSegments[0]);
        }
        continue;
      }
      
      // 공통 상위 경로 찾기
      const commonParentPath = findCommonParentPath(currentFieldPath, uiPath);
      
      if (commonParentPath !== null) {
        // 공통 상위 경로에서 변경된 필드의 다음 세그먼트를 하이라이트
        const commonPathSegments = commonParentPath === '' ? [] : commonParentPath.split('.');
        
        if (changedSegments.length > commonPathSegments.length) {
          const nextSegmentInChangedPath = changedSegments[commonPathSegments.length];
          fieldsToHighlight.add(nextSegmentInChangedPath);
          console.log('✅ Will highlight field:', nextSegmentInChangedPath, 'from changed path:', changedPath);
        }
      } else {
        // 공통 경로가 없는 경우, 변경된 경로의 첫 번째 세그먼트를 하이라이트
        if (changedSegments.length > 0) {
          fieldsToHighlight.add(changedSegments[0]);
          console.log('✅ No common path, highlighting root field:', changedSegments[0]);
        }
      }
      
      // 추가: 변경된 경로가 현재 경로의 하위 경로인 경우
      if (uiPath.startsWith(currentFieldPath)) {
        const remainingPath = uiPath.substring(currentFieldPath.length);
        if (remainingPath.startsWith('.')) {
          const nextSegment = remainingPath.substring(1).split('.')[0];
          if (nextSegment) {
            fieldsToHighlight.add(nextSegment);
            console.log('✅ Highlighting descendant field:', nextSegment);
          }
        }
      }
      
      // 추가: 현재 경로가 변경된 경로의 하위 경로인 경우
      if (currentFieldPath.startsWith(uiPath)) {
        console.log('✅ Current path is descendant of changed path');
      }
    }

    // 하이라이트 필드 설정
    if (fieldsToHighlight.size > 0) {
      setHighlightedFields(fieldsToHighlight);
      
      // 2초 후 하이라이트 제거
      setTimeout(() => {
        setHighlightedFields(new Set());
      }, 2000);

      console.log('✅ Navigation and highlighting completed. Highlighted fields:', Array.from(fieldsToHighlight));
    }

  }, [fieldStack]);

  // 공통 상위 경로를 찾는 함수
  const findCommonParentPath = useCallback((currentPath: string, changedPath: string): string | null => {
    const currentSegments = currentPath.split('.');
    const changedSegments = changedPath.split('.');
    
    // 빈 경로 처리
    if (currentPath === '' && changedPath === '') return '';
    if (currentPath === '') return null;
    if (changedPath === '') return null;
    
    const commonSegments = [];
    const minLength = Math.min(currentSegments.length, changedSegments.length);
    
    for (let i = 0; i < minLength; i++) {
      if (currentSegments[i] === changedSegments[i]) {
        commonSegments.push(currentSegments[i]);
      } else {
        break;
      }
    }
    
    return commonSegments.length > 0 ? commonSegments.join('.') : null;
  }, []);

  // 특정 경로로 네비게이션하는 함수
  const navigateToCurrentPath = useCallback(async (targetPath: string, documentToUse?: MongoDocument) => {
    // 사용할 문서 결정
    const currentDocument = documentToUse || selectedDocument;
    if (!currentDocument || !targetPath) return;

    console.log('🧭 Navigating to path:', targetPath);

    const pathSegments = targetPath.split('.');
    let currentValue = currentDocument;
    let newFieldStack: FieldPath[] = [];
    let newSelectedFields: (string | null)[] = [];

    try {
      for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i];
        
        // 배열 인덱스인지 확인 (예: [0], [1] 등)
        const arrayIndexMatch = segment.match(/^\[(\d+)\]$/);
        if (arrayIndexMatch) {
          const index = parseInt(arrayIndexMatch[1]);
          if (Array.isArray(currentValue) && index < currentValue.length) {
            currentValue = currentValue[index];
            newSelectedFields[i] = `[${index}]`;
          } else {
            console.warn('Invalid array index:', segment);
            break;
          }
        } else {
          // 일반 객체 속성
          if (currentValue && typeof currentValue === 'object' && segment in currentValue) {
            const fieldValue = currentValue[segment];
            const fieldType = getMongoType(fieldValue);
            
            newFieldStack.push({
              name: segment,
              value: fieldValue,
              path: pathSegments.slice(0, i + 1),
              type: fieldType,
              referencedDocuments: null,
              referencedCollection: null,
              referencedDatabase: null,
              referencedId: isObjectId(fieldValue) ? fieldValue : null,
            });

            newSelectedFields[i] = segment;
            currentValue = fieldValue;
          } else {
            console.warn('Invalid path segment:', segment, 'in object:', currentValue);
            break;
          }
        }
      }

      // 네비게이션 상태 업데이트
      if (newFieldStack.length > 0) {
        setFieldStack(newFieldStack);
        setSelectedFields(newSelectedFields);
        setCurrentDepth(newFieldStack.length);
        
        console.log('✅ Navigation to path completed:', targetPath);
        console.log('📍 New field stack:', newFieldStack);
      } else if (pathSegments.length === 1 && pathSegments[0] === '') {
        // 루트 경로로 리셋
        setFieldStack([]);
        setSelectedFields([]);
        setCurrentDepth(0);
        console.log('✅ Reset to root path');
      }

    } catch (error) {
      console.error('Failed to navigate to path:', targetPath, error);
    }
  }, []);

  // 변경 알림 처리 함수
  const handleChangeNotification = useCallback(async (notification: ChangeStreamEvent) => {
    console.log('🔄 Processing change notification:', notification);
    setIsProcessingNotification(true);
    
    try {
      // 1. 컬렉션 요약 새로고침
      if (selectedDatabase && selectedCollection) {
        console.log('🔄 Refreshing collection summary...');
        const summary = await apiClient.getCollectionSummary(selectedDatabase.name, selectedCollection);
        setCollectionSummary(summary);
      }

      // 2. 현재 선택된 문서가 변경된 경우 새로고침
      let documentWasUpdated = false;
      let updatedDocument = null;
      if (selectedDocumentId && notification.documentKey?._id) {
        const notificationDocId = notification.documentKey._id.toString();
        if (selectedDocumentId === notificationDocId) {
          console.log('🔄 Current document affected, refreshing...');
          if (notification.operationType === 'delete') {
            // 문서가 삭제된 경우 선택 해제
            setSelectedDocumentId(null);
            setSelectedDocument(null);
            setSelectedFields([]);
            setFieldStack([]);
            setCurrentDepth(0);
          } else {
            // 문서가 업데이트된 경우 다시 로드하고 최신 문서 저장
            if (selectedDatabase && selectedCollection) {
              const document = await apiClient.getDocument(selectedDatabase.name, selectedCollection, selectedDocumentId);
              setSelectedDocument(document);
              setSelectedFields([]);
              setFieldStack([]);
              setCurrentDepth(0);
              documentWasUpdated = true;
              updatedDocument = document;
              console.log('✅ Document updated with latest data');
            }
          }
        }
      }

      // 3. 변경된 필드 경로로 네비게이션 (update 작업의 경우)
      if (notification.operationType === 'update' && notification.updateDescription?.updatedFields && documentWasUpdated && updatedDocument) {
        const updatedFieldPaths = Object.keys(notification.updateDescription.updatedFields);
        setRecentlyChangedPaths(updatedFieldPaths);
        
        // 3초 후 하이라이트 제거
        setTimeout(() => {
          setRecentlyChangedPaths([]);
        }, 3000);
        
        // 최신 문서를 사용하여 네비게이션 실행
        await navigateToChangedFields(notification.updateDescription.updatedFields, updatedDocument);
      }

      // 4. 새로 삽입된 문서로 네비게이션 (insert 작업의 경우)
      if (notification.operationType === 'insert' && notification.fullDocument?._id) {
        const newDocId = notification.fullDocument._id.toString();
        console.log('🔄 New document inserted, navigating to:', newDocId);
        setTimeout(() => {
          handleDocumentSelect(newDocId);
        }, 500); // 약간의 지연을 두어 UI 업데이트 완료 후 실행
      }

    } catch (error) {
      console.error('Failed to handle change notification:', error);
    } finally {
      setIsProcessingNotification(false);
    }
  }, [selectedDatabase, selectedCollection, selectedDocumentId, navigateToChangedFields]);

  // 변경 알림 처리 effect
  useEffect(() => {
    if (changeNotifications.length > 0 && selectedDatabase && selectedCollection) {
      const latestNotification = changeNotifications[0];
      const notificationId = `${latestNotification.timestamp}-${latestNotification.operationType}`;
      
      // 이미 처리된 알림인지 확인
      if (lastProcessedNotificationRef.current !== notificationId) {
        lastProcessedNotificationRef.current = notificationId;
        handleChangeNotification(latestNotification);
      }
    }
  }, [changeNotifications, selectedDatabase, selectedCollection, handleChangeNotification]);

  const handleCollectionSelect = async (collectionName: string) => {
    if (!selectedDatabase) return;

    try {
      // console.log(`\n==================================== \nSelecting collection: ${collectionName} from database: ${selectedDatabase.name}`);
      
      setLoading(prev => ({ ...prev, documents: true }));
      setError(null);
      setSelectedCollection(collectionName);
      setCurrentCollection(collectionName); // DatabaseContext에 알림

      // summary API에서 컬렉션 요약 정보 로드
      const summary = await apiClient.getCollectionSummary(selectedDatabase.name, collectionName);
      setCollectionSummary(summary);
      setSelectedDocumentId(null);
      setSelectedDocument(null);
      setSelectedFields([]);
      setFieldStack([]);
      setCurrentDepth(0);

      // console.log(summary, `Loaded collection summary for ${selectedDatabase.name}/${collectionName}`);
      
    } catch (err) {
      console.error('Failed to load collection summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to load collection summary');
      setCollectionSummary(null);
    } finally {
      setLoading(prev => ({ ...prev, documents: false }));
    }
  };

  const handleDocumentSelect = async (docId: string) => {
    if (!selectedDatabase || !selectedCollection) return;

    try {
      // console.log(`\n==================================== \nSelecting document: ${docId}`);
      
      setLoading(prev => ({ ...prev, document: true }));
      setError(null);
      setSelectedDocumentId(docId);

      // 개별 문서의 전체 데이터 로드
      const document = await apiClient.getDocument(selectedDatabase.name, selectedCollection, docId);
      setSelectedDocument(document);
      setSelectedFields([]);
      setFieldStack([]);
      setCurrentDepth(0);

      // console.log(document, `Loaded full document for ${selectedDatabase.name}/${selectedCollection}/${docId}`);
      
    } catch (err) {
      console.error('Failed to load document:', err);
      setError(err instanceof Error ? err.message : 'Failed to load document');
      setSelectedDocument(null);
    } finally {
      setLoading(prev => ({ ...prev, document: false }));
    }
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
      };

      if (depth === currentDepth) {
        // console.log(`Adding new field to stack at depth ${depth} \n`, newField)
        setFieldStack(prev => [...prev, newField]);
        setCurrentDepth(prev => prev + 1);
      } else {
        // console.log(`Updating field stack at depth ${depth} from ${currentDepth} \n`, newField);
        handleBackNavigation(currentDepth + (depth - currentDepth + 1));
        setFieldStack(prev => [...prev.slice(0, -1), newField]);
      }
      // console.log(`Field stack updated:`, fieldValue, fieldStack);
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

  // API 기반 참조 해결 함수 (현재는 단순화)
  const resolveReferenceAPI = async (objectId: any, currentDb: string): Promise<{
    document: MongoDocument | null;
    collection: string | null;
    database: string | null;
  }> => {
    try {
      // summary 기반 탐색에서는 참조 해결을 단순화
      // 실제 참조 해결은 사용자가 특정 document를 선택할 때 getDocument API로 처리
      // console.log(`Reference resolution for ${objectId} in ${currentDb} - simplified for summary mode`);
      return { document: null, collection: null, database: null };
    } catch (error) {
      console.error('Failed to resolve reference:', error);
      return { document: null, collection: null, database: null };
    }
  };

  // depth에 따른 필드 목록 가져오기 (API 기반 참조 해결 포함)
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

          // ObjectId 참조는 비동기로 처리하므로 초기에는 null로 설정
          // 실제 참조 해결은 사용자가 필드를 클릭할 때 수행
          if (isObjectId(value)) {
            // console.log(`====>\n Depth 0 ObjectId detected: ${key} = ${value}`);
            // TODO: 비동기 참조 해결을 위한 로직 추가 필요
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
      const parentField = fieldStack[depth - 1];
      const parentType = parentField?.type || ['ObjectId', 'Document', 'Array', 'String', 'Boolean', 'Int32', 'Double', 'Embedded'];

      const isRefField = parentType.length === 2 && parentType.includes("ObjectId") && parentType.includes("Referenced");
      const isArrayField = parentType.includes('Array');
      const refDocs = parentField.referencedDocuments;
      const targetValue = isRefField ? parentField.referencedDocuments![0] : parentField.value;
      
      // console.log('\n----------------------\ngetFieldsAtDepth called for depth:', depth, '\nparentField:', parentField, '\ntargetValue:', targetValue, '\nisRefField:', isRefField, '\ncanTraverse:', canTraverse(targetValue, parentType));

      if (!canTraverse(targetValue, parentType)) return [];

      return (isArrayField ? targetValue : Object.entries(targetValue).filter(([key]) => key !== '_id')).map((item: any, index: number) => {
        const key = isArrayField ? `[${index}]` : item[0];
        const value = isArrayField ? item : item[1];
        const fieldType = getMongoType(value);
        const isRefField = fieldType.length === 2 && fieldType.includes("ObjectId") && fieldType.includes("Referenced");
        
        // API 기반 참조 해결은 필요시 비동기로 처리
        // 현재는 기본값으로 설정
        return {
          name: key,
          value: value,
          path: [...parentField.path, key],
          type: fieldType,
          referencedDatabase: isRefField ? null : parentField.referencedDatabase, // API 호출로 해결 필요
          referencedCollection: isRefField ? null : parentField.referencedCollection,
          referencedDocuments: isRefField ? null : null,
          referencedId: isRefField ? value : parentField.referencedId,
        } as FieldPath;
      });
    }
  };

  // 현재 위치 네비게이션 생성
  const getBreadcrumb = () => {
    const items = [];
    if (selectedCollection) {
      items.push(selectedCollection);
    }
    if (selectedDocumentId) {
      items.push(`${selectedDocumentId.toString().substring(0, 8)}...`);
    }
    fieldStack.forEach(field => {
      if (field.type.includes('ObjectId') && field.type.length === 2 && field.referencedDatabase && field.referencedCollection) {
        items.push(`${field.name} → (${field.referencedDatabase}/${field.referencedCollection})`);
      } else if (field.referencedId && field.referencedDatabase && field.referencedCollection) {
        items.push(`${field.name} (${field.referencedDatabase}/${field.referencedCollection})`);
      } else {
        items.push(`${field.name}`);
      }
    });
    return items;
  };

  // 에러 상태 렌더링
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-500">
          <svg className="w-16 h-16 mx-auto text-red-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-lg font-medium">Error Loading Data</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
          <div className="side-scroll flex items-center space-x-3 text-sm overflow-x-auto p-1 pt-0"
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
                <span className="text-slate-700 font-medium whitespace-nowrap">
                  {selectedDatabase ? selectedDatabase.name : 'Database'}
                  {loading.databases && <span className="ml-2 text-xs">(Loading...)</span>}
                </span>
                {isProcessingNotification && (
                  <div className="ml-2 flex items-center space-x-1">
                    <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                    <span className="text-xs text-blue-600 shrink-0">Processing change...</span>
                  </div>
                )}
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
                  <span className="truncate">
                    Collections ({collections.length})
                    {loading.collections && <span className="ml-1 text-xs">(Loading...)</span>}
                  </span>
                </h3>
              </div>
              <div className="flex-1 flex-col overflow-y-auto p-2 max-h-full overflow-x-hidden">
                {loading.collections ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    <div className="truncate">Loading collections...</div>
                  </div>
                ) : collections.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    <div className="truncate">No collections found</div>
                  </div>
                ) : (
                  collections.map((collection, index) => (
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
                        <div className="truncate">Documents: {collection.documentCount ?? '-'}</div>
                      </div>
                    </div>
                  ))
                )}
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
                  <span className="truncate">
                    Documents {selectedCollection && collectionSummary && `(${collectionSummary.documents.length})`}
                    {loading.documents && <span className="ml-1 text-xs">(Loading...)</span>}
                  </span>
                </h3>
              </div>
              <div className="flex-1 flex-col overflow-y-auto p-2 max-h-full overflow-x-hidden">
                {!selectedCollection ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    <div className="truncate">Select a collection to view documents</div>
                  </div>
                ) : loading.documents ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    <div className="truncate">Loading documents...</div>
                  </div>
                ) : !collectionSummary || collectionSummary.documents.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    <div className="truncate">No documents found</div>
                  </div>
                ) : (
                  collectionSummary.documents.map((docSummary: APIDocumentSummary, index: number) => (
                    <div
                      key={docSummary._id.toString()}
                      onClick={() => handleDocumentSelect(docSummary._id.toString())}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 overflow-hidden ${index === collectionSummary.documents.length - 1 ? 'mb-0' : 'mb-2'
                        } ${selectedDocumentId === docSummary._id.toString()
                          ? 'bg-blue-50 border border-blue-200 shadow-sm'
                          : 'hover:bg-gray-50 border border-transparent'
                        }`}
                    >
                      <div className="flex items-center justify-between relative min-w-0">
                        <div className="font-mono text-xs text-gray-600 truncate">
                          {docSummary._id.toString()}
                        </div>
                        {selectedDocumentId === docSummary._id.toString() && (
                          <svg className="w-4 h-4 text-blue-600 flex-shrink-0 absolute right-0 bg-blue-50" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 truncate">
                        {docSummary.fieldCount} fields
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

            <DocumentProvider
              databaseName={selectedDatabase.name}
              collectionName={selectedCollection || ''}
              documentId={selectedDocumentId || ''}
              document={selectedDocument}
              onDocumentChange={setSelectedDocument}
            >
              {Array.from({ length: Math.max(1, currentDepth + 1) }, (_, index) => {
                const totalSections = Math.max(1, currentDepth + 1);
                const isLastSection = index === totalSections - 1;
                const parentField = index > 0 ? fieldStack[index - 1] : null;

                const parentType = parentField?.type || [];
                const hasRefField = parentField?.type.includes('ObjectId') || false;
                const isRefField = parentType.length === 2 && parentType.includes("ObjectId") && parentType.includes("Referenced");
                const referencedId = parentField?.referencedId;

                // 렌더링 여부 결정: 최근 3개 섹션만 true
                const shouldRenderFields = index >= Math.max(0, totalSections - 3);

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
                      shouldRenderFields={shouldRenderFields}
                      highlightedFields={highlightedFields}
                      onFieldSelect={handleFieldSelect}
                      onBackNavigation={handleBackNavigation}
                    />
                  </div>
                );
              })}
            </DocumentProvider>
        </div>
      </div>
    </div>
  );
};

export default CollectionExplorer;