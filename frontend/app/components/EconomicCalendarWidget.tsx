'use client';

import React from 'react';
// --- Use the correct, newly installed library ---
import { EconomicCalendar } from "react-ts-tradingview-widgets";

function EconomicCalendarWidget() {
    return (
        <EconomicCalendar
            colorTheme="light"
            isTransparent={false}
            width="100%"
            height={600}
            locale="en"
        />
    );
}

export default EconomicCalendarWidget;