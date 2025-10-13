// Tests for useReceiptUpload hook.
// Demonstrates that the receipt processor mock is automatically used,
// preventing accidental API calls during component tests.

import { renderHook, act } from '@testing-library/react';
import { useReceiptUpload } from './useReceiptUpload';

jest.mock('../receiptProcessor');

const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('useReceiptUpload', () => {
  const mockOnPopulateForm = jest.fn();
  const mockOnApiKeyMissing = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() =>
      useReceiptUpload({
        onPopulateForm: mockOnPopulateForm,
        onApiKeyMissing: mockOnApiKeyMissing,
      })
    );

    expect(result.current.isProcessingReceipt).toBe(false);
    expect(result.current.receiptError).toBeUndefined();
  });

  it('should call onApiKeyMissing when API key is not found', () => {
    const { result } = renderHook(() =>
      useReceiptUpload({
        onPopulateForm: mockOnPopulateForm,
        onApiKeyMissing: mockOnApiKeyMissing,
      })
    );

    act(() => {
      result.current.handleReceiptUploadClick();
    });

    expect(mockOnApiKeyMissing).toHaveBeenCalled();
  });

  it('should process receipt using mock (no API calls)', async () => {
    mockLocalStorage.setItem('openrouter_api_key', 'test-key');

    const { result } = renderHook(() =>
      useReceiptUpload({
        onPopulateForm: mockOnPopulateForm,
        onApiKeyMissing: mockOnApiKeyMissing,
      })
    );

    const mockFile = new File(['mock'], 'test.png', { type: 'image/png' });
    const mockEvent = {
      target: {
        files: [mockFile],
        value: 'test.png',
      },
    } as any;

    await act(async () => {
      await result.current.handleReceiptUpload(mockEvent);
    });

    expect(mockOnPopulateForm).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.any(Array),
        subtotal: expect.any(Number),
        total: expect.any(Number),
      })
    );
    expect(result.current.receiptError).toBeUndefined();
  });
});

