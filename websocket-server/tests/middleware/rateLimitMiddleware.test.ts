/**
 * Rate Limiting Middleware Tests
 * 
 * Tests focused on rate limiting behavior, not basic Express functionality.
 * Only covers non-obvious scenarios and edge cases.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_ENABLED = 'true';

import { Request } from 'express';
import { getClientIP } from '../../src/middleware/rateLimitMiddleware';

describe('Rate Limiting Middleware', () => {
  describe('getClientIP', () => {
    it('should extract IP from X-Forwarded-For header with multiple IPs', () => {
      const mockReq = {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1, 127.0.0.1'
        },
        socket: { remoteAddress: '127.0.0.1' },
        ip: '127.0.0.1'
      } as unknown as Request;

      const ip = getClientIP(mockReq, true);
      expect(ip).toBe('192.168.1.1');
    });

    it('should prioritize X-Forwarded-For over other headers', () => {
      const mockReq = {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'cf-connecting-ip': '203.0.113.1',
          'x-real-ip': '10.0.0.1'
        },
        socket: { remoteAddress: '127.0.0.1' }
      } as unknown as Request;

      const ip = getClientIP(mockReq, true);
      expect(ip).toBe('192.168.1.1'); // X-Forwarded-For takes precedence
    });

    it('should use X-Real-IP when X-Forwarded-For is not available', () => {
      const mockReq = {
        headers: {
          'x-real-ip': '203.0.113.1'
        },
        socket: { remoteAddress: '127.0.0.1' }
      } as unknown as Request;

      const ip = getClientIP(mockReq, true);
      expect(ip).toBe('203.0.113.1');
    });

    it('should use Cloudflare header when others are not available', () => {
      const mockReq = {
        headers: {
          'cf-connecting-ip': '203.0.113.1'
        },
        socket: { remoteAddress: '127.0.0.1' }
      } as unknown as Request;

      const ip = getClientIP(mockReq, true);
      expect(ip).toBe('203.0.113.1');
    });

    it('should fallback to socket address when trustProxy is false', () => {
      const mockReq = {
        headers: {
          'x-forwarded-for': '192.168.1.1'
        },
        socket: { remoteAddress: '203.0.113.1' }
      } as unknown as Request;

      const ip = getClientIP(mockReq, false);
      expect(ip).toBe('203.0.113.1');
    });

    it('should handle malformed X-Forwarded-For headers', () => {
      const mockReq = {
        headers: {
          'x-forwarded-for': 'invalid-ip, , malformed'
        },
        socket: { remoteAddress: '127.0.0.1' }
      } as unknown as Request;

      const ip = getClientIP(mockReq, true);
      expect(ip).toBe('invalid-ip'); // Should extract the first part even if malformed
    });

    it('should handle array X-Forwarded-For headers', () => {
      const mockReq = {
        headers: {
          'x-forwarded-for': ['192.168.1.1, 10.0.0.1', '203.0.113.1']
        },
        socket: { remoteAddress: '127.0.0.1' }
      } as unknown as Request;

      const ip = getClientIP(mockReq, true);
      expect(ip).toBe('192.168.1.1');
    });

    it('should handle missing IP gracefully', () => {
      const mockReq = {
        headers: {},
        socket: {},
        ip: undefined
      } as unknown as Request;

      const ip = getClientIP(mockReq, true);
      expect(ip).toBe('unknown');
    });

    it('should handle missing socket gracefully', () => {
      const mockReq = {
        headers: {},
        socket: { remoteAddress: undefined },
        ip: undefined
      } as unknown as Request;

      const ip = getClientIP(mockReq, true);
      expect(ip).toBe('unknown');
    });

    it('should prefer Express ip detection over socket when available', () => {
      const mockReq = {
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
        ip: '203.0.113.1'
      } as unknown as Request;

      const ip = getClientIP(mockReq, true);
      expect(ip).toBe('203.0.113.1');
    });
  });

  describe('Rate Limiting Logic', () => {
    it('should handle whitespace in header values', () => {
      const mockReq = {
        headers: {
          'x-forwarded-for': '  192.168.1.1  ,  10.0.0.1  '
        },
        socket: { remoteAddress: '127.0.0.1' }
      } as unknown as Request;

      const ip = getClientIP(mockReq, true);
      expect(ip).toBe('192.168.1.1'); // Should trim whitespace
    });

    it('should handle empty forwarded headers', () => {
      const mockReq = {
        headers: {
          'x-forwarded-for': ''
        },
        socket: { remoteAddress: '127.0.0.1' }
      } as unknown as Request;

      const ip = getClientIP(mockReq, true);
      expect(ip).toBe('127.0.0.1'); // Should fallback to socket
    });

    it('should handle comma-only forwarded headers', () => {
      const mockReq = {
        headers: {
          'x-forwarded-for': ',,'
        },
        socket: { remoteAddress: '127.0.0.1' }
      } as unknown as Request;

      const ip = getClientIP(mockReq, true);
      expect(ip).toBe(''); // First split result, even if empty
    });
  });
}); 