// Generate Venmo payment URLs for mobile and desktop.
// Mobile uses venmo:// scheme, desktop uses https:// scheme with @ prefix for recipients.

export function getVenmoUrl(amount: string, note: string, recipient?: string): string {
  const isMobile = isMobileDevice();
  
  if (isMobile) {
    // Use venmo:// scheme for mobile (no @ symbol for recipient)
    const baseUrl = 'venmo://paycharge?txn=pay';
    const params = `amount=${amount}&note=${note}`;
    return recipient 
      ? `${baseUrl}&${params}&recipients=${recipient}`
      : `${baseUrl}&${params}`;
  } else {
    // Use https:// for desktop (@ symbol required for recipient)
    const baseUrl = 'https://venmo.com/?txn=pay';
    const params = `amount=${amount}&note=${note}`;
    return recipient 
      ? `${baseUrl}&${params}&recipients=@${recipient}`
      : `${baseUrl}&${params}`;
  }
}

function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

