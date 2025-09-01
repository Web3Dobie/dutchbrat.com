'use client';

import React, { useEffect, useRef, memo } from 'react';

function EconomicCalendarWidget() {
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Ensure the container is available and hasn't been filled yet
        if (container.current && container.current.children.length === 0) {
            const script = document.createElement('script');
            script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
            script.type = 'text/javascript';
            script.async = true;
            script.innerHTML = JSON.stringify({
                "colorTheme": "dark",
                "isTransparent": true,
                "width": "100%",
                "height": "600",
                "locale": "en",
                "importanceFilter": "0,1,2,3",
                "currencyFilter": "USD,EUR,JPY,GBP,CAD,AUD,NZD,CHF,CNY"
            });
            container.current.appendChild(script);
        }

        // This is the crucial cleanup function.
        // It runs when the component unmounts. In Strict Mode, this happens once
        // before the component mounts for the final time.
        return () => {
            if (container.current) {
                container.current.innerHTML = '';
            }
        };
    }, []); // The empty dependency array ensures this effect runs only on mount/unmount

    return (
        <div className="tradingview-widget-container" ref={container} style={{ minHeight: '600px' }}>
            <div className="tradingview-widget-container__widget"></div>
        </div>
    );
}

export default memo(EconomicCalendarWidget);