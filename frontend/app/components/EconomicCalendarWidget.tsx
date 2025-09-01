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
                "colorTheme": "light",
                // --- FIX #1: Force the widget to draw its own background ---
                "isTransparent": false,
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
        // --- FIX #2: Wrap the widget in a styled container to create the "sandbox" ---
        <div className="bg-white rounded-lg p-2">
            <div className="tradingview-widget-container" ref={container}>
                <div className="tradingview-widget-container__widget"></div>
            </div>
        </div>
    );
}

export default memo(EconomicCalendarWidget);