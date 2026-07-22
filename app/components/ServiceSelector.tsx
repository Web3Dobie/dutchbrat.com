import React from "react";

type ServiceId = "meetgreet" | "solo" | "quick" | "sitting";

interface Service {
    id: ServiceId;
    name: string;
    duration: number | null;
    disabled?: boolean;
    disabledMessage?: string;
}

interface ServiceSelectorProps {
    services: readonly Service[];
    selectedServiceId: ServiceId;
    onServiceChange: (serviceId: ServiceId) => void;
}

export default function ServiceSelector({ services, selectedServiceId, onServiceChange }: ServiceSelectorProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">
                1. Select Service
            </h3>

            {/* Mobile: Large touch-friendly dropdown */}
            <div className="block sm:hidden">
                <select
                    value={selectedServiceId}
                    onChange={(e) => {
                        const svc = services.find(s => s.id === e.target.value);
                        if (!svc?.disabled) onServiceChange(e.target.value as ServiceId);
                    }}
                    className="w-full p-4 text-lg bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    {services.map((service) => (
                        <option key={service.id} value={service.id} disabled={service.disabled}>
                            {service.name}{service.disabled ? " — contact us" : ""}
                        </option>
                    ))}
                </select>
                {/* Show contact message below dropdown when a disabled service would be shown */}
                {services.find(s => s.disabled) && (
                    <p className="mt-2 text-xs text-gray-400">
                        * Dog Sitting is currently by arrangement only — please get in touch directly.
                    </p>
                )}
            </div>

            {/* Tablet/Desktop: Card-based selection */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {services.map((service) => {
                    const isSelected = service.id === selectedServiceId;

                    if (service.disabled) {
                        return (
                            <div
                                key={service.id}
                                className="p-4 rounded-lg border-2 border-gray-700 bg-gray-900 text-left opacity-60 cursor-default"
                            >
                                <div className="font-semibold text-sm text-gray-400">{service.name}</div>
                                {service.disabledMessage && (
                                    <div className="mt-1 text-xs text-amber-400 leading-snug">{service.disabledMessage}</div>
                                )}
                            </div>
                        );
                    }

                    return (
                        <button
                            key={service.id}
                            onClick={() => onServiceChange(service.id)}
                            className={`
                                p-4 rounded-lg border-2 transition-all duration-200 text-left
                                ${isSelected
                                    ? "bg-blue-600 border-blue-500 text-white shadow-lg"
                                    : "bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-700"
                                }
                            `}
                        >
                            <div className="font-semibold text-sm">{service.name}</div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}