import React from 'react';
import { ChangeStreamEvent } from '../../utils/apiClient';

export interface RealtimeControlProps {
  /** Whether real-time updates are currently enabled */
  isEnabled: boolean;
  /** Current connection status */
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  /** Whether the real-time toggle is currently loading */
  isLoading?: boolean;
  /** Callback to toggle real-time functionality */
  onToggle: () => void;
  /** Recent change notifications */
  notifications?: ChangeStreamEvent[];
  /** Maximum number of notifications to display */
  maxNotifications?: number;
  /** Whether to show the component in compact mode (for sidebar) */
  compact?: boolean;
  /** Whether to show notification badge */
  showNotificationBadge?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const RealtimeControl: React.FC<RealtimeControlProps> = ({
  isEnabled,
  status,
  isLoading = false,
  onToggle,
  notifications = [],
  maxNotifications = 5,
  compact = false,
  showNotificationBadge = true,
  className = ''
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Live';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Error';
      default:
        return 'Offline';
    }
  };

  const recentNotifications = notifications.slice(0, maxNotifications);
  const unreadCount = recentNotifications.length;

  if (compact) {
    return (
      <div className={`flex flex-col items-center space-y-2 ${className}`}>
        {/* Compact Toggle Button */}
        <button
          onClick={onToggle}
          disabled={isLoading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isEnabled 
              ? 'bg-green-600' 
              : 'bg-gray-200'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          title="Toggle Real-time Updates"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
          {showNotificationBadge && unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Status Indicator */}
        <div className="flex flex-col items-center space-y-1">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${
            status === 'connected' || status === 'connecting' ? 'animate-pulse' : ''
          }`}></div>
          <span className="text-xs text-gray-600 text-center">
            {getStatusText()}
          </span>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
        )}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Real-time Toggle Button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggle}
              disabled={isLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isEnabled 
                  ? 'bg-green-600' 
                  : 'bg-gray-200'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
              {showNotificationBadge && unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <span className="text-sm font-medium text-gray-700">
              Real-time Updates
            </span>
            {isLoading && (
              <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
            )}
          </div>

          {/* Status Indicator */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${
              status === 'connected' || status === 'connecting' ? 'animate-pulse' : ''
            }`}></div>
            <span className="text-xs text-gray-600 capitalize">
              {getStatusText()}
            </span>
          </div>
        </div>
      </div>

      {/* Notification List (for expanded mode) */}
      {!compact && recentNotifications.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <h4 className="text-xs font-medium text-gray-500 mb-2">Recent Changes</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {recentNotifications.map((notification, index) => (
              <div key={index} className="text-xs p-2 bg-blue-50 rounded border-l-2 border-blue-300">
                <span className="font-medium capitalize">{notification.operationType}</span>
                {notification.documentKey && (
                  <span className="ml-2 text-gray-600">
                    ID: {String(notification.documentKey._id).substring(0, 8)}...
                  </span>
                )}
                <div className="text-gray-500">
                  {new Date(notification.timestamp || Date.now()).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RealtimeControl;
