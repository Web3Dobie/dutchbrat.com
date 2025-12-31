"use client";

import React from "react";
import { format } from "date-fns";
import StarRating from "./StarRating";

interface ReviewCardProps {
    rating: number;
    reviewText: string;
    serviceType: string;
    serviceDate: string;
    serviceNote: string | null;
    customerFirstName: string;
    dogNames: string[];
    dogImages: string[];
    adminResponse?: string | null;
    adminResponseDate?: string | null;
}

export default function ReviewCard({
    rating,
    reviewText,
    serviceType,
    serviceDate,
    serviceNote,
    customerFirstName,
    dogNames,
    dogImages,
    adminResponse,
    adminResponseDate
}: ReviewCardProps) {
    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), "MMMM yyyy");
        } catch {
            return dateString;
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 space-y-4">
            {/* Header: Dog image, name, and service info */}
            <div className="flex items-start gap-4">
                {/* Dog Image */}
                {dogImages.length > 0 && (
                    <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-blue-500">
                            <img
                                src={`/images/dogs/${dogImages[0]}`}
                                alt="Dog"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/images/default-dog.png';
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Service Info */}
                <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                        <StarRating rating={rating} readonly size="sm" />
                    </div>
                    <p className="text-gray-400 text-sm">
                        {serviceType}
                    </p>
                    <p className="text-gray-500 text-xs">
                        {formatDate(serviceDate)}
                    </p>
                </div>
            </div>

            {/* Service Note from Ernesto */}
            {serviceNote && (
                <div className="bg-blue-900/30 border-l-4 border-blue-500 p-3 rounded-r">
                    <p className="text-blue-300 text-sm italic">
                        "{serviceNote}"
                    </p>
                    <p className="text-blue-400 text-xs mt-1">
                        - Ernesto
                    </p>
                </div>
            )}

            {/* Customer Review */}
            <div className="space-y-2">
                <p className="text-gray-200 leading-relaxed">
                    "{reviewText}"
                </p>
                <p className="text-gray-400 text-sm">
                    - {customerFirstName}
                </p>
            </div>

            {/* Admin Response */}
            {adminResponse && (
                <div className="bg-green-900/30 border-l-4 border-green-500 p-3 rounded-r mt-3">
                    <p className="text-green-300 text-sm">
                        {adminResponse}
                    </p>
                    <p className="text-green-400 text-xs mt-1">
                        - Ernesto, Hunter's Hounds
                    </p>
                </div>
            )}
        </div>
    );
}
