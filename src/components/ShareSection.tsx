// Share section component for displaying QR code and share links.
// Provides collapsible interface for sharing the current bill state via:
// - QR code generation (with error boundary for oversized data)
// - Copy link button
// - Share link button (uses native share API when available)

import React from 'react';
import QRCode from 'react-qr-code';
import { useShareLink } from '../hooks/useShareLink';
import { ExpandIndicator } from './ExpandIndicator';
import { QRCodeErrorBoundary } from './QRCodeErrorBoundary';

interface ShareSectionProps {
  getFormState?: () => any;
  formState?: any;
  showAsStep?: boolean;
}

export function ShareSection({ getFormState, formState, showAsStep = false }: ShareSectionProps) {
  const {
    showQRCode,
    setShowQRCode,
    linkCopied,
    qrCodeError,
    setQrCodeError,
    getShareUrl,
    handleCopyLink,
    handleShareLink
  } = useShareLink({ 
    getFormState: getFormState || (() => formState)
  });

  const shouldShowQRCode = showAsStep || showQRCode;

  return (
    <section className="form-section">
      {!showAsStep && (
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
      )}
      
      {shouldShowQRCode && (
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
  );
}
