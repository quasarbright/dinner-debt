// Manage API key storage in localStorage.
// Provides simple interface for saving, retrieving, and deleting the OpenRouter API key.

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

  return {
    getApiKey,
    saveApiKey,
    deleteApiKey
  };
}
