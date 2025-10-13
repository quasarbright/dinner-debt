// Manage settings modal and beta features.
// Handles settings modal visibility and beta feature toggle stored in localStorage.

import { useState } from 'react';

export function useSettings() {
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [betaFeaturesEnabled, setBetaFeaturesEnabled] = useState<boolean>(
    localStorage.getItem('beta_features_enabled') === 'true'
  );

  const toggleBetaFeatures = (enabled: boolean) => {
    setBetaFeaturesEnabled(enabled);
    localStorage.setItem('beta_features_enabled', enabled.toString());
  };

  return {
    showSettingsModal,
    setShowSettingsModal,
    betaFeaturesEnabled,
    toggleBetaFeatures
  };
}
