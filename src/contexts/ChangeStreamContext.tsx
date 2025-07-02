
import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { 
  apiClient, 
  APIClient,
  ChangeStreamEvent, 
  RealtimeSubscriptionOptions, 
  RealtimeEventHandlers 
} from '../utils/apiClient';

export interface ChangeStreamSubscription {
  dbName: string;
  collectionName: string;
  subscriptionKey: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
}

export interface ChangeStreamContextValue {
  // State
  subscriptions: ChangeStreamSubscription[];
  changeNotifications: ChangeStreamEvent[];
  lastChangeEvent: ChangeStreamEvent | null;
  isLoading: boolean;
  
  // Actions
  subscribeToCollection: (dbName: string, collectionName: string, onDataRefresh?: () => void) => Promise<void>;
  unsubscribeFromCollection: (dbName: string, collectionName: string) => void;
  clearNotifications: () => void;
  isSubscribed: (dbName: string, collectionName: string) => boolean;
  getSubscriptionStatus: (dbName: string, collectionName: string) => string;
  
  // Current active subscription info
  getCurrentSubscription: (dbName: string, collectionName: string) => ChangeStreamSubscription | null;
  getCurrentCollection: () => string | null;
  hasAnyActiveSubscription: () => boolean;
}

const ChangeStreamContext = createContext<ChangeStreamContextValue | undefined>(undefined);

export const useChangeStream = (): ChangeStreamContextValue => {
  const context = useContext(ChangeStreamContext);
  if (!context) {
    throw new Error('useChangeStream must be used within a ChangeStreamProvider');
  }
  return context;
};

interface ChangeStreamProviderProps {
  children: ReactNode;
  maxNotifications?: number;
}

