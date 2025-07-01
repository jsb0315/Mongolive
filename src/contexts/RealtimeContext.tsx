import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { 
  apiClient, 
  APIClient,
  ChangeStreamEvent, 
  RealtimeSubscriptionOptions, 
  RealtimeEventHandlers 
} from '../utils/apiClient';

export interface RealtimeContextValue {
  // State
  isRealtimeEnabled: boolean;
  realtimeStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  isLoading: boolean;
  changeNotifications: ChangeStreamEvent[];
  lastChangeEvent: ChangeStreamEvent | null;
  
  // Actions
  enableRealtime: (dbName: string, collectionName: string, onDataRefresh?: () => void) => Promise<void>;
  disableRealtime: () => void;
  clearNotifications: () => void;
  
  // Current subscription info
  currentSubscription: { dbName: string; collectionName: string } | null;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

export const useRealtime = (): RealtimeContextValue => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

interface RealtimeProviderProps {
  children: ReactNode;
  maxNotifications?: number;
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({ 
  children, 
  maxNotifications = 10 
}) => {
  // State
  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState<boolean>(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [changeNotifications, setChangeNotifications] = useState<ChangeStreamEvent[]>([]);
  const [lastChangeEvent, setLastChangeEvent] = useState<ChangeStreamEvent | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<{ dbName: string; collectionName: string } | null>(null);

  // Refs for managing subscriptions
  const activeSubscriptionRef = useRef<string | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onDataRefreshRef = useRef<(() => void) | undefined>(undefined);

  const clearNotifications = useCallback(() => {
    setChangeNotifications([]);
    setLastChangeEvent(null);
  }, []);

  const disableRealtime = useCallback(() => {
    if (activeSubscriptionRef.current && currentSubscription) {
      const { dbName, collectionName } = currentSubscription;
      apiClient.unsubscribeFromCollection(dbName, collectionName);
      activeSubscriptionRef.current = null;
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    setIsRealtimeEnabled(false);
    setRealtimeStatus('disconnected');
    setCurrentSubscription(null);
    onDataRefreshRef.current = undefined;
    
    console.log('🔴 Realtime disabled');
  }, [currentSubscription]);

  const enableRealtime = useCallback(async (
    dbName: string, 
    collectionName: string, 
    onDataRefresh?: () => void
  ) => {
    // Disable existing subscription if any
    if (isRealtimeEnabled) {
      disableRealtime();
    }

    try {
      setIsLoading(true);
      setRealtimeStatus('connecting');
      onDataRefreshRef.current = onDataRefresh;

      const subscriptionOptions: RealtimeSubscriptionOptions = {
        dbName,
        collectionName,
        query: '{}',
        limit: 1000
      };

      const eventHandlers: RealtimeEventHandlers = {
        onData: (data) => {
          console.log('📡 Initial realtime data received:', data);
          if (data.type === 'initial' && data.data) {
            console.log('Initial collection data loaded via realtime');
          }
        },
        onChange: (change: ChangeStreamEvent) => {
          console.log('🔄 Change event received:', change);
          setLastChangeEvent(change);
          
          // Add notification
          setChangeNotifications(prev => {
            const newNotifications = [change, ...prev].slice(0, maxNotifications);
            return newNotifications;
          });

          // Call data refresh callback if provided
          if (onDataRefreshRef.current) {
            onDataRefreshRef.current();
          }
        },
        onError: (error: Error) => {
          console.error('❌ Realtime error:', error);
          setRealtimeStatus('error');
          
          // Auto-retry
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          retryTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Attempting to reconnect realtime...');
            enableRealtime(dbName, collectionName, onDataRefresh);
          }, 5000);
        },
        onSubscribed: (info) => {
          console.log('✅ Realtime subscribed successfully:', info);
          setRealtimeStatus('connected');
          setIsRealtimeEnabled(true);
          setCurrentSubscription({ dbName, collectionName });
          activeSubscriptionRef.current = `${dbName}.${collectionName}`;
        },
        onUnsubscribed: (info) => {
          console.log('🔌 Realtime unsubscribed:', info);
          setRealtimeStatus('disconnected');
          setIsRealtimeEnabled(false);
          setCurrentSubscription(null);
          activeSubscriptionRef.current = null;
        }
      };

      await apiClient.subscribeToCollection(
        subscriptionOptions,
        eventHandlers
      );

    } catch (error) {
      console.error('Failed to enable realtime:', error);
      setRealtimeStatus('error');
      setIsRealtimeEnabled(false);
    } finally {
      setIsLoading(false);
    }
  }, [isRealtimeEnabled, disableRealtime, maxNotifications]);

  const contextValue: RealtimeContextValue = {
    // State
    isRealtimeEnabled,
    realtimeStatus,
    isLoading,
    changeNotifications,
    lastChangeEvent,
    currentSubscription,
    
    // Actions
    enableRealtime,
    disableRealtime,
    clearNotifications
  };

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
};

export default RealtimeProvider;
