import React from "react";
import { format } from "date-fns";

interface BookingSuccessProps {
    serviceName: string;
    bookingStart: Date | null;
    onBookAnother: () => void;
}

export default function BookingSuccess({ serviceName, bookingStart, onBookAnother }: BookingSuccessProps) {
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
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 space-y-3">
                    <h3 className="font-semibold text-white text-lg">Your Booking</h3>

                    <div className="space-y-2 text-left">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Service:</span>
                            <span className="text-white font-medium">{serviceName}</span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-400">Date:</span>
                            <span className="text-white font-medium">
                                {format(bookingStart, "EEEE, MMMM d, yyyy")}
                            </span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-400">Time:</span>
                            <span className="text-white font-medium">
                                {format(bookingStart, "HH:mm")}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Notice */}
            <div className="bg-amber-900 border border-amber-600 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                        <svg
                            className="w-5 h-5 text-amber-400 mt-0.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </div>
                    <div className="text-sm">
                        <p className="text-amber-200 font-medium mb-1">Email Tip</p>
                        <p className="text-amber-300">
                            If you don't see your confirmation email within a few minutes,
                            please check your spam/junk folder and mark it as "not spam" for future emails.
                        </p>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
                <button
                    onClick={onBookAnother}
                    className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
                >
                    Book Another Walk
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