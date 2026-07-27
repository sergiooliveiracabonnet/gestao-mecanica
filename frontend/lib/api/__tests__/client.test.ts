import type { InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { apiClient } from '../client';
import { useAuthStore } from '@/stores/auth-store';

function ok(config: InternalAxiosRequestConfig, data: unknown) {
  return { data, status: 200, statusText: 'OK', headers: {}, config };
}

function unauthorized(config: InternalAxiosRequestConfig) {
  const error = new Error('Unauthorized') as Error & { response: unknown; config: unknown; isAxiosError: boolean };
  error.response = { status: 401, data: {}, config };
  error.config = config;
  error.isAxiosError = true;
  throw error;
}

function currentAuthHeader(config: InternalAxiosRequestConfig): string | undefined {
  const headers = config.headers as unknown as { Authorization?: string; get?: (key: string) => string | undefined };
  return headers.get ? headers.get('Authorization') : headers.Authorization;
}

describe('apiClient response interceptor — token refresh', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'expired-token', refreshToken: 'refresh-token-1', user: null });
    delete apiClient.defaults.headers.common.Authorization;
  });

  it('on a 401, refreshes the token once and retries the original request with it', async () => {
    let refreshCalls = 0;
    let protectedCalls = 0;

    apiClient.defaults.adapter = async (config) => {
      if (config.url === '/api/v1/auth/refresh') {
        refreshCalls += 1;
        return ok(config, { access_token: 'new-token', refresh_token: 'refresh-token-2' });
      }
      protectedCalls += 1;
      if (currentAuthHeader(config) === 'Bearer expired-token') {
        unauthorized(config);
      }
      return ok(config, { result: 'success' });
    };

    const response = await apiClient.get('/protected', { headers: { Authorization: 'Bearer expired-token' } });

    expect(refreshCalls).toBe(1);
    expect(protectedCalls).toBe(2);
    expect(response.data).toEqual({ result: 'success' });
    expect(useAuthStore.getState().accessToken).toBe('new-token');
    expect(useAuthStore.getState().refreshToken).toBe('refresh-token-2');
  });

  it('shares a single in-flight refresh across concurrent 401s (refresh tokens are single-use/rotating)', async () => {
    let refreshCalls = 0;

    apiClient.defaults.adapter = async (config) => {
      if (config.url === '/api/v1/auth/refresh') {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return ok(config, { access_token: 'new-token', refresh_token: 'refresh-token-2' });
      }
      if (currentAuthHeader(config) !== 'Bearer new-token') {
        unauthorized(config);
      }
      return ok(config, { url: config.url });
    };

    const [a, b] = await Promise.all([
      apiClient.get('/a', { headers: { Authorization: 'Bearer expired-token' } }),
      apiClient.get('/b', { headers: { Authorization: 'Bearer expired-token' } }),
    ]);

    expect(refreshCalls).toBe(1);
    expect(a.data).toEqual({ url: '/a' });
    expect(b.data).toEqual({ url: '/b' });
  });

  it('does not attempt refresh-and-retry for a 401 on the login endpoint itself (avoids a refresh loop)', async () => {
    let refreshCalls = 0;
    apiClient.defaults.adapter = async (config) => {
      if (config.url === '/api/v1/auth/refresh') {
        refreshCalls += 1;
      }
      unauthorized(config);
    };

    await expect(apiClient.post('/api/v1/auth/login', { email: 'x', password: 'y' })).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(refreshCalls).toBe(0);
  });

  it('propagates the original 401 and clears the session when the refresh call itself fails', async () => {
    apiClient.defaults.adapter = async (config) => {
      unauthorized(config);
    };

    await expect(apiClient.get('/protected', { headers: { Authorization: 'Bearer expired-token' } })).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
  });

  it('clears the session and rejects without calling the network when there is no refresh token to use', async () => {
    useAuthStore.setState({ accessToken: 'expired-token', refreshToken: null, user: null });
    let refreshCalls = 0;
    apiClient.defaults.adapter = async (config) => {
      if (config.url === '/api/v1/auth/refresh') {
        refreshCalls += 1;
      }
      unauthorized(config);
    };

    await expect(apiClient.get('/protected', { headers: { Authorization: 'Bearer expired-token' } })).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(refreshCalls).toBe(0);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
