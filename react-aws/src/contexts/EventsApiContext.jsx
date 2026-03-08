import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import amplifyconfig from '../amplify_outputs.json';

const EventsApiContext = createContext();

export const useEventsApi = () => {
  const context = useContext(EventsApiContext);
  if (!context) {
    throw new Error('useEventsApi must be used within an EventsApiProvider');
  }
  return context;
};

export const EventsApiProvider = ({ children }) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  
  // Single WebSocket connection and subscription manager
  const eventsClientRef = useRef(null);
  const subscriptionsRef = useRef(new Map()); // Track all subscriptions
  const eventHandlersRef = useRef(new Map()); // Track event handlers by channel

  useEffect(() => {
    let mounted = true;

    const initializeConnection = async () => {
      try {
        setConnectionStatus('connecting');
        setError(null);
        
        console.log('🔌 Initializing single WebSocket connection...');
        
        // Wait for authentication to be ready
        const session = await fetchAuthSession();
        if (!session.tokens?.accessToken) {
          console.log('⏳ Waiting for authentication...');
          setTimeout(initializeConnection, 1000);
          return;
        }
        
        console.log('🔌 Authentication ready, creating single Events API client');
        
        // Create single Events API client
        const eventsApiConfig = amplifyconfig.custom?.eventsApi;
        if (!eventsApiConfig) {
          throw new Error('Events API configuration not found');
        }

        // Events API client removed - this context is deprecated
        console.warn('⚠️ EventsApiContext is deprecated - use GraphQL subscriptions instead');
        
        // Return mock client to prevent errors
        const mockClient = {
          connect: () => Promise.resolve(),
          disconnect: () => Promise.resolve(),
          subscribe: () => ({ unsubscribe: () => {} }),
          publish: () => Promise.resolve()
        };
        eventsClientRef.current = mockClient;
        
        if (mounted) {
          setConnectionStatus('connected');
          console.log('✅ Mock EventsApi connection (deprecated)');
        }
      } catch (err) {
        console.error('❌ Connection initialization failed:', err);
        if (mounted) {
          setConnectionStatus('failed');
          setError(err.message || 'Connection failed');
        }
      }
    };

    // Delay initial check to ensure authentication is ready
    const timer = setTimeout(initializeConnection, 500);

    return () => {
      mounted = false;
      clearTimeout(timer);
      
      // Cleanup all subscriptions and connection
      if (eventsClientRef.current) {
        subscriptionsRef.current.forEach((subscription) => {
          try {
            subscription.unsubscribe();
          } catch (e) {
            console.error('Error unsubscribing:', e);
          }
        });
        subscriptionsRef.current.clear();
        eventHandlersRef.current.clear();
        eventsClientRef.current.disconnect();
      }
    };
  }, []);

  // Subscribe to a channel (multiple subscriptions on single WebSocket)
  const subscribe = useCallback(async (channelPath, handlers) => {
    if (!eventsClientRef.current) {
      throw new Error('Events API client not initialized');
    }

    console.log('📡 Adding subscription to channel:', channelPath);

    try {
      // Create subscription on the existing WebSocket connection
      const subscription = await eventsClientRef.current.subscribe(channelPath, {
        next: (eventData) => {
          console.log(`📨 Event received on ${channelPath}:`, eventData);
          
          // Forward to component handler
          if (handlers.next) {
            handlers.next(eventData);
          }
          
          // Also store in event handlers map for sharing
          eventHandlersRef.current.set(channelPath, eventData);
        },
        error: (error) => {
          console.error(`❌ Subscription error on ${channelPath}:`, error);
          if (handlers.error) {
            handlers.error(error);
          }
        }
      });

      // Track the subscription
      subscriptionsRef.current.set(channelPath, subscription);
      console.log(`✅ Subscription added for ${channelPath}`);

      // Return unsubscribe function
      return {
        unsubscribe: () => {
          console.log(`🔌 Unsubscribing from ${channelPath}`);
          subscription.unsubscribe();
          subscriptionsRef.current.delete(channelPath);
          eventHandlersRef.current.delete(channelPath);
        }
      };
    } catch (err) {
      console.error(`❌ Failed to subscribe to ${channelPath}:`, err);
      throw err;
    }
  }, []);

  // Publish to a channel
  const publish = useCallback(async (channelPath, eventData) => {
    if (!eventsClientRef.current) {
      throw new Error('Events API client not initialized');
    }

    try {
      console.log('📤 Publishing to channel:', channelPath, eventData);
      await eventsClientRef.current.publish(channelPath, eventData);
      console.log('✅ Event published successfully');
    } catch (err) {
      console.error('❌ Failed to publish event:', err);
      throw err;
    }
  }, []);

  // Get last event for a specific channel (for sharing data)
  const getLastEvent = useCallback((channelPath) => {
    return eventHandlersRef.current.get(channelPath);
  }, []);

  // Get all active subscriptions (for debugging)
  const getActiveSubscriptions = useCallback(() => {
    return Array.from(subscriptionsRef.current.keys());
  }, []);

  const value = {
    connectionStatus,
    error,
    isConnected: connectionStatus === 'connected',
    subscribe,
    publish,
    getLastEvent,
    getActiveSubscriptions
  };

  return (
    <EventsApiContext.Provider value={value}>
      {children}
    </EventsApiContext.Provider>
  );
};