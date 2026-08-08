// Tests for useApiKeyManagement hook, including loading the API key from a URL parameter.

import { renderHook } from '@testing-library/react';
import { useApiKeyManagement } from './useApiKeyManagement';

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('useApiKeyManagement', () => {
  const originalLocation = window.location.href;

  beforeEach(() => {
    mockLocalStorage.clear();
    window.history.replaceState({}, '', originalLocation);
  });

  it('saves an apiKey URL parameter to localStorage and strips it from the URL', () => {
    window.history.replaceState({}, '', '/?apiKey=my-secret-key&mode=creator');

    const { result } = renderHook(() => useApiKeyManagement());

    expect(result.current.getApiKey()).toBe('my-secret-key');
    expect(window.location.search).not.toContain('apiKey');
    expect(window.location.search).toContain('mode=creator');
  });

  it('does not touch the URL or localStorage when no apiKey param is present', () => {
    window.history.replaceState({}, '', '/?mode=creator');

    const { result } = renderHook(() => useApiKeyManagement());

    expect(result.current.getApiKey()).toBeNull();
    expect(window.location.search).toBe('?mode=creator');
  });
});
