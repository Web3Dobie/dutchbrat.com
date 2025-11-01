import React from "react";
import { format, isSameDay } from "date-fns";

interface BookingSuccessProps {
    serviceName: string;
    bookingStart: Date | null;     // ✅ Keep original prop for backward compatibility
    endTime?: Date | null;         // ✅ Optional new prop for multi-day bookings
    onBookAnother: () => void;     // ✅ Keep original handler name
}

export default function BookingSuccess({ 
    serviceName, 
    bookingStart, 
    endTime,
    onBookAnother 
}: BookingSuccessProps) {
    // Determine if this is a multi-day booking
    const isMultiDay = bookingStart && endTime && !isSameDay(bookingStart, endTime);
    
    // Format the booking details for display
    const getBookingDetailsText = () => {
        if (!bookingStart) return "Your booking";
        
        if (isMultiDay && endTime) {
            // Multi-day booking: "Monday Dec 22 at 17:30 to Sunday Dec 29 at 23:30"
            return (
                <>
                    <strong>{format(bookingStart, "EEEE, MMMM d")}</strong> at{" "}
                    <strong>{format(bookingStart, "HH:mm")}</strong> to{" "}
                    <strong>{format(endTime, "EEEE, MMMM d")}</strong> at{" "}
                    <strong>{format(endTime, "HH:mm")}</strong>
                </>
            );
        } else {
            // Single-day booking: "Monday, December 22 at 17:30"
            const endTimeText = endTime ? ` - ${format(endTime, "HH:mm")}` : "";
            return (
                <>
                    <strong>{format(bookingStart, "EEEE, MMMM d")}</strong> at{" "}
                    <strong>{format(bookingStart, "HH:mm")}{endTimeText}</strong>
                </>
            );
        }
    };

    return (
        <div className="max-w-lg mx-auto text-center space-y-6">
            {/* Success Icon */}
            <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
                    <svg
                        className="w-8 h-8 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                </div>
            </div>

            {/* Success Message */}
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-green-400">
                    Booking Confirmed!
                </h2>
                <p className="text-gray-300">
                    Thank you for booking. You will receive a confirmation email shortly with all the details.
                </p>
            </div>

            {/* Booking Details */}
            {bookingStart && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="space-y-2">
                        <p className="text-sm text-gray-400 uppercase tracking-wide">
                            Your {serviceName}
                        </p>
                        <p className="text-white text-lg">
                            {getBookingDetailsText()}
                        </p>
                        {isMultiDay && (
                            <p className="text-sm text-blue-400 mt-2">
                                Multi-day booking confirmed
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
                <button
                    onClick={onBookAnother}
                    className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
                >
                    Book Another Service
                </button>

                <button
                    onClick={() => window.history.back()}
                    className="w-full p-3 bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white font-medium rounded-lg transition-colors duration-200"
                >
                    Back to Service Page
                </button>
            </div>

            {/* Contact Info */}
            <div className="pt-4 border-t border-gray-700 text-sm text-gray-400">
                <p>Questions about your booking?</p>
                <p className="text-white font-medium">Call us at 07932749772</p>
            </div>
        </div>
    );
}