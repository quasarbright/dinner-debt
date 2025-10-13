// Reusable expand/collapse indicator icon component.
// Shows a right-pointing chevron when collapsed, down-pointing when expanded.

import React from 'react';

interface ExpandIndicatorProps {
  isExpanded: boolean;
  className?: string;
}

export function ExpandIndicator({ isExpanded, className = '' }: ExpandIndicatorProps) {
  return (
    <svg 
      width="12" 
      height="12" 
      viewBox="0 0 12 12" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ 
        transition: 'transform 0.2s',
        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
      }}
    >
      <path 
        d="M4 2L8 6L4 10" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
}

