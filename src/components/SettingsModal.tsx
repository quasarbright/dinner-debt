// Settings modal for managing beta features and API key.
// Allows users to toggle beta features and manage their OpenRouter API key.

import React from 'react';

interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
  betaFeaturesEnabled: boolean;
  onToggleBetaFeatures: (enabled: boolean) => void;
  apiKey: string | null;
  onSaveApiKey: (apiKey: string) => void;
  onDeleteApiKey: () => void;
}

export function SettingsModal({
  show,
  onClose,
  betaFeaturesEnabled,
  onToggleBetaFeatures,
  apiKey,
  onSaveApiKey,
  onDeleteApiKey
}: SettingsModalProps) {
  const [isEditingApiKey, setIsEditingApiKey] = React.useState(false);
  const [apiKeyInput, setApiKeyInput] = React.useState('');

  if (!show) return null;

  const handleClose = () => {
    onClose();
    setIsEditingApiKey(false);
    setApiKeyInput('');
  };

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      onSaveApiKey(apiKeyInput.trim());
      setApiKeyInput('');
      setIsEditingApiKey(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingApiKey(false);
    setApiKeyInput('');
  };

  const maskApiKey = (key: string): string => {
    if (key.length <= 10) return key;
    return key.slice(0, 8) + '...' + key.slice(-6);
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Settings</h2>
        
        <div className="settings-section">
          <div className="settings-section-header">
            <h3 className="settings-section-title">Beta Features</h3>
          </div>
          <p className="settings-description">
            Access experimental features like receipt upload
          </p>
          
          <label className="toggle-label">
            <input
              type="checkbox"
              className="toggle-checkbox"
              checked={betaFeaturesEnabled}
              onChange={(e) => onToggleBetaFeatures(e.target.checked)}
            />
            <span className="toggle-switch"></span>
            <span className="toggle-text">Enable Beta Features</span>
          </label>
        </div>

        {betaFeaturesEnabled && (
          <div className="settings-section">
            <div className="settings-section-header">
              <h3 className="settings-section-title">API Key</h3>
            </div>
            <p className="settings-description">
              OpenRouter API key for receipt processing. This will incur costs to your OpenRouter account (less than $0.01 per receipt).
            </p>
            
            <div className="modal-warning">
              ⚠️ <strong>Security Warning:</strong> Your API key is stored as plaintext in your browser's localStorage. This is NOT secure storage.
            </div>

            {isEditingApiKey || !apiKey ? (
              <>
                <input
                  type="password"
                  className="form-control api-key-input"
                  placeholder="sk-or-v1-..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
                />
                <div className="settings-actions">
                  {apiKey && (
                    <button 
                      className="btn btn-outline" 
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </button>
                  )}
                  <button 
                    className="btn btn-primary" 
                    onClick={handleSaveApiKey}
                    disabled={!apiKeyInput.trim()}
                  >
                    {apiKey ? 'Update Key' : 'Save Key'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="api-key-display">
                  <code>{maskApiKey(apiKey)}</code>
                </div>
                <div className="settings-actions">
                  <button 
                    className="btn btn-outline" 
                    onClick={() => setIsEditingApiKey(true)}
                  >
                    Update Key
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={onDeleteApiKey}
                  >
                    Delete Key
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button 
            className="btn btn-primary" 
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

