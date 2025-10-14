// Error boundary component for QR code generation.
// Catches errors during QR code rendering (e.g., when receipt data is too large)
// and gracefully handles them by notifying the parent component via onError callback.

import React from 'react';

interface QRCodeErrorBoundaryProps {
  children: React.ReactNode;
  onError: () => void;
}

interface QRCodeErrorBoundaryState {
  hasError: boolean;
}

export class QRCodeErrorBoundary extends React.Component<
  QRCodeErrorBoundaryProps,
  QRCodeErrorBoundaryState
> {
  constructor(props: QRCodeErrorBoundaryProps) {
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
