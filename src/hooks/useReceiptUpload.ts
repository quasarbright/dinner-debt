// Handle receipt upload processing and state.
// Manages file upload, API key validation, and coordinates with receipt processor.

import { useState } from 'react';
import { processReceipt } from '../receiptProcessor';
import type { ReceiptData } from '../types';

interface UseReceiptUploadProps {
  onPopulateForm: (data: ReceiptData) => void;
  onApiKeyMissing: () => void;
  onUploadSuccess?: () => void;
}

export function useReceiptUpload({ onPopulateForm, onApiKeyMissing, onUploadSuccess }: UseReceiptUploadProps) {
  const [isProcessingReceipt, setIsProcessingReceipt] = useState<boolean>(false);
  const [receiptError, setReceiptError] = useState<string>();

  const handleReceiptUploadClick = () => {
    const apiKey = localStorage.getItem('openrouter_api_key');
    if (!apiKey) {
      onApiKeyMissing();
      return;
    }
    
    const fileInput = document.getElementById('receipt-upload') as HTMLInputElement;
    fileInput?.click();
  };

  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const apiKey = localStorage.getItem('openrouter_api_key');
    if (!apiKey) {
      event.target.value = '';
      return;
    }

    setIsProcessingReceipt(true);
    setReceiptError(undefined);

    try {
      console.log('Receipt selected:', file.name, file.type);
      
      const parsedData = await processReceipt(file, apiKey);
      onPopulateForm(parsedData);
      onUploadSuccess?.();
      
    } catch (error) {
      console.error('Error processing receipt:', error);
      setReceiptError(error instanceof Error ? error.message : 'Failed to process receipt');
    } finally {
      setIsProcessingReceipt(false);
      event.target.value = '';
    }
  };

  return {
    isProcessingReceipt,
    receiptError,
    handleReceiptUploadClick,
    handleReceiptUpload
  };
}

