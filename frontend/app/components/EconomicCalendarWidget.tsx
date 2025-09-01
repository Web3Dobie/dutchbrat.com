'use client';

import React, { useEffect, useRef, memo } from 'react';

function EconomicCalendarWidget() {
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (container.current && container.current.children.length === 0) {
            const script = document.createElement('script');
            script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
            script.type = 'text/javascript';
            script.async = true;
            script.innerHTML = JSON.stringify({
                // --- THIS IS THE FIX ---
                "colorTheme": "light", // Changed from "dark" to "light" for visibility
                "isTransparent": true,
                "width": "100%",
                "height": "600",
                "locale": "en",
                "importanceFilter": "0,1,2,3",
                "currencyFilter": "USD,EUR,JPY,GBP,CAD,AUD,NZD,CHF,CNY"
            });
            container.current.appendChild(script);
        }

        return () => {
            if (container.current) {
                container.current.innerHTML = '';
            }
        };
    }, []);

    return (
        <div className="tradingview-widget-container" ref={container} style={{ minHeight: '600px' }}>
            <div className="tradingview-widget-container__widget"></div>
        </div>
    );
}

export default memo(EconomicCalendarWidget);