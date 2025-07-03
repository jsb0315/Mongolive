import React, { useState, useEffect } from 'react';
import { useChangeStream } from '../../contexts/ChangeStreamContext';
import { useDatabaseContext } from '../../contexts/DatabaseContext';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  onTabChange
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [showContent, setShowContent] = useState<boolean>(true);
  
  // ChangeStream context
  const {
    subscriptions,
    changeNotifications,
    isLoading: changeStreamLoading,
    subscribeToCollection,
    unsubscribeFromCollection,
    clearNotifications,
    isSubscribed,
    getSubscriptionStatus,
    getCurrentCollection,
    hasAnyActiveSubscription
  } = useChangeStream();

  // Database context
  const { selectedDatabase, isConnected: isDatabaseConnected, currentCollection } = useDatabaseContext();

  // Handle realtime toggle
  const handleRealtimeToggle = async () => {
    if (!selectedDatabase || !currentCollection) {
      console.warn('Cannot toggle realtime: No database or collection selected');
      return;
    }

    const subscribed = isSubscribed(selectedDatabase.name, currentCollection);
    
    if (subscribed) {
      unsubscribeFromCollection(selectedDatabase.name, currentCollection);
    } else {
      await subscribeToCollection(selectedDatabase.name, currentCollection);
    }
  };

  // Get current subscription status
  const currentStatus = selectedDatabase && currentCollection 
    ? getSubscriptionStatus(selectedDatabase.name, currentCollection)
    : 'disconnected';

  const isCurrentlySubscribed = selectedDatabase && currentCollection 
    ? isSubscribed(selectedDatabase.name, currentCollection)
    : false;

  const menuItems = [
    { id: 'collections', label: 'Collection Explorer I', icon: '📊' },
    { id: 'collections2', label: 'Collection Explorer II', icon: '📊' },
    { id: 'playGround', label: 'playGround', icon: '👟' },
    { id: 'changestream', label: 'Change Stream', icon: '🔄' },
    { id: 'query', label: 'Query Executor', icon: '⚡' },
    { id: 'clients', label: 'Connected Clients', icon: '👥' },
    { id: 'performance', label: 'Performance', icon: '📈' },
    { id: 'auth', label: 'Authentication', icon: '🔐' },
  ];

  // 윈도우 크기 변화 감지
  useEffect(() => {
    const handleResize = () => {
      const windowWidth = window.innerWidth;
      if (windowWidth <= 1200) {
        setIsCollapsed(true);
        setShowContent(false);
      } else {
        setIsCollapsed(false);
        setTimeout(() => {
          setShowContent(true);
        }, 200);
      }
    };

    // 초기 로드 시에도 체크
    handleResize();

    // 리사이즈 이벤트 리스너 추가
    window.addEventListener('resize', handleResize);

    // 클린업
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleToggle = () => {
    if (!isCollapsed) {
      // 접힐 때: 즉시 콘텐츠 숨기기
      setShowContent(false);
      setIsCollapsed(true);
    } else {
      // 펼쳐질 때: 먼저 펼치고 0.2초 후 콘텐츠 보이기
      setIsCollapsed(false);
      setTimeout(() => {
        setShowContent(true);
      }, 200);
    }
  };

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} flex flex-col bg-white shadow-lg border-r border-gray-200 transition-all duration-300 ease-in-out`}>
      {/* Header */}
      <div className="p-6 py-4 border-b border-gray-200 relative">
        <div className="flex items-center space-x-3">
          {showContent ? <div className={`w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0`}>
            <span className="text-white font-bold text-sm">M</span>
          </div> : <div className="w-8 h-[48px] flex items-center justify-center flex-shrink-0"/>}
          
          {showContent && !isCollapsed && (
            <div className="transition-opacity duration-300 ease-in-out">
              <h1 className="text-lg font-bold text-gray-900">MongoDB</h1>
              <p className="text-sm text-gray-500">Admin Dashboard</p>
            </div>
          )}
        </div>
        
        {/* Toggle Button */}
        <button
          onClick={handleToggle}
          className="absolute top-4 right-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
              isCollapsed ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      <div className={`flex flex-col overflow-y-scroll`}>  
      {/* Navigation */}
      <nav className="mt-6">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center px-4' : 'space-x-3 px-6'
            } py-3 text-left transition-all duration-200 ${
              activeTab === item.id
                ? 'bg-green-50 text-green-700 border-r-2 border-green-500'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            title={isCollapsed ? item.label : ''}
          >
            <span className="text-lg flex-shrink-0">{item.icon}</span>
            {showContent && !isCollapsed && (
              <span className="font-medium transition-opacity duration-300 ease-in-out">
                {item.label}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Realtime Controls Section */}
      {showContent && !isCollapsed && currentCollection && isDatabaseConnected && (
        <div className="mt-6 mb-4 mx-4 border-t border-gray-200 pt-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Real-time</h3>
            <div className="text-xs text-gray-500 mb-3">
              Collection: <span className="font-medium">{currentCollection}</span>
            </div>
          </div>

          {/* Realtime Toggle */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">Live Updates</span>
            <button
              onClick={handleRealtimeToggle}
              disabled={changeStreamLoading}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                isCurrentlySubscribed ? 'bg-green-600' : 'bg-gray-200'
              } ${changeStreamLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isCurrentlySubscribed ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Status Display */}
          <div className={`flex items-center space-x-2 px-2 py-1 rounded-md text-xs ${
            currentStatus === 'connected' ? 'bg-green-100' :
            currentStatus === 'connecting' ? 'bg-yellow-100' :
            currentStatus === 'error' ? 'bg-red-100' :
            'bg-gray-100'
          }`}>
            <span>
              {currentStatus === 'connected' ? '✅' :
               currentStatus === 'connecting' ? '🔄' :
               currentStatus === 'error' ? '❌' :
               '⚪'}
            </span>
            <span className={
              currentStatus === 'connected' ? 'text-green-600' :
              currentStatus === 'connecting' ? 'text-yellow-600' :
              currentStatus === 'error' ? 'text-red-600' :
              'text-gray-600'
            }>
              {currentStatus === 'connected' ? 'Live' :
               currentStatus === 'connecting' ? 'Connecting...' :
               currentStatus === 'error' ? 'Error' :
               'Offline'}
            </span>
          </div>

          {/* Notifications */}
          {changeNotifications.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">
                  Changes ({changeNotifications.length})
                </span>
                <button
                  onClick={clearNotifications}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                  {changeNotifications.slice(0, 3).map((notification, index) => (
                    <div key={index} className="text-xs p-2 bg-blue-50 rounded border-l-2 border-blue-400">
                      <span className="font-medium text-blue-700">
                        {notification.operationType}
                      </span>
                      {notification.documentKey?._id && notification.updatedPaths?.length && (
                        <div>
                          <div className="text-blue-600 truncate">
                            ID: {String(notification.documentKey._id).slice(-8)}
                          </div>
                          <div className="text-blue-600 truncate">
                            {notification.timestamp}
                          </div>
                          <div className="flex text-slate-600 flex-wrap bg-white rounded-md p-2">
                            <div className="flex">
                              {notification.collectionKey}.
                            </div>
                            <div className="w-16 truncate">
                              {notification.documentKey._id}
                            </div>
                            <div className="flex ">
                              . {notification.updatedPaths[index]?.path}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                {changeNotifications.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{changeNotifications.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      {/* Collapsed Realtime Indicator */}
      {isCollapsed && currentCollection && isCurrentlySubscribed && isDatabaseConnected && (
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2">
          <div className={`w-3 h-3 rounded-full ${
            currentStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
            currentStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
          }`} title={`Real-time: ${currentStatus}`}></div>
        </div>
      )}

      {/* Collapsed state indicator */}
      {isCollapsed && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;