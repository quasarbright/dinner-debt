// Calculator choice page for choosing between receipt upload and manual entry.
// Displays two options when receipt upload is enabled:
// 1. Upload Receipt - scan a receipt photo using AI
// 2. Manual Entry - type in bill details manually
// If receipt upload is disabled, automatically proceeds to manual entry.

import React from 'react';

export interface CalculatorChoicePageProps {
  receiptUploadEnabled: boolean;
  onReceiptUploadClick: () => void;
  onManualEntryClick: () => void;
  isProcessingReceipt: boolean;
  receiptError: string | null;
  onReceiptUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CalculatorChoicePage({
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
      <h2>How would you like to enter the bill?</h2>
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
