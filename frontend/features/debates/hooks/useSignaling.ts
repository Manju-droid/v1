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
 * Real WebSocket implementation for debate room real-time updates
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
    // API_BASE_URL is like 'http://localhost:8080/api'
    // WebSocket endpoint is at '/api/ws' (under the /api route)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    
    // Extract base URL (remove /api if present, we'll add it back)
    let baseUrl = apiUrl.replace(/\/api$/, '');
    if (!baseUrl.match(/^https?:\/\//)) {
      baseUrl = `http://${baseUrl}`;
    }
    const wsHost = baseUrl.replace(/^https?:\/\//, '');
    
    // WebSocket is at /api/ws (same route group as other API endpoints)
    const wsUrl = `${wsProtocol}://${wsHost}/api/ws?roomId=${roomId}&userId=${userId}`;

    console.log('[WebSocket] Connecting to:', wsUrl, {
      apiUrl,
      wsProtocol,
      wsHost,
      roomId,
      userId,
    });

    try {
        const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

        ws.onopen = () => {
        console.log('[WebSocket] ✅ Connected to room:', roomId);
            setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        
        // Clear any pending reconnect
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        };

        ws.onmessage = (event) => {
            try {
          // Handle different data types
          let messageData: any;
          
          if (typeof event.data === 'string') {
            // Try to parse as JSON
            try {
              messageData = JSON.parse(event.data);
            } catch (parseError) {
              // If it's not JSON, treat it as a plain string message
              console.warn('[WebSocket] Received non-JSON string message:', event.data);
              // Try to create a message object from the string
              messageData = { type: 'text', content: event.data };
            }
          } else if (event.data instanceof Blob) {
            // Handle Blob data
            event.data.text().then((text: string) => {
              try {
                messageData = JSON.parse(text);
                handleMessage(messageData);
              } catch (parseError) {
                console.warn('[WebSocket] Failed to parse Blob as JSON:', text);
              }
            }).catch((err) => {
              console.error('[WebSocket] Failed to read Blob:', err);
            });
            return; // Exit early for Blob handling
          } else if (event.data instanceof ArrayBuffer) {
            // Handle ArrayBuffer
            const text = new TextDecoder().decode(event.data);
            try {
              messageData = JSON.parse(text);
            } catch (parseError) {
              console.warn('[WebSocket] Failed to parse ArrayBuffer as JSON:', text);
              return;
                }
          } else {
            // Unknown data type
            console.warn('[WebSocket] Received unknown data type:', typeof event.data, event.data);
            return;
          }
          
          handleMessage(messageData);
        } catch (error) {
          console.error('[WebSocket] Failed to process message:', error, {
            dataType: typeof event.data,
            data: event.data,
            dataString: typeof event.data === 'string' ? event.data.substring(0, 200) : 'N/A',
          });
        }
      };
      
      // Helper function to handle parsed messages
      const handleMessage = (message: SignalingMessage) => {
        console.log('[WebSocket] 📨 Received message:', {
          type: message.type,
          hasParticipants: !!message.participants,
          participantCount: message.participants?.length,
        });
        
        // Call registered message handler
        if (messageHandlerRef.current) {
          messageHandlerRef.current(message);
        } else {
          console.warn('[WebSocket] ⚠️ No message handler registered!');
            }
        };

      ws.onerror = (error) => {
        // WebSocket error events are often empty - real details come from onclose
        // Don't log empty error objects - wait for onclose event which has the actual error code
        // This prevents noisy console errors when the error object is just {}
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean,
          url: wsUrl,
        });
        
        // Log specific error codes
        if (event.code === 1006) {
          // 1006 is abnormal closure (network issue, server restart, etc.) - this is normal and will auto-reconnect
          console.warn('[WebSocket] Connection lost (will auto-reconnect):', {
            code: event.code,
            wasClean: event.wasClean,
            reason: event.reason || 'Network issue or server restart',
          });
        } else if (event.code === 1001) {
          console.log('[WebSocket] Going away - server or client is closing');
        } else if (event.code === 1002) {
          console.error('[WebSocket] Protocol error');
        } else if (event.code === 1003) {
          console.error('[WebSocket] Unsupported data type');
        } else if (event.code === 1008) {
          console.error('[WebSocket] Policy violation');
        } else if (event.code === 1009) {
          console.error('[WebSocket] Message too large');
        } else if (event.code === 1011) {
          console.error('[WebSocket] Server error');
        }
        
            setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect if not intentionally closed (code 1000)
        // Also don't reconnect on policy violations (1008) or going away (1001) if it was clean
        // 1006 (abnormal closure) should always attempt to reconnect
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
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.warn('[WebSocket] Max reconnect attempts reached. Connection will retry on next interaction.');
        } else if (event.code === 1000) {
          console.log('[WebSocket] Connection closed normally');
        } else {
          console.log('[WebSocket] Not reconnecting - intentional close or policy violation');
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
      // Cleanup on unmount
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
