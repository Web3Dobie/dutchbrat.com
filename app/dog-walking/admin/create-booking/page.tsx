"use client";

import React, { useState, useEffect } from "react";
import { format, addMinutes, isPast } from "date-fns";
import { getSoloWalkPrice } from "@/lib/pricing";

// Updated service options with both solo walk durations
const SERVICE_OPTIONS = [
    { id: "Meet & Greet - for new clients", name: "Meet & Greet (30 min, FREE)", duration: 30, type: "fixed" },
    { id: "Quick Walk (30 min)", name: "Quick Walk (30 min, £10)", duration: 30, type: "fixed" },
    { id: "Solo Walk (60 min)", name: "Solo Walk (1 hour)", duration: 60, type: "solo_walk" },
    { id: "Solo Walk (120 min)", name: "Solo Walk (2 hours)", duration: 120, type: "solo_walk" },
    { id: "Dog Sitting (Variable)", name: "Dog Sitting (Variable, POA)", duration: null, type: "variable" },
];

interface Client {
    id: number;
    owner_name: string;
    phone: string;
    email: string;
    address: string;
    dogs: {
        id: number;
        dog_name: string;
        dog_breed: string;
        dog_age: number;
    }[];
}

interface Customer {
    owner_id: number;
    owner_name: string;
    phone: string;
    email: string;
    address: string;
    dogs: {
        id: number;
        dog_name: string;
        dog_breed: string;
        dog_age: number;
    }[];
}

interface BookingData {
    owner_id: number;
    dog_id_1: number;
    dog_id_2?: number;
    service_type: string;
    start_time: string;
    duration_minutes?: number;
    end_time?: string;
    notes?: string;
    create_calendar_event?: boolean;
    send_email?: boolean;
}

