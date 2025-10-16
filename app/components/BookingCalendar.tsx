// file: frontend/app/components/BookingCalendar.tsx
"use client";

import React from 'react';
import Script from 'next/script'; // Import the Next.js Script component

export function BookingCalendar() {
  // Use your main Calendly page URL to show ALL available events (30 min, 60 min, etc.)
  const calendlyUrl = "https://calendly.com/hunters-hounds";

  return (
    <>
      {/* This div will now load your main booking page with all event options */}
      <div 
        className="calendly-inline-widget" 
        data-url={calendlyUrl}
        style={{ minWidth: '320px', height: '650px' }}
      >
      </div>
      
      {/* This is the optimized Next.js way to load the Calendly script */}
      <Script 
        type="text/javascript" 
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="afterInteractive"
      />
    </>
  );
}