import React, { useState, useEffect } from 'react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [showContent, setShowContent] = useState<boolean>(true);

  const menuItems = [
    { id: 'collections', label: 'Collection Explorer I', icon: '📊' },
    { id: 'collections2', label: 'Collection Explorer II', icon: '📊' },
    { id: 'changestream', label: 'Change Stream', icon: '🔄' },
    { id: 'query', label: 'Query Executor', icon: '⚡' },
    { id: 'clients', label: 'Connected Clients', icon: '👥' },
    { id: 'performance', label: 'Performance', icon: '📈' },
    { id: 'auth', label: 'Authentication', icon: '🔐' },
  ];

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

  useEffect(() => {
    // 초기 상태에서는 콘텐츠가 보이도록 설정
    if (!isCollapsed) {
      setShowContent(true);
    }
  }, []);

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white shadow-lg border-r border-gray-200 transition-all duration-300 ease-in-out`}>
      {/* Header */}
      <div className="p-6 py-3 border-b border-gray-200 relative">
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