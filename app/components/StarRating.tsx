"use client";

import React, { useState } from "react";

interface StarRatingProps {
    rating: number;
    onRatingChange?: (rating: number) => void;
    readonly?: boolean;
    size?: "sm" | "md" | "lg";
}

export default function StarRating({
    rating,
    onRatingChange,
    readonly = false,
    size = "md"
}: StarRatingProps) {
    const [hoverRating, setHoverRating] = useState(0);

    const sizeClasses = {
        sm: "w-5 h-5",
        md: "w-8 h-8",
        lg: "w-12 h-12"
    };

    const handleClick = (starValue: number) => {
        if (!readonly && onRatingChange) {
            onRatingChange(starValue);
        }
    };

    const handleMouseEnter = (starValue: number) => {
        if (!readonly) {
            setHoverRating(starValue);
        }
    };

    const handleMouseLeave = () => {
        if (!readonly) {
            setHoverRating(0);
        }
    };

    const displayRating = hoverRating || rating;

    return (
        <div
            className="flex gap-1"
            onMouseLeave={handleMouseLeave}
        >
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => handleClick(star)}
                    onMouseEnter={() => handleMouseEnter(star)}
                    disabled={readonly}
                    className={`
                        ${sizeClasses[size]}
                        ${readonly ? "cursor-default" : "cursor-pointer"}
                        transition-transform duration-150
                        ${!readonly && "hover:scale-110 active:scale-95"}
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded
                    `}
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill={star <= displayRating ? "#facc15" : "none"}
                        stroke={star <= displayRating ? "#facc15" : "#6b7280"}
                        strokeWidth={1.5}
                        className="w-full h-full"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                        />
                    </svg>
                </button>
            ))}
        </div>
    );
}
