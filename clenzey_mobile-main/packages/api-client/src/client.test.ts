import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios, { AxiosHeaders } from 'axios';
import { createApiClient, ApiConfig } from './client';
import { isApiError } from './types';

// Set up axios mock adapter inline
function createMockConfig(overrides: Partial<ApiConfig> = {}): ApiConfig {
  return {
    baseURL: 'https://api.clenzey.com',
    getToken: vi.fn().mockResolvedValue('test-token-123'),
    setToken: vi.fn().mockResolvedValue(undefined),
    onAuthFailure: vi.fn(),
    ...overrides,
  };
}

describe('createApiClient', () => {
  let mockAdapter: ReturnType<typeof createMockAdapter>;

  function createMockAdapter() {
    const handlers: Array<{
      method: string;
      url: string | RegExp;
      response: { status: number; data: unknown };
      networkError?: boolean;
    }> = [];

    return {
      onGet(url: string | RegExp, response: { status: number; data: unknown }) {
        handlers.push({ method: 'get', url, response });
        return this;
      },
      onPost(url: string | RegExp, response: { status: number; data: unknown }) {
        handlers.push({ method: 'post', url, response });
        return this;
      },
      onGetNetworkError(url: string | RegExp) {
        handlers.push({ method: 'get', url, response: { status: 0, data: null }, networkError: true });
        return this;
      },
      find(method: string, url: string) {
        return handlers.find((h) => {
          const methodMatch = h.method === method;
          const urlMatch = typeof h.url === 'string' ? url.includes(h.url) : h.url.test(url);
          return methodMatch && urlMatch;
        });
      },
    };
  }

  describe('Request Interceptor - Bearer Token Attachment', () => {
    it('should attach Authorization header with Bearer token for regular requests', async () => {
      const config = createMockConfig();
      const client = createApiClient(config);

      // Intercept the request to check headers before it goes out
      let capturedHeaders: AxiosHeaders | undefined;
      client.interceptors.request.use((reqConfig) => {
        capturedHeaders = reqConfig.headers as AxiosHeaders;
        // Cancel the request to avoid actual network call
        const controller = new AbortController();
        controller.abort();
        reqConfig.signal = controller.signal;
        return reqConfig;
      });

      try {
        await client.get('/bookings');
      } catch {
        // Expected to be cancelled
      }

      expect(config.getToken).toHaveBeenCalled();
      expect(capturedHeaders?.get('Authorization')).toBe('Bearer test-token-123');
    });

    it('should skip token attachment for /auth/initiate endpoint', async () => {
      const config = createMockConfig();
      const client = createApiClient(config);

      let capturedHeaders: AxiosHeaders | undefined;
      client.interceptors.request.use((reqConfig) => {
        capturedHeaders = reqConfig.headers as AxiosHeaders;
        const controller = new AbortController();
        controller.abort();
        reqConfig.signal = controller.signal;
        return reqConfig;
      });

      try {
        await client.post('/auth/initiate', { phone: '+919876543210' });
      } catch {
        // Expected to be cancelled
      }

      expect(capturedHeaders?.get('Authorization')).toBeUndefined();
    });

    it('should skip token attachment for /auth/validate endpoint', async () => {
      const config = createMockConfig();
      const client = createApiClient(config);

      let capturedHeaders: AxiosHeaders | undefined;
      client.interceptors.request.use((reqConfig) => {
        capturedHeaders = reqConfig.headers as AxiosHeaders;
        const controller = new AbortController();
        controller.abort();
        reqConfig.signal = controller.signal;
        return reqConfig;
      });

      try {
        await client.post('/auth/validate', { phone: '+919876543210', otp: '123456' });
      } catch {
        // Expected to be cancelled
      }

      expect(capturedHeaders?.get('Authorization')).toBeUndefined();
    });

    it('should not attach header when token is null', async () => {
      const config = createMockConfig({ getToken: vi.fn().mockResolvedValue(null) });
      const client = createApiClient(config);

      let capturedHeaders: AxiosHeaders | undefined;
      client.interceptors.request.use((reqConfig) => {
        capturedHeaders = reqConfig.headers as AxiosHeaders;
        const controller = new AbortController();
        controller.abort();
        reqConfig.signal = controller.signal;
        return reqConfig;
      });

      try {
        await client.get('/bookings');
      } catch {
        // Expected to be cancelled
      }

      expect(capturedHeaders?.get('Authorization')).toBeUndefined();
    });
  });

  describe('Response Interceptor - Success Envelope Unwrapping', () => {
    it('should unwrap success envelope and return data field', async () => {
      const config = createMockConfig();
      const client = createApiClient(config);

      // Use axios interceptor adapter pattern
      const mockData = { id: '1', name: 'Test Booking' };
      
      // Add a response interceptor that fires BEFORE our interceptor to mock the response
      client.interceptors.response.use(undefined, undefined);
      
      // We'll use a custom adapter approach via msw-like mock
      const originalCreate = axios.create;
      
      // Instead, let's use nock-style approach: override adapter
      const adapter = vi.fn().mockResolvedValue({
        data: { success: true, data: mockData },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      // Create fresh client with mock adapter
      const testClient = createApiClient(config);
      testClient.defaults.adapter = adapter;

      const result = await testClient.get('/bookings/1');
      expect(result).toEqual(mockData);
    });

    it('should return raw data when response is not in envelope format', async () => {
      const config = createMockConfig();
      const client = createApiClient(config);

      const rawData = { items: [1, 2, 3] };
      const adapter = vi.fn().mockResolvedValue({
        data: rawData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      client.defaults.adapter = adapter;

      const result = await client.get('/external-data');
      expect(result).toEqual(rawData);
    });

    it('should return raw data when success field is not true', async () => {
      const config = createMockConfig();
      const client = createApiClient(config);

      // Edge case: success is false in a 200 response (shouldn't happen but handled)
      const responseData = { success: false, message: 'Something went wrong' };
      const adapter = vi.fn().mockResolvedValue({
        data: responseData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      client.defaults.adapter = adapter;

      const result = await client.get('/some-endpoint');
      expect(result).toEqual(responseData);
    });
  });

  describe('Error Interceptor - Structured ApiError Extraction', () => {
    it('should extract structured ApiError from error envelope response', async () => {
      const config = createMockConfig();
      const client = createApiClient(config);

      const errorResponse = {
        success: false,
        message: 'Booking not found',
        error: {
          code: 'BOOKING_NOT_FOUND',
          details: [{ field: 'bookingId', message: 'Invalid booking ID' }],
        },
      };

      const adapter = vi.fn().mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 404,
          data: errorResponse,
          headers: {},
        },
        config: {},
        message: 'Request failed with status code 404',
      });

      client.defaults.adapter = adapter;

      try {
        await client.get('/bookings/invalid');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(isApiError(error)).toBe(true);
        const apiError = error as import('./types').ApiError;
        expect(apiError.success).toBe(false);
        expect(apiError.message).toBe('Booking not found');
        expect(apiError.code).toBe('BOOKING_NOT_FOUND');
        expect(apiError.statusCode).toBe(404);
        expect(apiError.details).toEqual([{ field: 'bookingId', message: 'Invalid booking ID' }]);
      }
    });

    it('should handle error response without envelope format', async () => {
      const config = createMockConfig();
      const client = createApiClient(config);

      const adapter = vi.fn().mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 500,
          data: { message: 'Internal server error' },
          headers: {},
        },
        config: {},
        message: 'Request failed with status code 500',
      });

      client.defaults.adapter = adapter;

      try {
        await client.get('/bookings');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(isApiError(error)).toBe(true);
        const apiError = error as import('./types').ApiError;
        expect(apiError.success).toBe(false);
        expect(apiError.message).toBe('Internal server error');
        expect(apiError.statusCode).toBe(500);
        expect(apiError.code).toBeUndefined();
      }
    });

    it('should create Network error ApiError when no response received', async () => {
      const config = createMockConfig();
      const client = createApiClient(config);

      const adapter = vi.fn().mockRejectedValue({
        isAxiosError: true,
        response: undefined,
        config: {},
        message: 'Network Error',
        code: 'ERR_NETWORK',
      });

      client.defaults.adapter = adapter;

      try {
        await client.get('/bookings');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(isApiError(error)).toBe(true);
        const apiError = error as import('./types').ApiError;
        expect(apiError.success).toBe(false);
        expect(apiError.message).toBe('Network error');
        expect(apiError.statusCode).toBe(0);
      }
    });

    it('should create timeout ApiError for ECONNABORTED errors', async () => {
      const config = createMockConfig();
      const client = createApiClient(config);

      const adapter = vi.fn().mockRejectedValue({
        isAxiosError: true,
        response: undefined,
        config: {},
        message: 'timeout of 30000ms exceeded',
        code: 'ECONNABORTED',
      });

      client.defaults.adapter = adapter;

      try {
        await client.get('/bookings');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(isApiError(error)).toBe(true);
        const apiError = error as import('./types').ApiError;
        expect(apiError.success).toBe(false);
        expect(apiError.message).toBe('Request timeout');
        expect(apiError.statusCode).toBe(0);
      }
    });

    it('should handle error envelope without error.code or error.details', async () => {
      const config = createMockConfig();
      const client = createApiClient(config);

      const adapter = vi.fn().mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 400,
          data: { success: false, message: 'Validation failed' },
          headers: {},
        },
        config: {},
        message: 'Request failed with status code 400',
      });

      client.defaults.adapter = adapter;

      try {
        await client.get('/bookings');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(isApiError(error)).toBe(true);
        const apiError = error as import('./types').ApiError;
        expect(apiError.success).toBe(false);
        expect(apiError.message).toBe('Validation failed');
        expect(apiError.statusCode).toBe(400);
        expect(apiError.code).toBeUndefined();
        expect(apiError.details).toBeUndefined();
      }
    });
  });

  describe('401 Interceptor - Token Refresh Logic', () => {
    it('should attempt token refresh on 401 and retry the original request', async () => {
      const config = createMockConfig();
      const client = createApiClient(config);

      let requestCount = 0;
      const adapter = vi.fn().mockImplementation((reqConfig: { url: string; method: string; withCredentials?: boolean }) => {
        requestCount++;

        // First request: 401 on /bookings
        if (requestCount === 1 && reqConfig.url.includes('/bookings')) {
          return Promise.reject({
            isAxiosError: true,
            response: {
              status: 401,
              data: { success: false, message: 'Unauthorized' },
              headers: {},
            },
            config: reqConfig,
            message: 'Request failed with status code 401',
          });
        }

        // Second request: refresh succeeds
        if (reqConfig.url.includes('/auth/refresh')) {
          return Promise.resolve({
            data: { success: true, data: { accessToken: 'new-token-456' } },
            status: 200,
            statusText: 'OK',
            headers: {},
            config: reqConfig,
          });
        }

        // Third request: retry of original with new token
        if (requestCount === 3 && reqConfig.url.includes('/bookings')) {
          return Promise.resolve({
            data: { success: true, data: { id: '1', name: 'Test Booking' } },
            status: 200,
            statusText: 'OK',
            headers: {},
            config: reqConfig,
          });
        }

        return Promise.reject(new Error('Unexpected request'));
      });

      client.defaults.adapter = adapter;

      const result = await client.get('/bookings');
      expect(result).toEqual({ id: '1', name: 'Test Booking' });
      expect(config.setToken).toHaveBeenCalledWith('new-token-456');
      expect(config.onAuthFailure).not.toHaveBeenCalled();
    });

    it('should trigger onAuthFailure when refresh fails', async () => {
      const config = createMockConfig();
      const client = createApiClient(config);

      let requestCount = 0;
      const adapter = vi.fn().mockImplementation((reqConfig: { url: string }) => {
        requestCount++;

        // First request: 401 on /bookings
        if (requestCount === 1 && reqConfig.url.includes('/bookings')) {
          return Promise.reject({
            isAxiosError: true,
            response: {
              status: 401,
              data: { success: false, message: 'Unauthorized' },
              headers: {},
            },
            config: reqConfig,
            message: 'Request failed with status code 401',
          });
        }

        // Second request: refresh also fails with 401
        if (reqConfig.url.includes('/auth/refresh')) {
          return Promise.reject({
            isAxiosError: true,
            response: {
              status: 401,
              data: { success: false, message: 'Refresh token expired' },
              headers: {},
            },
            config: reqConfig,
            message: 'Request failed with status code 401',
          });
        }

        return Promise.reject(new Error('Unexpected request'));
      });

      client.defaults.adapter = adapter;

      try {
        await client.get('/bookings');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(isApiError(error)).toBe(true);
        expect(config.onAuthFailure).toHaveBeenCalled();
      }
    });

    it('should immediately trigger onAuthFailure when 401 is from refresh endpoint itself', async () => {
      const config = createMockConfig();
      const client = createApiClient(config);

      const adapter = vi.fn().mockImplementation((reqConfig: { url: string }) => {
        // Direct 401 on the refresh endpoint
        if (reqConfig.url.includes('/auth/refresh')) {
          return Promise.reject({
            isAxiosError: true,
            response: {
              status: 401,
              data: { success: false, message: 'Refresh token expired' },
              headers: {},
            },
            config: reqConfig,
            message: 'Request failed with status code 401',
          });
        }

        return Promise.reject(new Error('Unexpected request'));
      });

      client.defaults.adapter = adapter;

      try {
        await client.post('/auth/refresh', {});
        expect.fail('Should have thrown');
      } catch (error) {
        expect(isApiError(error)).toBe(true);
        expect(config.onAuthFailure).toHaveBeenCalledTimes(1);
      }
    });

    it('should queue multiple requests during refresh and retry all on success', async () => {
      let currentToken = 'test-token-123';
      const config = createMockConfig({
        getToken: vi.fn().mockImplementation(() => Promise.resolve(currentToken)),
        setToken: vi.fn().mockImplementation((token: string) => {
          currentToken = token;
          return Promise.resolve();
        }),
      });
      const client = createApiClient(config);

      let refreshCallCount = 0;

      // Track whether refresh is happening
      let refreshStarted = false;
      let resolveRefresh: ((value: unknown) => void) | null = null;

      const adapter = vi.fn().mockImplementation((reqConfig: { url: string; headers?: { Authorization?: string }; _retry?: boolean }) => {
        // If request has the new token (retry after refresh), succeed
        if (reqConfig.headers?.Authorization === 'Bearer new-token-789') {
          return Promise.resolve({
            data: { success: true, data: { retried: true, url: reqConfig.url } },
            status: 200,
            statusText: 'OK',
            headers: {},
            config: reqConfig,
          });
        }

        // Refresh endpoint — delay completion to allow queuing
        if (reqConfig.url.includes('/auth/refresh')) {
          refreshCallCount++;
          refreshStarted = true;
          return new Promise((resolve) => {
            resolveRefresh = resolve;
          });
        }

        // All other requests fail with 401 (initial calls before refresh)
        return Promise.reject({
          isAxiosError: true,
          response: {
            status: 401,
            data: { success: false, message: 'Unauthorized' },
            headers: {},
          },
          config: reqConfig,
          message: 'Request failed with status code 401',
        });
      });

      client.defaults.adapter = adapter;

      // First request triggers the refresh
      const promise1 = client.get('/bookings');

      // Wait for the refresh to start
      await vi.waitFor(() => {
        if (!refreshStarted) throw new Error('refresh not started');
      });

      // Now fire two more requests while refresh is in progress — they should be queued
      const promise2 = client.get('/services');
      const promise3 = client.get('/addresses');

      // Allow a microtask to let requests 2 and 3 enter the queue
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Now resolve the refresh
      resolveRefresh!({
        data: { success: true, data: { accessToken: 'new-token-789' } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

      // All should have been retried successfully
      expect(result1).toEqual({ retried: true, url: expect.stringContaining('/bookings') });
      expect(result2).toEqual({ retried: true, url: expect.stringContaining('/services') });
      expect(result3).toEqual({ retried: true, url: expect.stringContaining('/addresses') });

      // Refresh should only be called once
      expect(refreshCallCount).toBe(1);
      expect(config.setToken).toHaveBeenCalledWith('new-token-789');
      expect(config.onAuthFailure).not.toHaveBeenCalled();
    });

    it('should reject all queued requests when refresh fails', async () => {
      const config = createMockConfig();
      const client = createApiClient(config);

      const adapter = vi.fn().mockImplementation((reqConfig: { url: string }) => {
        // Refresh endpoint fails
        if (reqConfig.url.includes('/auth/refresh')) {
          return new Promise((_, reject) =>
            setTimeout(() => {
              reject({
                isAxiosError: true,
                response: {
                  status: 401,
                  data: { success: false, message: 'Refresh failed' },
                  headers: {},
                },
                config: reqConfig,
                message: 'Request failed with status code 401',
              });
            }, 10)
          );
        }

        // All other requests fail with 401
        return Promise.reject({
          isAxiosError: true,
          response: {
            status: 401,
            data: { success: false, message: 'Unauthorized' },
            headers: {},
          },
          config: reqConfig,
          message: 'Request failed with status code 401',
        });
      });

      client.defaults.adapter = adapter;

      // Fire 3 requests simultaneously - all should fail after refresh fails
      const results = await Promise.allSettled([
        client.get('/bookings'),
        client.get('/services'),
        client.get('/addresses'),
      ]);

      // All should be rejected
      results.forEach((result) => {
        expect(result.status).toBe('rejected');
      });

      expect(config.onAuthFailure).toHaveBeenCalled();
    });

    it('should not attempt refresh for non-401 errors', async () => {
      const config = createMockConfig();
      const client = createApiClient(config);

      const adapter = vi.fn().mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 403,
          data: { success: false, message: 'Forbidden' },
          headers: {},
        },
        config: { url: '/admin/panel' },
        message: 'Request failed with status code 403',
      });

      client.defaults.adapter = adapter;

      try {
        await client.get('/admin/panel');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(isApiError(error)).toBe(true);
        const apiError = error as import('./types').ApiError;
        expect(apiError.statusCode).toBe(403);
        expect(config.onAuthFailure).not.toHaveBeenCalled();
        expect(config.setToken).not.toHaveBeenCalled();
      }
    });

    it('should use custom refreshEndpoint when configured', async () => {
      const config = createMockConfig({ refreshEndpoint: '/custom/refresh-token' });
      const client = createApiClient(config);

      let refreshUrl: string | undefined;
      let requestCount = 0;
      const adapter = vi.fn().mockImplementation((reqConfig: { url: string }) => {
        requestCount++;

        // First request: 401
        if (requestCount === 1 && reqConfig.url.includes('/bookings')) {
          return Promise.reject({
            isAxiosError: true,
            response: {
              status: 401,
              data: { success: false, message: 'Unauthorized' },
              headers: {},
            },
            config: reqConfig,
            message: 'Request failed with status code 401',
          });
        }

        // Refresh endpoint
        if (reqConfig.url.includes('/custom/refresh-token')) {
          refreshUrl = reqConfig.url;
          return Promise.resolve({
            data: { success: true, data: { accessToken: 'custom-token' } },
            status: 200,
            statusText: 'OK',
            headers: {},
            config: reqConfig,
          });
        }

        // Retry
        return Promise.resolve({
          data: { success: true, data: { refreshed: true } },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: reqConfig,
        });
      });

      client.defaults.adapter = adapter;

      const result = await client.get('/bookings');
      expect(result).toEqual({ refreshed: true });
      expect(refreshUrl).toContain('/custom/refresh-token');
      expect(config.setToken).toHaveBeenCalledWith('custom-token');
    });

    it('should send refresh request with withCredentials for HttpOnly cookies', async () => {
      const config = createMockConfig();
      const client = createApiClient(config);

      let refreshRequestConfig: { withCredentials?: boolean } | undefined;
      let requestCount = 0;
      const adapter = vi.fn().mockImplementation((reqConfig: { url: string; withCredentials?: boolean }) => {
        requestCount++;

        // First request: 401
        if (requestCount === 1 && reqConfig.url.includes('/bookings')) {
          return Promise.reject({
            isAxiosError: true,
            response: {
              status: 401,
              data: { success: false, message: 'Unauthorized' },
              headers: {},
            },
            config: reqConfig,
            message: 'Request failed with status code 401',
          });
        }

        // Refresh endpoint - capture config
        if (reqConfig.url.includes('/auth/refresh')) {
          refreshRequestConfig = reqConfig;
          return Promise.resolve({
            data: { success: true, data: { accessToken: 'new-token' } },
            status: 200,
            statusText: 'OK',
            headers: {},
            config: reqConfig,
          });
        }

        // Retry
        return Promise.resolve({
          data: { success: true, data: { ok: true } },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: reqConfig,
        });
      });

      client.defaults.adapter = adapter;

      await client.get('/bookings');
      expect(refreshRequestConfig?.withCredentials).toBe(true);
    });
  });

  describe('isApiError type guard', () => {
    it('should return true for valid ApiError objects', () => {
      const error = {
        success: false as const,
        message: 'Not found',
        statusCode: 404,
      };
      expect(isApiError(error)).toBe(true);
    });

    it('should return false for non-ApiError objects', () => {
      expect(isApiError(null)).toBe(false);
      expect(isApiError(undefined)).toBe(false);
      expect(isApiError('error')).toBe(false);
      expect(isApiError({ success: true, data: {} })).toBe(false);
      expect(isApiError({ message: 'error' })).toBe(false);
    });
  });
});