export default function AdminCreateBooking() {
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [bookingData, setBookingData] = useState<Partial<BookingData>>({
        service_type: "Meet & Greet - for new clients",
        create_calendar_event: true,
        send_email: false,
    });

    const [selectedDogs, setSelectedDogs] = useState<number[]>([]);
    const [bookingDate, setBookingDate] = useState("");
    const [bookingTime, setBookingTime] = useState("");
    const [endDate, setEndDate] = useState("");
    const [endTime, setEndTime] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [loadingClients, setLoadingClients] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<any>(null);

    // Load all clients on page mount
    useEffect(() => {
        const loadClients = async () => {
            try {
                setLoadingClients(true);
                const response = await fetch("/api/dog-walking/admin/clients?limit=100"); // Get more clients
                const data = await response.json();

                if (response.ok && data.clients) {
                    // Sort clients alphabetically by name
                    const sortedClients = data.clients.sort((a: Client, b: Client) =>
                        a.owner_name.localeCompare(b.owner_name)
                    );
                    setClients(sortedClients);
                } else {
                    setError("Failed to load clients");
                }
            } catch (err) {
                setError("Failed to load clients");
            } finally {
                setLoadingClients(false);
            }
        };

        loadClients();
    }, []);

    // Calculate pricing display for solo walks
    const getSoloWalkPriceDisplay = (duration: number, dogCount: number) => {
        const price = getSoloWalkPrice(duration, dogCount);
        return `£${price.toFixed(2)}`;
    };

    // Get current service pricing display
    const getCurrentPriceDisplay = () => {
        const service = SERVICE_OPTIONS.find(s => s.id === bookingData.service_type);
        if (!service) return "";

        if (service.type === "solo_walk" && selectedDogs.length > 0) {
            const dogCount = selectedDogs.length;
            const price = getSoloWalkPriceDisplay(service.duration!, dogCount);
            return ` - ${price} (${dogCount} dog${dogCount > 1 ? 's' : ''})`;
        }

        // Return default pricing for other services
        if (service.name.includes("FREE")) return " - FREE";
        if (service.name.includes("£10")) return " - £10";
        if (service.name.includes("POA")) return " - POA";

        return "";
    };

    // Handle client selection
    const handleClientSelect = (clientId: string) => {
        const id = parseInt(clientId);
        setSelectedClientId(id);
        setError(null);

        if (id === 0) {
            // "Select a client..." option
            setCustomer(null);
            setSelectedDogs([]);
            return;
        }

        const selectedClient = clients.find(c => c.id === id);
        if (selectedClient) {
            // Convert Client to Customer format
            const customerData: Customer = {
                owner_id: selectedClient.id,
                owner_name: selectedClient.owner_name,
                phone: selectedClient.phone,
                email: selectedClient.email,
                address: selectedClient.address,
                dogs: selectedClient.dogs || []
            };

            setCustomer(customerData);

            // Auto-select first dog if available
            if (customerData.dogs.length > 0) {
                setSelectedDogs([customerData.dogs[0].id]);
            } else {
                setSelectedDogs([]);
            }
        }
    };

    // Handle dog selection
    const handleDogToggle = (dogId: number) => {
        setSelectedDogs(prev => {
            if (prev.includes(dogId)) {
                return prev.filter(id => id !== dogId);
            } else if (prev.length < 2) {
                return [...prev, dogId];
            }
            return prev; // Max 2 dogs
        });
    };

    // Handle service change
    const handleServiceChange = (serviceId: string) => {
        const service = SERVICE_OPTIONS.find(s => s.id === serviceId);
        setBookingData(prev => ({
            ...prev,
            service_type: serviceId,
            duration_minutes: service?.duration || undefined,
        }));
    };

    // Handle booking submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customer || selectedDogs.length === 0 || !bookingDate || !bookingTime) {
            setError("Please fill in all required fields");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Construct start time
            const startTime = new Date(`${bookingDate}T${bookingTime}`);

            // Determine if this is single or multi-day
            const isMultiDay = bookingData.service_type === "Dog Sitting (Variable)" && endDate && endTime;

            let submitData: BookingData = {
                owner_id: customer.owner_id,
                dog_id_1: selectedDogs[0],
                dog_id_2: selectedDogs[1] || undefined,
                service_type: bookingData.service_type!,
                start_time: startTime.toISOString(),
                notes: bookingData.notes,
                create_calendar_event: bookingData.create_calendar_event,
                send_email: bookingData.send_email,
            };

            // Add duration or end time based on service type
            if (isMultiDay) {
                const endDateTime = new Date(`${endDate}T${endTime}`);
                submitData.end_time = endDateTime.toISOString();
            } else {
                submitData.duration_minutes = bookingData.duration_minutes;
            }

            const response = await fetch("/api/dog-walking/admin/create-booking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(submitData),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to create booking");
            }

            setSuccess(result);
            // Reset form
            setCustomer(null);
            setSelectedClientId(null);
            setSelectedDogs([]);
            setBookingDate("");
            setBookingTime("");
            setEndDate("");
            setEndTime("");
            setBookingData({
                service_type: "Meet & Greet - for new clients",
                create_calendar_event: true,
                send_email: false,
            });

        } catch (err: any) {
            setError(err.message || "Failed to create booking");
        } finally {
            setIsLoading(false);
        }
    };

    const styles = {
        container: {
            maxWidth: "800px",
            margin: "0 auto",
            padding: "24px",
            backgroundColor: "#111827",
            borderRadius: "8px",
        } as React.CSSProperties,
        title: {
            fontSize: "1.5rem",
            fontWeight: "bold",
            color: "#d1d5db",
            marginBottom: "24px",
        } as React.CSSProperties,
        section: {
            marginBottom: "24px",
            padding: "20px",
            backgroundColor: "#1f2937",
            borderRadius: "8px",
            border: "1px solid #374151",
        } as React.CSSProperties,
        label: {
            display: "block",
            marginBottom: "8px",
            fontWeight: "bold",
            color: "#d1d5db",
        } as React.CSSProperties,
        input: {
            width: "100%",
            padding: "12px",
            backgroundColor: "#374151",
            border: "1px solid #4b5563",
            borderRadius: "6px",
            color: "#fff",
            marginBottom: "16px",
        } as React.CSSProperties,
        select: {
            width: "100%",
            padding: "12px",
            backgroundColor: "#374151",
            border: "1px solid #4b5563",
            borderRadius: "6px",
            color: "#fff",
            marginBottom: "16px",
        } as React.CSSProperties,
        button: {
            padding: "12px 24px",
            backgroundColor: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: "bold",
            cursor: "pointer",
            marginRight: "12px",
        } as React.CSSProperties,
        secondaryButton: {
            padding: "12px 24px",
            backgroundColor: "#6b7280",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: "bold",
            cursor: "pointer",
        } as React.CSSProperties,
        error: {
            color: "#ef4444",
            backgroundColor: "#1f2937",
            border: "1px solid #ef4444",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "16px",
        } as React.CSSProperties,
        success: {
            color: "#10b981",
            backgroundColor: "#1f2937",
            border: "1px solid #10b981",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "16px",
        } as React.CSSProperties,
        dogCard: {
            padding: "12px",
            backgroundColor: "#374151",
            border: "2px solid #4b5563",
            borderRadius: "6px",
            margin: "8px",
            cursor: "pointer",
            transition: "border-color 0.2s",
        } as React.CSSProperties,
        dogCardSelected: {
            borderColor: "#3b82f6",
            backgroundColor: "#1e40af",
        } as React.CSSProperties,
        clientInfo: {
            marginTop: "12px",
            padding: "12px",
            backgroundColor: "#059669",
            borderRadius: "6px",
            fontSize: "14px",
        } as React.CSSProperties,
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Create Manual Booking</h1>

            {error && <div style={styles.error}>{error}</div>}
            {success && (
                <div style={styles.success}>
                    Booking created successfully! ID: {success.booking_id}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* Client Selection */}
                <div style={styles.section}>
                    <h2 style={{ color: "#d1d5db", marginBottom: "16px" }}>1. Select Client</h2>
                    <label style={styles.label}>Choose Existing Client</label>

                    {loadingClients ? (
                        <div style={{ color: "#9ca3af", padding: "12px" }}>
                            Loading clients...
                        </div>
                    ) : (
                        <>
                            <select
                                value={selectedClientId || 0}
                                onChange={(e) => handleClientSelect(e.target.value)}
                                style={styles.select}
                                required
                            >
                                <option value={0}>Select a client...</option>
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>
                                        {client.owner_name} ({client.phone}) - {client.dogs?.length || 0} dog{(client.dogs?.length || 0) !== 1 ? 's' : ''}
                                    </option>
                                ))}
                            </select>

                            <div style={{ color: "#9ca3af", fontSize: "14px" }}>
                                {clients.length} clients available. Sorted alphabetically by name.
                            </div>
                        </>
                    )}

                    {customer && (
                        <div style={styles.clientInfo}>
                            <strong>Selected: {customer.owner_name}</strong><br />
                            📞 {customer.phone} • 📧 {customer.email}<br />
                            📍 {customer.address}
                        </div>
                    )}
                </div>

                {/* Dog Selection */}
                {customer && (
                    <div style={styles.section}>
                        <h2 style={{ color: "#d1d5db", marginBottom: "16px" }}>2. Select Dogs (Max 2)</h2>
                        {customer.dogs.length === 0 ? (
                            <div style={{ color: "#9ca3af", padding: "12px" }}>
                                This client has no registered dogs. Please add dogs first.
                            </div>
                        ) : (
                            <>
                                <div style={{ display: "flex", flexWrap: "wrap" }}>
                                    {customer.dogs.map((dog) => (
                                        <div
                                            key={dog.id}
                                            onClick={() => handleDogToggle(dog.id)}
                                            style={{
                                                ...styles.dogCard,
                                                ...(selectedDogs.includes(dog.id) ? styles.dogCardSelected : {})
                                            }}
                                        >
                                            <strong>{dog.dog_name}</strong><br />
                                            <small>{dog.dog_breed}, {dog.dog_age} years old</small>
                                        </div>
                                    ))}
                                </div>
                                <p style={{ color: "#9ca3af", marginTop: "8px" }}>
                                    Selected: {selectedDogs.length} dog{selectedDogs.length !== 1 ? 's' : ''}
                                </p>
                            </>
                        )}
                    </div>
                )}

                {/* Service Selection */}
                {selectedDogs.length > 0 && (
                    <div style={styles.section}>
                        <h2 style={{ color: "#d1d5db", marginBottom: "16px" }}>3. Service Details</h2>

                        <label style={styles.label}>Service Type{getCurrentPriceDisplay()}</label>
                        <select
                            value={bookingData.service_type}
                            onChange={(e) => handleServiceChange(e.target.value)}
                            style={styles.select}
                        >
                            {SERVICE_OPTIONS.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.name}
                                    {option.type === "solo_walk" && selectedDogs.length > 0
                                        ? ` - ${getSoloWalkPriceDisplay(option.duration!, selectedDogs.length)}`
                                        : ""
                                    }
                                </option>
                            ))}
                        </select>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                            <div>
                                <label style={styles.label}>Date</label>
                                <input
                                    type="date"
                                    value={bookingDate}
                                    onChange={(e) => setBookingDate(e.target.value)}
                                    style={styles.input}
                                    required
                                />
                            </div>
                            <div>
                                <label style={styles.label}>Start Time</label>
                                <input
                                    type="time"
                                    value={bookingTime}
                                    onChange={(e) => setBookingTime(e.target.value)}
                                    style={styles.input}
                                    required
                                />
                            </div>
                        </div>

                        {/* Multi-day end time for dog sitting */}
                        {bookingData.service_type === "Dog Sitting (Variable)" && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div>
                                    <label style={styles.label}>End Date (Optional)</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        style={styles.input}
                                    />
                                </div>
                                <div>
                                    <label style={styles.label}>End Time</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        style={styles.input}
                                        disabled={!endDate}
                                    />
                                </div>
                            </div>
                        )}

                        <label style={styles.label}>Notes (Optional)</label>
                        <textarea
                            value={bookingData.notes || ""}
                            onChange={(e) => setBookingData(prev => ({ ...prev, notes: e.target.value }))}
                            style={{ ...styles.input, minHeight: "80px", resize: "vertical" }}
                            placeholder="Any special instructions..."
                        />

                        <div style={{ display: "flex", gap: "24px", marginTop: "16px" }}>
                            <label style={{ display: "flex", alignItems: "center", color: "#d1d5db" }}>
                                <input
                                    type="checkbox"
                                    checked={bookingData.create_calendar_event || false}
                                    onChange={(e) => setBookingData(prev => ({ ...prev, create_calendar_event: e.target.checked }))}
                                    style={{ marginRight: "8px" }}
                                />
                                Create Google Calendar Event
                            </label>
                            <label style={{ display: "flex", alignItems: "center", color: "#d1d5db" }}>
                                <input
                                    type="checkbox"
                                    checked={bookingData.send_email || false}
                                    onChange={(e) => setBookingData(prev => ({ ...prev, send_email: e.target.checked }))}
                                    style={{ marginRight: "8px" }}
                                />
                                Send Email Confirmation
                            </label>
                        </div>
                    </div>
                )}

                {/* Submit */}
                {selectedDogs.length > 0 && bookingDate && bookingTime && (
                    <div style={{ textAlign: "center" }}>
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={styles.button}
                        >
                            {isLoading ? "Creating..." : "Create Booking"}
                        </button>
                        <button
                            type="button"
                            onClick={() => window.location.href = "/dog-walking/admin"}
                            style={styles.secondaryButton}
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
}