import { useState, useEffect, useRef, useCallback } from 'react';

// Types for WebSocket messages
export interface SignalingMessage {
  type: string;
  fromId?: string;
  targetId?: string;
  senderId?: string;
  userId?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  isMuted?: boolean;
  participants?: any[];
  [key: string]: any;
}

export interface UseSignalingReturn {
  isConnected: boolean;
  sendSignal: (message: SignalingMessage) => void;
  setOnMessage: (handler: (msg: SignalingMessage) => void) => void;
}

/**
 * WebSocket implementation for real-time updates (mobile)
 */
export function useSignaling(roomId: string, userId: string): UseSignalingReturn {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messageHandlerRef = useRef<((msg: SignalingMessage) => void) | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!roomId || !userId) {
      console.log('[WebSocket] Missing roomId or userId, skipping connection');
      return;
    }

    // Get WebSocket URL from API base URL
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';
    const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    
    // Extract base URL
    let baseUrl = apiUrl.replace(/\/api$/, '');
    if (!baseUrl.match(/^https?:\/\//)) {
      baseUrl = `http://${baseUrl}`;
    }
    const wsHost = baseUrl.replace(/^https?:\/\//, '');
    
    const wsUrl = `${wsProtocol}://${wsHost}/api/ws?roomId=${roomId}&userId=${userId}`;

    console.log('[WebSocket] Connecting to:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] ✅ Connected to room:', roomId);
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          let messageData: any;
          
          if (typeof event.data === 'string') {
            try {
              messageData = JSON.parse(event.data);
            } catch (parseError) {
              console.warn('[WebSocket] Received non-JSON string message:', event.data);
              messageData = { type: 'text', content: event.data };
            }
          } else {
            console.warn('[WebSocket] Received unknown data type:', typeof event.data);
            return;
          }
          
          handleMessage(messageData);
        } catch (error) {
          console.error('[WebSocket] Failed to process message:', error);
        }
      };
      
      const handleMessage = (message: SignalingMessage) => {
        console.log('[WebSocket] 📨 Received message:', message.type);
        
        if (messageHandlerRef.current) {
          messageHandlerRef.current(message);
        } else {
          console.warn('[WebSocket] ⚠️ No message handler registered!');
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean,
        });
        
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect
        if (event.code !== 1000 && 
            event.code !== 1008 && 
            !(event.code === 1001 && event.wasClean) &&
            reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            if (roomId && userId) {
              connect();
            }
          }, delay);
        }
      };
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
      setIsConnected(false);
    }
  }, [roomId, userId]);

  // Connect when roomId or userId changes
  useEffect(() => {
    if (roomId && userId) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
      setIsConnected(false);
    };
  }, [roomId, userId, connect]);

  const sendSignal = useCallback((message: SignalingMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        console.log('[WebSocket] Sent message:', message.type);
      } catch (error) {
        console.error('[WebSocket] Failed to send message:', error);
      }
    } else {
      console.warn('[WebSocket] Cannot send message - not connected');
    }
  }, []);

  const setOnMessage = useCallback((handler: (msg: SignalingMessage) => void) => {
    messageHandlerRef.current = handler;
    console.log('[WebSocket] Message handler registered');
  }, []);

  return {
    isConnected,
    sendSignal,
    setOnMessage,
  };
}
