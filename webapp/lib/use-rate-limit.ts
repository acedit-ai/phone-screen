/**
 * React Hook for Phone Number Rate Limiting
 * 
 * Provides real-time rate limit checking and status updates
 * by communicating with the websocket-server database.
 */

import { useState, useEffect, useCallback } from 'react';

export interface RateLimitStatus {
  phoneNumber: string;
  allowed: boolean;
  remaining: number;
  resetTime: number; // timestamp when limit resets
  reason?: string;
  isLoading: boolean;
  error?: string;
}

export interface RateLimitMessage {
  type: 'rate_limit_check' | 'rate_limit_status' | 'rate_limit_exceeded';
  phoneNumber: string;
  allowed?: boolean;
  remaining?: number;
  resetTime?: number;
  reason?: string;
}

/**
 * Custom hook for managing phone number rate limiting
 */
export function useRateLimit() {
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  /**
   * Connect to websocket for rate limit communication
   */
  const connectWebSocket = useCallback(() => {
    const websocketServerUrl = process.env.NEXT_PUBLIC_WEBSOCKET_SERVER_URL;

    let websocketUrl: string;

    if (websocketServerUrl) {
      // Convert https://server-url to wss://server-url for WebSocket connection
      const protocol = websocketServerUrl.startsWith("https:") ? "wss:" : "ws:";
      const host = websocketServerUrl.replace(/^https?:\/\//, "");
      websocketUrl = `${protocol}//${host}/logs`;
    } else {
      // Check if we're in development (localhost)
      const isDevelopment =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1");

      if (isDevelopment) {
        // Development: Use localhost
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        websocketUrl = `${protocol}//localhost:8081/logs`;
      } else {
        console.error("NEXT_PUBLIC_WEBSOCKET_SERVER_URL environment variable is required in production");
        return null;
      }
    }

    const newWs = new WebSocket(websocketUrl);

    newWs.onopen = () => {
      console.log("📞 Connected to rate limit websocket");
    };

    newWs.onmessage = (event) => {
      try {
        const message: RateLimitMessage = JSON.parse(event.data);
        
        if (message.type === 'rate_limit_status') {
          setRateLimitStatus(prev => {
            // Only update if this is for the same phone number we're tracking
            if (prev && prev.phoneNumber === message.phoneNumber) {
              return {
                ...prev,
                allowed: message.allowed ?? true,
                remaining: message.remaining ?? 2,
                resetTime: message.resetTime ?? Date.now() + 3600000,
                reason: message.reason,
                isLoading: false,
                error: undefined,
              };
            }
            return prev;
          });
        } else if (message.type === 'rate_limit_exceeded') {
          setRateLimitStatus(prev => {
            if (prev && prev.phoneNumber === message.phoneNumber) {
              return {
                ...prev,
                allowed: false,
                remaining: 0,
                resetTime: message.resetTime ?? Date.now() + 3600000,
                reason: message.reason || 'Rate limit exceeded',
                isLoading: false,
                error: undefined,
              };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error("Failed to parse rate limit message:", error);
      }
    };

    newWs.onclose = () => {
      console.log("📞 Rate limit websocket disconnected");
      setWs(null);
    };

    newWs.onerror = (error) => {
      console.error("Rate limit websocket error:", error);
      setRateLimitStatus(prev => prev ? { ...prev, error: 'Connection error', isLoading: false } : null);
    };

    setWs(newWs);
    return newWs;
  }, []);

  /**
   * Check rate limit status for a phone number
   */
  const checkRateLimit = useCallback((phoneNumber: string) => {
    if (!phoneNumber || phoneNumber.length < 5) {
      setRateLimitStatus(null);
      return;
    }

    // Initialize loading state
    setRateLimitStatus({
      phoneNumber,
      allowed: true,
      remaining: 2,
      resetTime: Date.now() + 3600000,
      isLoading: true,
    });

    // Connect to websocket if not connected
    let websocket = ws;
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      websocket = connectWebSocket();
    }

    // Send rate limit check message
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      const message: RateLimitMessage = {
        type: 'rate_limit_check',
        phoneNumber,
      };
      websocket.send(JSON.stringify(message));
    } else {
      // If websocket isn't ready, try again after a short delay
      setTimeout(() => {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
          const message: RateLimitMessage = {
            type: 'rate_limit_check',
            phoneNumber,
          };
          websocket.send(JSON.stringify(message));
        } else {
          setRateLimitStatus(prev => prev ? { 
            ...prev, 
            error: 'Unable to check rate limit - connection not available',
            isLoading: false 
          } : null);
        }
      }, 1000);
    }
  }, [ws, connectWebSocket]);

  /**
   * Reset rate limit status
   */
  const resetRateLimit = useCallback(() => {
    setRateLimitStatus(null);
  }, []);

  /**
   * Clean up websocket connection
   */
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  return {
    rateLimitStatus,
    checkRateLimit,
    resetRateLimit,
    isConnected: ws?.readyState === WebSocket.OPEN,
  };
} 