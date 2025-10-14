// Main application component for Dinner Debt bill splitting app.
// Coordinates state management, business logic, and UI rendering for calculating
// how much each person owes when splitting a restaurant bill.

import React from 'react';
import './App.css';
import QRCode from 'react-qr-code';
import { calculateDebt } from './utils/debtCalculation';
import { getVenmoUrl } from './utils/venmoUrl';
import { safeEval } from './utils/itemHelpers';
import { useFormState } from './hooks/useFormState';
import { useReceiptUpload } from './hooks/useReceiptUpload';
import { useApiKeyManagement } from './hooks/useApiKeyManagement';
import { useSettings } from './hooks/useSettings';
import { useShareLink } from './hooks/useShareLink';
import { ApiKeyModal } from './components/ApiKeyModal';
import { SettingsModal } from './components/SettingsModal';
import { FriendWizard } from './components/FriendWizard';
import { SplitControls } from './components/SplitControls';
import { ExpandIndicator } from './components/ExpandIndicator';
import { BillDetails } from './components/BillDetails';

function App() {
  // Initialize all state management hooks
  const {
      items,
      subtotal,
    setSubtotal,
      total,
    setTotal,
      tip,
    setTip,
      tipIsRate,
    setTipIsRate,
      tipIncludedInTotal,
    isPayingMe,
    setIsPayingMe,
    setItem,
    removeItem,
    addItem,
    populateFormFromReceipt,
    getFormState
  } = useFormState();

  const {
    showSettingsModal,
    setShowSettingsModal,
    betaFeaturesEnabled,
    toggleBetaFeatures
  } = useSettings();

  const { getApiKey, saveApiKey, deleteApiKey } = useApiKeyManagement();

  const [showApiKeyModal, setShowApiKeyModal] = React.useState(false);
  
  // Track when we need to redirect after receipt upload in calculator mode
  const shouldRedirectAfterUpload = React.useRef(false);

  const {
    isProcessingReceipt,
    receiptError,
    handleReceiptUploadClick,
    handleReceiptUpload
  } = useReceiptUpload({
    onPopulateForm: populateFormFromReceipt,
    onApiKeyMissing: () => setShowApiKeyModal(true),
    onUploadSuccess: () => {
      if (mode === 'calculator') {
        shouldRedirectAfterUpload.current = true;
      }
    }
  });

  const {
    showQRCode,
    setShowQRCode,
    linkCopied,
    qrCodeError,
    setQrCodeError,
    getShareUrl,
    handleCopyLink,
    handleShareLink
  } = useShareLink({ getFormState });

  // Redirect after form state has been populated (in calculator mode only)
  React.useEffect(() => {
    if (shouldRedirectAfterUpload.current && items.length > 0) {
      shouldRedirectAfterUpload.current = false;
      const shareUrl = getShareUrl();
      const url = new URL(shareUrl);
      url.searchParams.set('calculator', 'true');
      window.location.href = url.toString();
    }
  }, [items, getShareUrl]);

  // Feature flag: Check if beta features are enabled
  const receiptUploadEnabled = betaFeaturesEnabled;

  // Detect mode from URL parameters
  const mode = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('data')) {
      return params.get('calculator') === 'true' ? 'calculator-wizard' : 'friend';
    }
    const modeParam = params.get('mode');
    if (modeParam === 'creator' || modeParam === 'calculator') return modeParam;
    return 'landing';
  }, [window.location.search]);

  // Internal state for calculator manual entry mode (no URL change)
  const [showCalculatorManualEntry, setShowCalculatorManualEntry] = React.useState(false);

  // Calculate debt using utility function
  const debt = calculateDebt({ items, subtotal, total, tip, tipIsRate, tipIncludedInTotal });

  const debtStr = Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(debt)
  const amountStr = debtStr.substring(1); // remove the dollar sign for Venmo
  const note = encodeURIComponent("dinner-debt")

  return (
    <div className="app-container">
      <header className="app-header">
        <button 
          className="settings-button" 
          onClick={() => setShowSettingsModal(true)}
          title="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="app-title">Dinner Debt</h1>
        <p className="app-description">
          Calculate how much you owe someone for dinner,
          including your portion of the tax and tip based on what you ordered.
        </p>
      </header>
      
      {/* Conditional rendering based on mode */}
      {mode === 'landing' ? (
        <LandingPage />
      ) : mode === 'calculator' && !showCalculatorManualEntry ? (
        <CalculatorChoicePage
          receiptUploadEnabled={receiptUploadEnabled}
          onReceiptUploadClick={handleReceiptUploadClick}
          onManualEntryClick={() => setShowCalculatorManualEntry(true)}
          isProcessingReceipt={isProcessingReceipt}
          receiptError={receiptError ?? null}
          onReceiptUpload={handleReceiptUpload}
        />
      ) : mode === 'friend' ? (
        <FriendWizard
          items={items}
          subtotal={subtotal}
          total={total}
          tip={tip}
          tipIsRate={tipIsRate}
          tipIncludedInTotal={tipIncludedInTotal}
          isPayingMe={isPayingMe}
        />
      ) : mode === 'calculator-wizard' ? (
        <FriendWizard
          items={items}
          subtotal={subtotal}
          total={total}
          tip={tip}
          tipIsRate={tipIsRate}
          tipIncludedInTotal={tipIncludedInTotal}
          isPayingMe={isPayingMe}
          isCalculatorMode={true}
        />
      ) : (
        <>
      <section className="form-section">
        <h2 className="section-title">Items</h2>
        
        <div className="items-container">
          {items.map((item, index) => {
            // Calculate the max split value across all items
            const maxSplit = Math.max(8, ...items.map(i => Math.abs(i.totalPortions ?? 1)))
            
            return (
              <div key={item.id} className="item-card">
                {item.name && (
                  <div className="item-name">
                    <input
                      type="text"
                      className="item-name-input"
                      value={item.name}
                      onChange={(ev) => setItem(index, {name: ev.target.value})}
                      placeholder="Item name"
                    />
                  </div>
                )}
                
                <div className="item-controls">
                  <button 
                    className="btn btn-danger btn-sm btn-remove" 
                    onClick={() => removeItem(index)}
                  >
                    ×
                  </button>
                  
                  <div className="control-group">
                    <label className="control-label">Cost</label>
                    <div className="currency-input-wrapper">
                      <span className="currency-symbol">$</span>
                      <input
                        className="form-control form-control-sm currency-input"
                        name={`cost${index}`}
                        type="text"
                        inputMode="decimal"
                        value={item.cost ?? ''}
                        onChange={(ev) => setItem(index, {cost: safeEval(ev.target.value, 1)})}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  <SplitControls
                    totalPortions={item.totalPortions ?? 1}
                    portionsPaying={item.portionsPaying ?? 1}
                    maxSplit={maxSplit}
                    onTotalPortionsChange={(newTotal) => {
                      const newPaying = Math.min(item.portionsPaying ?? 1, Math.abs(newTotal));
                      setItem(index, {totalPortions: newTotal, portionsPaying: newPaying});
                    }}
                    onPortionsPayingChange={(newPaying) => {
                      setItem(index, {portionsPaying: newPaying});
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="action-buttons-container">
          <div className="action-buttons">
            {receiptUploadEnabled && (
              <>
                <input
                  type="file"
                  id="receipt-upload"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleReceiptUpload}
                  style={{ display: 'none' }}
                  disabled={isProcessingReceipt}
                />
                <button 
                  className={`btn btn-outline upload-button ${isProcessingReceipt ? 'disabled' : ''}`}
                  onClick={handleReceiptUploadClick}
                  disabled={isProcessingReceipt}
                >
                  {isProcessingReceipt ? 'Processing...' : '📸 Upload Receipt (beta)'}
                </button>
              </>
            )}
            
            <button 
              className="btn btn-primary" 
              onClick={() => addItem()}
            >
              Add Item
            </button>
          </div>
          
          {receiptError && (
            <div className="error-message">{receiptError}</div>
          )}
        </div>
        
      </section>
      
      <section className="form-section">
        <h2 className="section-title">Bill Details</h2>
        <BillDetails
          subtotal={subtotal ?? 0}
          total={total ?? 0}
          tip={tip}
          tipIsRate={tipIsRate}
          tipIncludedInTotal={tipIncludedInTotal}
          onSubtotalChange={setSubtotal}
          onTotalChange={setTotal}
          onTipChange={setTip}
          onTipIsRateChange={setTipIsRate}
        />
      </section>
      
      <section className="result-section">
        <h2 className="section-title">Result</h2>
        <div className="result-amount">You owe: {debtStr}</div>
        
        <div className="form-group">
          <p>Are you paying Mike Delmonaco?</p>
          <div className="radio-group">
            <label className="radio-label">
              <input 
                className="radio-input"
                name="not-paying-me" 
                type="radio" 
                checked={!isPayingMe} 
                onClick={() => setIsPayingMe(false)}
              />
              No
            </label>
            
            <label className="radio-label">
              <input 
                className="radio-input"
                name="paying-me" 
                type="radio" 
                checked={isPayingMe} 
                onClick={() => setIsPayingMe(true)}
              />
              Yes
            </label>
          </div>
        </div>
        
        {isPayingMe ? (
          <a 
            className="action-button venmo-button" 
            href={getVenmoUrl(amountStr, note, 'Mike-Delmonaco')}
          >
            Pay Mike Delmonaco with Venmo
          </a>
        ): (
          <a 
            className="action-button venmo-button" 
            href={getVenmoUrl(amountStr, note)}
          >
            Pay with Venmo
          </a>
        )}
      </section>
      
      {/* Hide QR code section for calculator modes */}
      {mode !== 'calculator' && !showCalculatorManualEntry && (
      <section className="form-section">
        <div 
          className="qr-toggle"
          onClick={() => {
            setQrCodeError(false);
            setShowQRCode(b => !b);
          }}
        >
          <ExpandIndicator isExpanded={showQRCode} />
          {showQRCode ? 'Hide QR Code' : 'Show QR Code'}
        </div>
        
        {showQRCode && (
          <div className="qr-container">
            {qrCodeError ? (
              <div className="error-message" style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ marginBottom: '1rem' }}>
                  ⚠️ Receipt is too large for QR code generation.
                </p>
                <p style={{ fontSize: '0.9em', opacity: 0.8 }}>
                  Please use the Copy Link or Share Link button.
                </p>
              </div>
            ) : (
              <QRCodeErrorBoundary onError={() => setQrCodeError(true)}>
                <QRCode 
                  value={getShareUrl()}
                  bgColor="var(--background-secondary)"
                  fgColor="#dcddde"
                  level="M"
                  style={{ width: '100%', height: 'auto', maxWidth: '400px' }}
                />
              </QRCodeErrorBoundary>
            )}
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button 
                className="btn btn-outline" 
                onClick={handleCopyLink}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span>Copy Link</span>
                {linkCopied ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="5" y="4" width="9" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M4 12H3C2.44772 12 2 11.5523 2 11V2C2 1.44772 2.44772 1 3 1H9C9.55228 1 10 1.44772 10 2V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
              <button 
                className="btn btn-outline" 
                onClick={handleShareLink}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span>Share Link</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 7V14C3 14.5523 3.44772 15 4 15H12C12.5523 15 13 14.5523 13 14V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 10V2M8 2L5.5 4.5M8 2L10.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </section>
      )}
        </>
      )}
      
      <footer className="app-footer">
        Created by Mike Delmonaco
        <br/>
        <a href="https://github.com/quasarbright/dinner-debt">Source Code</a>
      </footer>
      
      <ApiKeyModal
        show={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={(apiKey) => {
          saveApiKey(apiKey);
          setShowApiKeyModal(false);
        }}
      />

      <SettingsModal
        show={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        betaFeaturesEnabled={betaFeaturesEnabled}
        onToggleBetaFeatures={toggleBetaFeatures}
        apiKey={getApiKey()}
        onSaveApiKey={saveApiKey}
        onDeleteApiKey={deleteApiKey}
      />
    </div>
  );
}

// Landing page component for choosing between creator and calculator modes
function LandingPage() {
  return (
    <div className="landing-container">
      <h2>What would you like to do?</h2>
      <div className="landing-options">
        <button 
          className="landing-option-button"
          onClick={() => window.location.href = '?mode=creator'}
        >
          <svg className="option-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="option-title">Split bill with friends</div>
          <div className="option-description">
            You're paying and want others to pay you back
          </div>
        </button>
        
        <button 
          className="landing-option-button"
          onClick={() => window.location.href = '?mode=calculator'}
        >
          <svg className="option-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="8" y="6" width="8" height="4" rx="1" fill="currentColor"/>
            <line x1="8" y1="14" x2="8" y2="14.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="12" y1="14" x2="12" y2="14.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="16" y1="14" x2="16" y2="14.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="8" y1="18" x2="8" y2="18.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="12" y1="18" x2="12" y2="18.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="16" y1="18" x2="16" y2="18.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <div className="option-title">Calculate what I owe</div>
          <div className="option-description">
            Someone else is paying and you want to figure out your portion of the bill
          </div>
        </button>
      </div>
    </div>
  );
}

// Calculator choice page for choosing between receipt upload and manual entry
interface CalculatorChoicePageProps {
  receiptUploadEnabled: boolean;
  onReceiptUploadClick: () => void;
  onManualEntryClick: () => void;
  isProcessingReceipt: boolean;
  receiptError: string | null;
  onReceiptUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function CalculatorChoicePage({
  receiptUploadEnabled,
  onReceiptUploadClick,
  onManualEntryClick,
  isProcessingReceipt,
  receiptError,
  onReceiptUpload
}: CalculatorChoicePageProps) {
  React.useEffect(() => {
    if (!receiptUploadEnabled) {
      onManualEntryClick();
    }
  }, [receiptUploadEnabled, onManualEntryClick]);

  if (!receiptUploadEnabled) {
    return null;
  }

  return (
    <div className="calculator-choice-container">
      <input
        type="file"
        id="receipt-upload"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={onReceiptUpload}
        style={{ display: 'none' }}
        disabled={isProcessingReceipt}
      />
      <h2>How would you like to enter the receipt info?</h2>
      <div className="calculator-options">
        <button 
          className="calculator-option-button"
          onClick={onReceiptUploadClick}
          disabled={isProcessingReceipt}
        >
          <svg className="option-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="option-title">
            {isProcessingReceipt ? 'Processing...' : 'Upload Receipt'}
          </div>
          <div className="option-description">
            Scan your receipt photo
          </div>
        </button>
        
        <button 
          className="calculator-option-button"
          onClick={onManualEntryClick}
        >
          <svg className="option-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 3C17.5304 3 18.0391 3.21071 18.4142 3.58579L20.4142 5.58579C20.7893 5.96086 21 6.46957 21 7V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V4C3 3.46957 3.21071 2.96086 3.58579 2.58579C3.96086 2.21071 4.46957 2 5 2H16C16.2652 2 16.5196 2.10536 16.7071 2.29289L17 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 9H15M9 13H15M9 17H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="option-title">Manual Entry</div>
          <div className="option-description">
            Type in the details yourself
          </div>
        </button>
      </div>
      {receiptError && (
        <div className="error-message">{receiptError}</div>
      )}
    </div>
  );
}

// Error boundary component for QR code generation
class QRCodeErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('QR Code generation failed:', error);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export default App;