export const ChangeStreamProvider: React.FC<ChangeStreamProviderProps> = ({ 
  children, 
  maxNotifications = 10 
}) => {
  // State
  const [subscriptions, setSubscriptions] = useState<ChangeStreamSubscription[]>([]);
  const [changeNotifications, setChangeNotifications] = useState<ChangeStreamEvent[]>([]);
  const [lastChangeEvent, setLastChangeEvent] = useState<ChangeStreamEvent | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Refs for managing subscriptions and callbacks
  const activeSubscriptionsRef = useRef<Map<string, string>>(new Map());
  const retryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const dataRefreshCallbacksRef = useRef<Map<string, () => void>>(new Map());

  const clearNotifications = useCallback(() => {
    setChangeNotifications([]);
    setLastChangeEvent(null);
  }, []);

  const isSubscribed = useCallback((dbName: string, collectionName: string): boolean => {
    const key = `${dbName}.${collectionName}`;
    return subscriptions.some(sub => sub.subscriptionKey === key && sub.status === 'connected');
  }, [subscriptions]);

  const getSubscriptionStatus = useCallback((dbName: string, collectionName: string): string => {
    const key = `${dbName}.${collectionName}`;
    const subscription = subscriptions.find(sub => sub.subscriptionKey === key);
    return subscription?.status || 'disconnected';
  }, [subscriptions]);

  const getCurrentSubscription = useCallback((dbName: string, collectionName: string): ChangeStreamSubscription | null => {
    const key = `${dbName}.${collectionName}`;
    return subscriptions.find(sub => sub.subscriptionKey === key) || null;
  }, [subscriptions]);

  const getCurrentCollection = useCallback((): string | null => {
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'connected' || sub.status === 'connecting');
    return activeSubscriptions.length > 0 ? activeSubscriptions[0].collectionName : null;
  }, [subscriptions]);

  const hasAnyActiveSubscription = useCallback((): boolean => {
    return subscriptions.some(sub => sub.status === 'connected' || sub.status === 'connecting');
  }, [subscriptions]);

  const unsubscribeFromCollection = useCallback((dbName: string, collectionName: string) => {
    const key = `${dbName}.${collectionName}`;
    
    // API 구독 해제
    if (activeSubscriptionsRef.current.has(key)) {
      apiClient.unsubscribeFromCollection(dbName, collectionName);
      activeSubscriptionsRef.current.delete(key);
    }
    
    // 재시도 타이머 정리
    if (retryTimeoutsRef.current.has(key)) {
      clearTimeout(retryTimeoutsRef.current.get(key)!);
      retryTimeoutsRef.current.delete(key);
    }

    // 콜백 정리
    dataRefreshCallbacksRef.current.delete(key);

    // 구독 상태 업데이트
    setSubscriptions(prev => prev.filter(sub => sub.subscriptionKey !== key));
    
    console.log('🔴 ChangeStream unsubscribed:', key);
  }, []);

  const subscribeToCollection = useCallback(async (
    dbName: string, 
    collectionName: string, 
    onDataRefresh?: () => void
  ) => {
    const key = `${dbName}.${collectionName}`;
    
    // 이미 구독 중인 경우 해제
    if (isSubscribed(dbName, collectionName)) {
      unsubscribeFromCollection(dbName, collectionName);
    }

    try {
      setIsLoading(true);
      
      // 구독 상태 추가
      setSubscriptions(prev => {
        const filtered = prev.filter(sub => sub.subscriptionKey !== key);
        return [...filtered, {
          dbName,
          collectionName,
          subscriptionKey: key,
          status: 'connecting'
        }];
      });

      // 데이터 새로고침 콜백 저장
      if (onDataRefresh) {
        dataRefreshCallbacksRef.current.set(key, onDataRefresh);
      }

      const subscriptionOptions: RealtimeSubscriptionOptions = {
        dbName,
        collectionName,
        query: '{}',
        limit: 1000
      };

      const eventHandlers: RealtimeEventHandlers = {
        onData: (data) => {
          console.log('📡 Initial changestream data received:', data);
          if (data.type === 'initial' && data.data) {
            console.log('Initial collection data loaded via changestream');
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

          // 데이터 새로고침 콜백 실행
          const callback = dataRefreshCallbacksRef.current.get(key);
          if (callback) {
            callback();
          }
        },
        onError: (error: Error) => {
          console.error('❌ ChangeStream error:', error);
          
          // 구독 상태를 에러로 업데이트
          setSubscriptions(prev => 
            prev.map(sub => 
              sub.subscriptionKey === key 
                ? { ...sub, status: 'error' } 
                : sub
            )
          );
          
          // 자동 재연결 시도
          if (retryTimeoutsRef.current.has(key)) {
            clearTimeout(retryTimeoutsRef.current.get(key)!);
          }
          const timeout = setTimeout(() => {
            console.log('🔄 Attempting to reconnect changestream...');
            subscribeToCollection(dbName, collectionName, onDataRefresh);
          }, 5000);
          retryTimeoutsRef.current.set(key, timeout);
        },
        onSubscribed: (info) => {
          console.log('✅ ChangeStream subscribed successfully:', info);
          setSubscriptions(prev => 
            prev.map(sub => 
              sub.subscriptionKey === key 
                ? { ...sub, status: 'connected' } 
                : sub
            )
          );
          activeSubscriptionsRef.current.set(key, key);
        },
        onUnsubscribed: (info) => {
          console.log('🔌 ChangeStream unsubscribed:', info);
          setSubscriptions(prev => 
            prev.map(sub => 
              sub.subscriptionKey === key 
                ? { ...sub, status: 'disconnected' } 
                : sub
            )
          );
          activeSubscriptionsRef.current.delete(key);
        }
      };

      await apiClient.subscribeToCollection(subscriptionOptions, eventHandlers);

    } catch (error) {
      console.error('Failed to subscribe to changestream:', error);
      setSubscriptions(prev => 
        prev.map(sub => 
          sub.subscriptionKey === key 
            ? { ...sub, status: 'error' } 
            : sub
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [isSubscribed, unsubscribeFromCollection, maxNotifications]);

  const contextValue: ChangeStreamContextValue = {
    // State
    subscriptions,
    changeNotifications,
    lastChangeEvent,
    isLoading,
    
    // Actions
    subscribeToCollection,
    unsubscribeFromCollection,
    clearNotifications,
    isSubscribed,
    getSubscriptionStatus,
    getCurrentSubscription,
    getCurrentCollection,
    hasAnyActiveSubscription
  };

  return (
    <ChangeStreamContext.Provider value={contextValue}>
      {children}
    </ChangeStreamContext.Provider>
  );
};

export default ChangeStreamProvider;
