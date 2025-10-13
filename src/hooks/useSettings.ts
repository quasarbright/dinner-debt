// Manage settings modal and beta features.
// Handles settings modal state and beta feature toggles stored in localStorage.

import { useState } from 'react';

export function useSettings() {
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [betaFeaturesEnabled, setBetaFeaturesEnabled] = useState<boolean>(
    localStorage.getItem('beta_features_enabled') === 'true'
  );

  const openSettings = () => {
    setShowSettingsModal(true);
  };

  const closeSettings = () => {
    setShowSettingsModal(false);
  };

  const handleToggleBetaFeatures = (enabled: boolean) => {
    setBetaFeaturesEnabled(enabled);
    localStorage.setItem('beta_features_enabled', enabled.toString());
  };

  return {
    showSettingsModal,
    setShowSettingsModal,
    betaFeaturesEnabled,
    openSettings,
    closeSettings,
    handleToggleBetaFeatures
  };
}

