import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../api';

describe('api client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('includes Authorization header when token exists', async () => {
    localStorage.setItem('2chi-auth', JSON.stringify({ state: { accessToken: 'test-token' } }));

    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: {} }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await api.get('/test');

    const calledWith = mockFetch.mock.calls[0][1];
    expect(calledWith.headers['Authorization']).toBe('Bearer test-token');
  });

  it('omits Authorization header when no token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: {} }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await api.get('/test');

    const calledWith = mockFetch.mock.calls[0][1];
    expect(calledWith.headers['Authorization']).toBeUndefined();
  });
});
