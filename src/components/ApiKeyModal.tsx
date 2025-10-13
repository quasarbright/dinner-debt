// Modal for entering OpenRouter API key when first setting up receipt upload.
// Simple one-time setup modal for users without an existing API key.

import React from 'react';

interface ApiKeyModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
}

export function ApiKeyModal({ show, onClose, onSave }: ApiKeyModalProps) {
  const [apiKeyInput, setApiKeyInput] = React.useState('');

  if (!show) return null;

  const handleSave = () => {
    if (apiKeyInput.trim()) {
      onSave(apiKeyInput.trim());
      setApiKeyInput('');
    }
  };

  const handleCancel = () => {
    onClose();
    setApiKeyInput('');
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">OpenRouter API Key Required</h2>
        <p className="modal-description">
          To use receipt upload, you need an OpenRouter API key. This will incur costs to your OpenRouter account (less than $0.01 per receipt).
        </p>
        <div className="modal-warning">
          ⚠️ <strong>Security Warning:</strong> Your API key will be stored as plaintext in your browser's localStorage.
          This is NOT secure storage. Only paste your key if you understand the risk.
        </div>
        <input
          type="password"
          className="form-control api-key-input"
          placeholder="sk-or-v1-..."
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <div className="modal-actions">
          <button 
            className="btn btn-outline" 
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={!apiKeyInput.trim()}
          >
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
}

