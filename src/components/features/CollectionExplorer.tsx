import React, { useState, useEffect, useCallback, useRef } from 'react';
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

const CollectionExplorer: React.FC = () => {
  const { selectedDatabase } = useDatabaseContext();
  
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
  
  // 실시간 기능 상태
  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState<boolean>(false);
  const [realtimeStatus, setRealtimeStatus] = useState<string>('disconnected');
  const [lastChangeEvent, setLastChangeEvent] = useState<ChangeStreamEvent | null>(null);
  const [changeNotifications, setChangeNotifications] = useState<ChangeStreamEvent[]>([]);
  const maxNotifications = 10; // 최대 알림 개수
  
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
      setCollectionSummary(null);
      setSelectedDocumentId(null);
      setSelectedDocument(null);
      setSelectedFields([]);
      setFieldStack([]);
      setCurrentDepth(0);
    } else {
      setCollections([]);
    }
  }, [selectedDatabase, databases]);

  const handleCollectionSelect = async (collectionName: string) => {
    if (!selectedDatabase) return;

    try {
      console.log(`\n==================================== \nSelecting collection: ${collectionName} from database: ${selectedDatabase.name}`);
      
      setLoading(prev => ({ ...prev, documents: true }));
      setError(null);
      setSelectedCollection(collectionName);

      // summary API에서 컬렉션 요약 정보 로드
      const summary = await apiClient.getCollectionSummary(selectedDatabase.name, collectionName);
      setCollectionSummary(summary);
      setSelectedDocumentId(null);
      setSelectedDocument(null);
      setSelectedFields([]);
      setFieldStack([]);
      setCurrentDepth(0);

      console.log(summary, `Loaded collection summary for ${selectedDatabase.name}/${collectionName}`);
      
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
      console.log(`\n==================================== \nSelecting document: ${docId}`);
      
      setLoading(prev => ({ ...prev, document: true }));
      setError(null);
      setSelectedDocumentId(docId);

      // 개별 문서의 전체 데이터 로드
      const document = await apiClient.getDocument(selectedDatabase.name, selectedCollection, docId);
      setSelectedDocument(document);
      setSelectedFields([]);
      setFieldStack([]);
      setCurrentDepth(0);

      console.log(document, `Loaded full document for ${selectedDatabase.name}/${selectedCollection}/${docId}`);
      
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

  // API 기반 참조 해결 함수 (현재는 단순화)
  const resolveReferenceAPI = async (objectId: any, currentDb: string): Promise<{
    document: MongoDocument | null;
    collection: string | null;
    database: string | null;
  }> => {
    try {
      // summary 기반 탐색에서는 참조 해결을 단순화
      // 실제 참조 해결은 사용자가 특정 document를 선택할 때 getDocument API로 처리
      console.log(`Reference resolution for ${objectId} in ${currentDb} - simplified for summary mode`);
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
            console.log(`====>\n Depth 0 ObjectId detected: ${key} = ${value}`);
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
      
      console.log('\n----------------------\ngetFieldsAtDepth called for depth:', depth, '\nparentField:', parentField, '\ntargetValue:', targetValue, '\nisRefField:', isRefField, '\ncanTraverse:', canTraverse(targetValue, parentType));

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

  // 실시간 기능 활성화/비활성화 핸들러
  const handleRealtimeToggle = useCallback(async () => {
    if (!selectedDatabase || !selectedCollection) return;

    if (isRealtimeEnabled) {
      // 실시간 비활성화
      if (activeSubscriptionRef.current) {
        const [dbName, collectionName] = activeSubscriptionRef.current.split('.');
        apiClient.unsubscribeFromCollection(dbName, collectionName);
        activeSubscriptionRef.current = null;
      }
      setIsRealtimeEnabled(false);
      setRealtimeStatus('disconnected');
      console.log('🔴 Realtime disabled for collection');
    } else {
      // 실시간 활성화
      try {
        setLoading(prev => ({ ...prev, realtime: true }));
        setRealtimeStatus('connecting');

        const subscriptionOptions: RealtimeSubscriptionOptions = {
          dbName: selectedDatabase.name,
          collectionName: selectedCollection,
          query: '{}',
          limit: 1000 // 실시간 감지를 위해 더 많은 문서 추적
        };

        const eventHandlers: RealtimeEventHandlers = {
          onData: (data) => {
            console.log('📡 Initial realtime data received:', data);
            if (data.type === 'initial' && data.data) {
              // 초기 데이터로 컬렉션 요약 업데이트 (필요시)
              console.log('Initial collection data loaded via realtime');
            }
          },
          onChange: (change: ChangeStreamEvent) => {
            console.log('🔄 Change event received:', change);
            setLastChangeEvent(change);
            
            // 변경 알림 추가
            setChangeNotifications(prev => {
              const newNotifications = [change, ...prev].slice(0, maxNotifications);
              return newNotifications;
            });

            // 현재 선택된 문서가 변경된 경우 자동 새로고침
            if (selectedDocumentId && APIClient.changeAffectsDocument(change, selectedDocumentId)) {
              console.log('🔄 Current document affected, refreshing...');
              handleDocumentSelect(selectedDocumentId);
            }

            // 컬렉션 요약 새로고침 (문서 추가/삭제의 경우)
            if (APIClient.isInsert(change) || APIClient.isDelete(change)) {
              console.log('🔄 Collection affected, refreshing summary...');
              refreshCollectionSummary();
            }
          },
          onError: (error: Error) => {
            console.error('❌ Realtime error:', error);
            setError(`Realtime error: ${error.message}`);
            setRealtimeStatus('error');
            
            // 자동 재연결 시도
            if (retryTimeoutRef.current) {
              clearTimeout(retryTimeoutRef.current);
            }
            retryTimeoutRef.current = setTimeout(() => {
              console.log('🔄 Attempting to reconnect realtime...');
              handleRealtimeToggle();
            }, 5000);
          },
          onSubscribed: (info) => {
            console.log('✅ Realtime subscribed:', info);
            setRealtimeStatus('connected');
            setError(null);
          },
          onUnsubscribed: (info) => {
            console.log('🔴 Realtime unsubscribed:', info);
            setRealtimeStatus('disconnected');
          }
        };

        const subscriptionKey = apiClient.subscribeToCollection(subscriptionOptions, eventHandlers);
        activeSubscriptionRef.current = subscriptionKey;
        setIsRealtimeEnabled(true);
        
        console.log('🟢 Realtime enabled for collection:', subscriptionKey);
        
      } catch (err) {
        console.error('Failed to enable realtime:', err);
        setError(err instanceof Error ? err.message : 'Failed to enable realtime');
        setRealtimeStatus('error');
      } finally {
        setLoading(prev => ({ ...prev, realtime: false }));
      }
    }
  }, [selectedDatabase, selectedCollection, selectedDocumentId, isRealtimeEnabled]);

  // 컬렉션 요약 새로고침
  const refreshCollectionSummary = useCallback(async () => {
    if (!selectedDatabase || !selectedCollection) return;
    
    try {
      const summary = await apiClient.getCollectionSummary(selectedDatabase.name, selectedCollection);
      setCollectionSummary(summary);
      console.log('🔄 Collection summary refreshed');
    } catch (err) {
      console.error('Failed to refresh collection summary:', err);
    }
  }, [selectedDatabase, selectedCollection]);

  // 변경 알림 제거
  const dismissChangeNotification = useCallback((index: number) => {
    setChangeNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 모든 변경 알림 제거
  const dismissAllNotifications = useCallback(() => {
    setChangeNotifications([]);
  }, []);

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

        {/* 실시간 기능 UI 컨트롤 */}
        {selectedCollection && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* 실시간 토글 버튼 */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRealtimeToggle}
                  disabled={loading.realtime}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isRealtimeEnabled 
                      ? 'bg-green-600' 
                      : 'bg-gray-200'
                  } ${loading.realtime ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isRealtimeEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-gray-700">
                  Real-time Updates
                </span>
                {loading.realtime && (
                  <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                )}
              </div>

              {/* 실시간 상태 표시기 */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  realtimeStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                  realtimeStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  realtimeStatus === 'error' ? 'bg-red-500' :
                  'bg-gray-300'
                }`}></div>
                <span className="text-xs text-gray-600 capitalize">
                  {realtimeStatus === 'connected' ? 'Live' :
                   realtimeStatus === 'connecting' ? 'Connecting...' :
                   realtimeStatus === 'error' ? 'Error' :
                   'Offline'}
                </span>
              </div>
            </div>

            {/* 변경 알림 배지 */}
            {changeNotifications.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <button
                    onClick={() => setChangeNotifications([])}
                    className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium hover:bg-blue-100 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 5v14h10m-10-6h10" />
                    </svg>
                    <span>{changeNotifications.length} change{changeNotifications.length > 1 ? 's' : ''}</span>
                  </button>
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            )}
          </div>
        )}
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

          {/* 동적 필드 섹션들 - 모든 섹션 출력하되 최근 3개만 Field 렌더링 */}
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
                  onFieldSelect={handleFieldSelect}
                  onBackNavigation={handleBackNavigation}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 실시간 변경 알림 토스트 */}
      {changeNotifications.slice(-3).map((notification, index) => (
        <div
          key={notification.collectionKey}
          className={`fixed bottom-4 right-4 bg-white border-l-4 ${
            notification.operationType === 'insert' ? 'border-green-500' :
            notification.operationType === 'update' ? 'border-blue-500' :
            notification.operationType === 'delete' ? 'border-red-500' :
            'border-gray-500'
          } rounded-lg shadow-lg p-4 max-w-sm transform transition-all duration-300 ease-in-out z-50`}
          style={{
            bottom: `${16 + index * 80}px`,
            opacity: 1 - (index * 0.1)
          }}
        >
          <div className="flex items-start space-x-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              notification.operationType === 'insert' ? 'bg-green-100 text-green-600' :
              notification.operationType === 'update' ? 'bg-blue-100 text-blue-600' :
              notification.operationType === 'delete' ? 'bg-red-100 text-red-600' :
              'bg-gray-100 text-gray-600'
            }`}>
              {notification.operationType === 'insert' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              ) : notification.operationType === 'update' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              ) : notification.operationType === 'delete' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 capitalize">
                Document {notification.operationType}d
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {notification.collectionKey} • {new Date(notification.timestamp).toLocaleTimeString()}
              </p>
              {notification.documentKey && (
                <p className="text-xs text-gray-400 mt-1 font-mono truncate">
                  ID: {notification.documentKey._id}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setChangeNotifications(prev => 
                  prev.filter(n => n.collectionKey !== notification.collectionKey)
                );
              }}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CollectionExplorer;