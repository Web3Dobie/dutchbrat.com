import React from "react";
import { SERVICES } from "./MobileBookingCalendar";

type ServiceId = "meetgreet" | "solo" | "quick" | "sitting";

interface ServiceSelectorProps {
    selectedServiceId: ServiceId;
    onServiceChange: (serviceId: ServiceId) => void;
}

export default function ServiceSelector({ selectedServiceId, onServiceChange }: ServiceSelectorProps) {
    return (
        <div className="space-y-4">
            {/* Mobile-first heading */}
            <h3 className="text-lg font-semibold text-white">
                1. Select Service
            </h3>

            {/* Mobile: Large touch-friendly dropdown */}
            <div className="block sm:hidden">
                <select
                    value={selectedServiceId}
                    onChange={(e) => onServiceChange(e.target.value as ServiceId)}
                    className="w-full p-4 text-lg bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    {SERVICES.map((service) => (
                        <option key={service.id} value={service.id}>
                            {service.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Tablet/Desktop: Card-based selection */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {SERVICES.map((service) => {
                    const isSelected = service.id === selectedServiceId;

                    return (
                        <button
                            key={service.id}
                            onClick={() => onServiceChange(service.id)}
                            className={`
                                p-4 rounded-lg border-2 transition-all duration-200 text-left
                                ${isSelected
                                    ? 'border-blue-500 bg-blue-600 text-white'
                                    : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
                                }
                            `}
                        >
                            <div className="font-medium text-sm">
                                {service.name}
                            </div>
                            {service.duration && (
                                <div className="text-xs opacity-75 mt-1">
                                    {service.duration} minutes
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Service description for mobile */}
            <div className="block sm:hidden p-3 bg-gray-800 rounded-lg border border-gray-600">
                <div className="text-sm text-gray-300">
                    {selectedServiceId === "meetgreet" && "Free 30-minute introduction for new clients"}
                    {selectedServiceId === "solo" && "60-minute individual walk with full attention"}
                    {selectedServiceId === "quick" && "30-minute park visit and playtime"}
                    {selectedServiceId === "sitting" && "Flexible duration home visits when needed"}
                </div>
            </div>
        </div>
    );
}