import React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

interface ResponsiveDatePickerProps {
    selectedDay: Date | undefined;
    onDaySelect: (day: Date | undefined) => void;
}

export default function ResponsiveDatePicker({ selectedDay, onDaySelect }: ResponsiveDatePickerProps) {
    // Disable past days and weekends
    const disabledDays = [
        { before: new Date() },
        { dayOfWeek: [0, 6] } // Sunday = 0, Saturday = 6
    ];

    return (
        <div className="space-y-4">
            {/* Mobile-first heading */}
            <h3 className="text-lg font-semibold text-white">
                2. Select Date
            </h3>

            {/* Calendar container with responsive layout */}
            <div className="bg-gray-800 rounded-lg border border-gray-600 p-4">
                <div className="flex justify-center">
                    <DayPicker
                        mode="single"
                        selected={selectedDay}
                        onSelect={onDaySelect}
                        disabled={disabledDays}
                        showOutsideDays
                        fixedWeeks
                        className="mobile-calendar"
                        classNames={{
                            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                            month: "space-y-4",
                            caption: "flex justify-center pt-1 relative items-center text-white",
                            caption_label: "text-sm font-medium",
                            nav: "space-x-1 flex items-center",
                            nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-white",
                            nav_button_previous: "absolute left-1",
                            nav_button_next: "absolute right-1",
                            table: "w-full border-collapse space-y-1",
                            head_row: "flex",
                            head_cell: "text-gray-400 rounded-md w-9 font-normal text-[0.8rem]",
                            row: "flex w-full mt-2",
                            cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-gray-900/50 [&:has([aria-selected])]:bg-gray-900 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                            day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white rounded-md",
                            day_selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white",
                            day_today: "bg-gray-700 text-white",
                            day_outside: "text-gray-500 opacity-50 aria-selected:bg-gray-900/50 aria-selected:text-gray-500 aria-selected:opacity-30",
                            day_disabled: "text-gray-600 opacity-50 cursor-not-allowed",
                            day_range_middle: "aria-selected:bg-gray-900 aria-selected:text-white",
                            day_hidden: "invisible",
                        }}
                    />
                </div>

                {/* Mobile helper text */}
                <div className="mt-4 text-xs text-gray-400 text-center">
                    Available Monday - Friday only
                </div>
            </div>

            {/* Selected date display for mobile */}
            {selectedDay && (
                <div className="block sm:hidden p-3 bg-blue-900 border border-blue-600 rounded-lg">
                    <div className="text-sm text-blue-200">
                        Selected: <span className="font-medium text-white">
                            {selectedDay.toLocaleDateString('en-GB', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}