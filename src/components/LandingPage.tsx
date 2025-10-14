// Landing page component for choosing between session creator and calculator modes.
// Presents users with two clear options for their use case:
// 1. Split bill with friends (session creator mode)
// 2. Calculate what I owe (calculator mode)

import React from 'react';

export function LandingPage() {
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
