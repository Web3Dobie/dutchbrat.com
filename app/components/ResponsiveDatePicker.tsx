import React from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';

interface ResponsiveDatePickerProps {
    selectedDay: Date | undefined;
    onDaySelect: (day: Date | undefined) => void;
}

export default function ResponsiveDatePicker({
    selectedDay,
    onDaySelect,
}: ResponsiveDatePickerProps) {

    // Helper to determine the start of the next month
    const today = new Date();

    return (
        <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-300">
                2. Select Date
            </h4>
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-600 flex justify-center w-full">
                <DayPicker
                    mode="single"
                    selected={selectedDay}
                    onSelect={onDaySelect}
                    disabled={{ before: today }}
                    // This class must be applied to link to the styles in globals.css
                    className="rdp-custom-compact"
                    showOutsideDays={true}
                // Removed captionLayout="buttons" to fix TypeScript error
                />
            </div>
            <p className="text-xs text-gray-400 text-center">
                Available Monday - Friday only
            </p>
        </div>
    );
}