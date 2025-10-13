// Manage API key storage and modal state.
// Handles API key input, saving, updating, deleting, and display masking.

import { useState } from 'react';

export function useApiKeyManagement() {
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [isEditingApiKey, setIsEditingApiKey] = useState<boolean>(false);

  const handleSaveApiKey = () => {
    if (!apiKeyInput.trim()) {
      return;
    }
    localStorage.setItem('openrouter_api_key', apiKeyInput.trim());
    setShowApiKeyModal(false);
    setApiKeyInput('');
  };

  const handleUpdateApiKey = () => {
    if (!apiKeyInput.trim()) {
      return;
    }
    localStorage.setItem('openrouter_api_key', apiKeyInput.trim());
    setApiKeyInput('');
    setIsEditingApiKey(false);
  };

  const handleDeleteApiKey = () => {
    if (window.confirm('Are you sure you want to delete your API key?')) {
      localStorage.removeItem('openrouter_api_key');
      setApiKeyInput('');
      setIsEditingApiKey(false);
    }
  };

  const maskApiKey = (key: string): string => {
    if (key.length <= 10) return key;
    return key.slice(0, 8) + '...' + key.slice(-6);
  };

  return {
    showApiKeyModal,
    setShowApiKeyModal,
    apiKeyInput,
    setApiKeyInput,
    isEditingApiKey,
    setIsEditingApiKey,
    handleSaveApiKey,
    handleUpdateApiKey,
    handleDeleteApiKey,
    maskApiKey
  };
}

