import React, { useState, useEffect, useRef } from 'react';

interface DataItem {
  key: string;
  value: any;
  type: 'primitive' | 'object' | 'array';
  hasChildren: boolean;
  path: string[];
}

interface Section {
  id: string;
  data: DataItem[];
  title: string;
  path: string[];
  isEmpty: boolean;
  isTmp: boolean;
}

interface NavigationState {
  currentData: any;
  path: string[];
  title: string;
  parentData?: any[];
}

interface JsonExplorerProps {
  data: any;
}

const JsonExplorer: React.FC<JsonExplorerProps> = ({ data }) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [transitionAllowed, setTransitionAllowed] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'forward' | 'backward' | null>(null);
  const [navigationStack, setNavigationStack] = useState<NavigationState[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // 데이터를 DataItem 배열로 변환
  const parseData = (obj: any, currentPath: string[] = []): DataItem[] => {
    if (!obj || typeof obj !== 'object') return [];

    return Object.entries(obj).map(([key, value]) => {
      const type = Array.isArray(value) ? 'array' : typeof value === 'object' && value !== null ? 'object' : 'primitive';
      const hasChildren = (
        (type === 'object') ||
        (type === 'array' && Array.isArray(value) && value.length > 0 && typeof value[0] === 'object')
      );
      const path = [...currentPath, key];

      return {
        key,
        value,
        type,
        hasChildren,
        path
      };
    });
  };

  // 초기 섹션들 생성: TMP1|[N|N+1|N+2]|TMP2
  useEffect(() => {
    const initialData = parseData(data);
    const initialSections: Section[] = [
      {
        id: 'TMP1',
        data: [],
        title: 'TMP1',
        path: [],
        isEmpty: true,
        isTmp: true
      },
      {
        id: 'N',
        data: initialData,
        title: 'Root',
        path: [],
        isEmpty: false,
        isTmp: false
      },
      {
        id: 'N+1',
        data: [],
        title: 'Select a key',
        path: [],
        isEmpty: true,
        isTmp: false
      },
      {
        id: 'N+2',
        data: [],
        title: 'Select a key',
        path: [],
        isEmpty: true,
        isTmp: false
      },
      {
        id: 'TMP2',
        data: [],
        title: 'TMP2',
        path: [],
        isEmpty: true,
        isTmp: true
      }
    ];

    setSections(initialSections);
    setNavigationStack([{
      currentData: data,
      path: [],
      title: 'Root'
    }]);
  }, [data]);

  // 값 표시 형식화
  const formatValue = (item: DataItem): string => {
    if (item.type === 'primitive') {
      const str = String(item.value);
      return str.length > 30 ? str.substring(0, 30) + '...' : str;
    } else if (item.type === 'array') {
      return `Array(${item.value.length})`;
    } else {
      const keys = Object.keys(item.value || {});
      return `Object(${keys.length})`;
    }
  };

  // 섹션 업데이트
  const updateSection = (sectionId: string, newData: DataItem[], title: string, path: string[]) => {
    setSections(prevSections =>
      prevSections.map(section =>
        section.id === sectionId
          ? { ...section, data: newData, title, path, isEmpty: newData.length === 0 }
          : section
      )
    );
  };

  // 섹션 비우기
  const clearSection = (sectionId: string, title: string = 'Select a key') => {
    setSections(prevSections =>
      prevSections.map(section =>
        section.id === sectionId
          ? { ...section, data: [], title, path: [], isEmpty: true }
          : section
      )
    );
  };

  // Forward 애니메이션 (N+2 섹션 클릭)
  const handleForwardAnimation = (item: DataItem) => {
    const newData = parseData(item.value, item.path);
    setIsAnimating(true);
    setAnimationDirection('forward');

    // 1. TMP2에 새 데이터 렌더링
    updateSection('TMP2', newData, item.key, item.path);

    // 2. 네비게이션 스택에 새 상태 추가
    setNavigationStack(prev => [...prev, {
      currentData: item.value,
      path: item.path,
      title: item.key
    }]);

    // *뷰포트: [ ]
    // 3-1. 섹션 전체 Div 이동: TMP1|[N|N+1|N+2]|TMP2 → TMP1|N|[N+1|N+2|TMP2]
    if (containerRef.current) {
      containerRef.current.style.transform = 'translateX(20%)';
    }
    // 3-2. 섹션 순서 물리적 변경: TMP1|N|[N+1|N+2|TMP2] → N|N+1|[N+2|TMP2|TMP1]
    setSections(prevSections => {
      const newSections = [...prevSections];
      const tmp1 = newSections.shift()!;
      newSections.push(tmp1);
      return newSections;
    });

    setTimeout(() => {
      setTransitionAllowed(true);
      // 4. Transform 초기화: N|N+1|[N+2|TMP2|TMP1] → N|[N+1|N+2|TMP2]|TMP1
      if (containerRef.current) {
        containerRef.current.style.transform = 'translateX(0)';
      }

      setTimeout(() => {

        // 5. 섹션 재배치 및 데이터 매핑
        setSections(prevSections => {
          const reorderedSections = [...prevSections];  // 순서 정렬 후 매핑
          const tmp1 = reorderedSections.pop()!;  // 마지막 요소를 맨 앞으로
          reorderedSections.unshift(tmp1);  // TMP1|[N|N+1|N+2]|TMP2

          // TMP1|[N|N+1|N+2]|TMP2 = N|[N+1|N+2|TMP2]|TMP1
          return reorderedSections.map((section, index) => {
            if (section.id === 'N') {
              const nPlus1Data = prevSections.find(s => s.id === 'N+1')!;
              return { ...section, ...nPlus1Data, id: 'N', isTmp: false };
            } else if (section.id === 'N+1') {
              const nPlus2Data = prevSections.find(s => s.id === 'N+2')!;
              return { ...section, ...nPlus2Data, id: 'N+1', isTmp: false };
            } else if (section.id === 'N+2') {
              const tmp2Data = prevSections.find(s => s.id === 'TMP2')!;
              return { ...section, ...tmp2Data, id: 'N+2', isTmp: false };
            } else if (section.id === 'TMP2') {
              return { ...section, data: [], title: 'TMP2', isEmpty: true };
            }
            return section;
          });
        });

        setIsAnimating(false);
        setTransitionAllowed(false);
        setAnimationDirection(null);
      }, 200);  // 데이터 매핑 지연
    }, 100); // 돌아가기까지
  };

  // Backward 애니메이션 (N 섹션 클릭)
const handleBackwardAnimation = (item: DataItem) => {
    if (navigationStack.length <= 1) return;
    console.log('handleBackwardAnimation', item);
    // item.path의 상위 key를 찾아 newData로 설정
    const parentPath = item.path.slice(0, -2);
    let parentValue = data;
    for (const key of parentPath) {
      if (parentValue && typeof parentValue === 'object') {
      parentValue = parentValue[key];
      } else {
      parentValue = undefined;
      break;
      }
    }
    const newData = parseData(parentValue, parentPath);
    setIsAnimating(true);
    setAnimationDirection('backward');

    // 1. TMP1에 새 데이터 렌더링 이거 함수만들어야함
    updateSection('TMP1', newData, parentValue.key, parentPath);

    // 1. 네비게이션 스택에서 현재 상태 제거
    setNavigationStack(prev => prev.slice(0, -1));

    // *뷰포트: [ ]
    // 2-1. 섹션 Div 전체 이동: TMP1|[N|N+1|N+2]|TMP2 → [TMP1|N|N+1]|N+2|TMP2
    if (containerRef.current) {
      containerRef.current.style.transform = 'translateX(-20%)';
    }
    // 2-2. 섹션 순서 물리적 변경 TMP1|N|[N+1|N+2|TMP2] → TMP2|TMP1|[N|N+1|N+2]
    setSections(prevSections => {
      const newSections = [...prevSections];
      const tmp2 = newSections.pop()!;
      newSections.unshift(tmp2);
      return newSections;
    });

    setTimeout(() => {
      setTransitionAllowed(true);

      // 3. Transform 초기화: TMP2|TMP1|[N|N+1|N+2] → TMP2|[TMP1|N|N+1]|N+2
      if (containerRef.current) {
        containerRef.current.style.transform = 'translateX(0)';
      }

      setTimeout(() => {

        // 4. 섹션 재배치 및 데이터 매핑
        setSections(prevSections => {
          const reorderedSections = [...prevSections];  // 순서 정렬 후 매핑
          const tmp2 = reorderedSections.shift()!;  // 첫번째 요소를 맨 뒤로
          reorderedSections.push(tmp2); // TMP1|[N|N+1|N+2]|TMP2

          // TMP1|[N|N+1|N+2]|TMP2 = TMP2|[TMP1|N|N+1]|N+2
          return reorderedSections.map((section, index) => {
            if (section.id === 'N') {
              const nData = prevSections.find(s => s.id === 'TMP1')!;
              console.log('nData', nData);
              const title = Array.isArray(nData.path) && nData.path.length > 0 ? nData.path[nData.path.length - 1] : 'Root';
              return { ...section, ...nData, id: 'N', isTmp: false, title: title };
            } else if (section.id === 'N+1') {
              const nData = prevSections.find(s => s.id === 'N')!;
              return { ...section, ...nData, id: 'N+1', isTmp: false };
            } else if (section.id === 'N+2') {
              const nPlus1Data = prevSections.find(s => s.id === 'N+1')!;
              return { ...section, ...nPlus1Data, id: 'N+2', isEmpty: true };
            } else if (section.id === 'TMP1') {
              return { ...section, data: [], title: 'TMP2', isEmpty: true };
            }
            return section;
          });
        });

        setIsAnimating(false);
        setTransitionAllowed(false);
        setAnimationDirection(null);
      }, 200);  // 데이터 매핑 지연
    }, 100); // 돌아가기까지
  };

  // 키 클릭 핸들러
  const handleKeyClick = (sectionId: string, item: DataItem) => {
    if (isAnimating) return;

    if (sectionId === 'N') {
      // N 섹션 클릭
      if (item.hasChildren) {
        // 자식이 있으면 N+1에 렌더링
        const newData = parseData(item.value, item.path);
        updateSection('N+1', newData, item.key, item.path);
        if (transitionAllowed) clearSection('N+2');
      } else {
        clearSection('N+1', 'Select a key');
        clearSection('N+2', 'Select a key');
      }
      if (navigationStack.length > 1) {
        // 상위가 있으면 backward
        handleBackwardAnimation(item);
      } else {
        if (transitionAllowed) clearSection('N+2');    
      }

    } else if (sectionId === 'N+1') {
      // N+1 섹션 클릭 → N+2에 데이터 렌더링
      if (item.hasChildren) {
        const newData = parseData(item.value, item.path);
        updateSection('N+2', newData, item.key, item.path);
      }

    } else if (sectionId === 'N+2') {
      // N+2 섹션 클릭 → Forward 애니메이션
      if (item.hasChildren) {
        handleForwardAnimation(item);
      }
    }
  };
  console.log(navigationStack);
  return (
    <div className="w-full h-full bg-gray-100 rounded-lg overflow-hidden relative">
      <div
        ref={containerRef}
        className={`flex h-full ${transitionAllowed && 'transition-transform duration-300 ease-in-out'}`}
        style={{ width: `${sections.length * 20}%` }}
      >
        {sections.map((section, index) => {
          const isViewport = index >= 1 && index <= 3;
          const viewportIndex = isViewport ? index - 1 : -1;

          // Flex 클래스 결정
          let flexClass = 'flex-1';
          if (isViewport) {
            if (viewportIndex === 0) flexClass = 'flex-1';      // N: 1
            else if (viewportIndex === 1) flexClass = 'flex-1'; // N+1: 1  
            else if (viewportIndex === 2) flexClass = 'flex-[2]'; // N+2: 2
          }

          return (
            <div
              key={`${section.id}-${index}`}
              className={`${flexClass} bg-white border-r border-gray-200 last:border-r-0 flex flex-col ${section.isTmp ? 'opacity-30 bg-gray-50' : 'opacity-100'
                }`}
              style={{ width: '20%', minWidth: '20%' }}
            >
              {/* 헤더 */}
              <div className={`p-3 border-b border-gray-200 flex-shrink-0 ${section.isTmp ? 'bg-orange-50' : 'bg-gray-50'
                }`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800 truncate flex-1">
                    {section.title}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${section.isTmp
                    ? 'bg-orange-200 text-orange-700'
                    : 'bg-blue-100 text-blue-600'
                    }`}>
                    {section.id}
                  </span>
                </div>
                {section.path.length > 0 && !section.isTmp && (
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    {section.path.join(' > ')}
                  </div>
                )}
              </div>

              {/* 데이터 리스트 */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {section.isEmpty ? (
                  <div className="p-4 text-center text-gray-400 text-sm">
                    {section.isTmp ? 'Waiting...' : 'Click a key to explore'}
                  </div>
                ) : (
                  <div className="p-2">
                    {section.data.map((item, itemIndex) => (
                      <div
                        key={`${section.id}-${item.key}-${itemIndex}`}
                        onClick={() =>
                          // !section.isTmp && 
                          handleKeyClick(section.id, item)}
                        className={`p-3 mb-2 rounded-md border transition-all duration-200 ${!section.isTmp
                          ? 'cursor-pointer hover:bg-blue-50 hover:border-blue-300 border-gray-200 hover:shadow-sm'
                          : 'cursor-default border-gray-100 bg-gray-50'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {/* 키 이름 */}
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-gray-900 text-sm truncate">
                                {item.key}
                              </span>
                              {!section.isTmp && item.hasChildren && (
                                <svg
                                  className="w-3 h-3 text-gray-400 flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                              )}
                            </div>

                            {/* 타입 배지 */}
                            <div className="mb-2">
                              <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${item.type === 'primitive'
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : item.type === 'array'
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                  : 'bg-purple-100 text-purple-700 border border-purple-200'
                                }`}>
                                {item.type.toUpperCase()}
                              </span>
                              {/* N 섹션에서 상위 데이터 표시 */}
                              {!isAnimating && section.id === 'N' && navigationStack.length > 1 && (
                                <span className="inline-block ml-2 px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
                                  ↑ BACK
                                </span>
                              )}
                            </div>

                            {/* 값 미리보기 */}
                            <div className="text-sm text-gray-600">
                              <div className="truncate" title={formatValue(item)}>
                                {formatValue(item)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 애니메이션 로딩 오버레이 */}
      {/* {isAnimating && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center pointer-events-none">
          <div className="bg-white px-6 py-3 rounded-lg shadow-lg border">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-700 font-medium">
                {animationDirection === 'forward' ? 'Moving Forward...' : 'Moving Backward...'}
              </span>
            </div>
          </div>
        </div>
      )} */}

      {/* 상태 표시 */}
      <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-3 py-2 rounded-lg">
        <div className="mb-1">Structure: {sections.map(s => s.id).join('|')}</div>
        <div className="mb-1">Path: {sections.map(s => s.isTmp).join('|')}</div>
        <div className="mb-1">Depth: {navigationStack.length}</div>
        <div>Animation: {isAnimating ? animationDirection : 'idle'}</div>
      </div>
    </div>
  );
};

export default JsonExplorer;