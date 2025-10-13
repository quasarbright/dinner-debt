// Manage QR code and link sharing functionality.
// Handles QR code display, link copying, and native share API integration.

import { useState } from 'react';
import type { FormState } from '../types';
import { encodeFormState } from '../utils/shareUrl';

interface UseShareLinkProps {
  getFormState: () => FormState;
}

export function useShareLink({ getFormState }: UseShareLinkProps) {
  const [showQRCode, setShowQRCode] = useState<boolean>(false);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);
  const [qrCodeError, setQrCodeError] = useState<boolean>(false);

  const getShareUrl = (): string => {
    const formState = getFormState();
    const encoded = encodeFormState(formState);
    return `${window.location.origin}${window.location.pathname}?data=${encoded}`;
  };

  const handleCopyLink = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleShareLink = async () => {
    const url = getShareUrl();
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Dinner Debt',
          text: 'Split the bill with me',
          url: url
        });
      } else {
        await handleCopyLink();
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  return {
    showQRCode,
    setShowQRCode,
    linkCopied,
    qrCodeError,
    setQrCodeError,
    getShareUrl,
    handleCopyLink,
    handleShareLink
  };
}

