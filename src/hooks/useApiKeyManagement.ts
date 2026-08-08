// Manage API key storage in localStorage.
// Provides simple interface for saving, retrieving, and deleting the OpenRouter API key.

import React from 'react';

export function useApiKeyManagement() {
  const getApiKey = (): string | null => {
    return localStorage.getItem('openrouter_api_key');
  };

  const saveApiKey = (apiKey: string) => {
    localStorage.setItem('openrouter_api_key', apiKey);
  };

  const deleteApiKey = () => {
    if (window.confirm('Are you sure you want to delete your API key?')) {
      localStorage.removeItem('openrouter_api_key');
      return true;
    }
    return false;
  };

  // Allow loading the API key from a URL parameter (e.g. for sharing a
  // pre-configured link). Once loaded, strip the param from the URL so the
  // key doesn't linger in browser history or get shared accidentally.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const apiKeyFromUrl = params.get('apiKey');
    if (apiKeyFromUrl) {
      saveApiKey(apiKeyFromUrl);
      params.delete('apiKey');
      const newSearch = params.toString();
      const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', newUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    getApiKey,
    saveApiKey,
    deleteApiKey
  };
}
