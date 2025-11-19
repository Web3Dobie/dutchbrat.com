"use client";

import React, { useState, useEffect } from "react";
import { format, addMinutes, isPast } from "date-fns";

// Service options
const SERVICE_OPTIONS = [
    { id: "Meet & Greet - for new clients", name: "Meet & Greet (30 min, FREE)", duration: 30 },
    { id: "Quick Walk (30 min)", name: "Quick Walk (30 min, £10)", duration: 30 },
    { id: "Solo Walk (60 min)", name: "Solo Walk (60 min, £17.50)", duration: 60 },
    { id: "Dog Sitting (Variable)", name: "Dog Sitting (Variable, POA)", duration: null },
];

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
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [customerSearchPhone, setCustomerSearchPhone] = useState("");
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
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<any>(null);

    // Handle customer lookup
    const handleCustomerLookup = async () => {
        if (!customerSearchPhone.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/dog-walking/customer-lookup?phone=${encodeURIComponent(customerSearchPhone)}`);
            const data = await response.json();

            if (data.found) {
                setCustomer(data.customer);
                // Auto-select first dog
                if (data.customer.dogs.length > 0) {
                    setSelectedDogs([data.customer.dogs[0].id]);
                }
            } else {
                setError("Customer not found. Please register them first in the admin interface.");
            }
        } catch (err) {
            setError("Failed to lookup customer");
        } finally {
            setIsLoading(false);
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

            if (isMultiDay) {
                submitData.end_time = new Date(`${endDate}T${endTime}`).toISOString();
            } else {
                submitData.duration_minutes = bookingData.duration_minutes;
            }

            const response = await fetch("/api/dog-walking/admin/create-booking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(submitData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to create booking");
            }

            const result = await response.json();
            setSuccess(result);

            // Reset form
            setBookingData({
                service_type: "Meet & Greet - for new clients",
                create_calendar_event: true,
                send_email: false,
            });
            setSelectedDogs([]);
            setBookingDate("");
            setBookingTime("");
            setEndDate("");
            setEndTime("");

        } catch (err: any) {
            setError(err.message);
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
            color: "#fff",
            minHeight: "100vh",
        } as React.CSSProperties,
        card: {
            backgroundColor: "#1f2937",
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "24px",
            marginBottom: "24px",
        } as React.CSSProperties,
        header: {
            textAlign: "center",
            marginBottom: "32px",
        } as React.CSSProperties,
        title: {
            fontSize: "2rem",
            fontWeight: "bold",
            marginBottom: "8px",
            color: "#3b82f6",
        } as React.CSSProperties,
        label: {
            display: "block",
            marginBottom: "4px",
            fontSize: "0.9rem",
            color: "#d1d5db",
            fontWeight: "500",
        } as React.CSSProperties,
        input: {
            width: "100%",
            padding: "8px",
            marginBottom: "16px",
            borderRadius: "4px",
            border: "1px solid #444",
            backgroundColor: "#374151",
            color: "#fff",
            fontSize: "1rem",
        } as React.CSSProperties,
        select: {
            width: "100%",
            padding: "8px",
            marginBottom: "16px",
            borderRadius: "4px",
            border: "1px solid #444",
            backgroundColor: "#374151",
            color: "#fff",
            fontSize: "1rem",
        } as React.CSSProperties,
        textarea: {
            width: "100%",
            padding: "8px",
            marginBottom: "16px",
            borderRadius: "4px",
            border: "1px solid #444",
            backgroundColor: "#374151",
            color: "#fff",
            fontSize: "1rem",
            resize: "vertical",
            minHeight: "80px",
        } as React.CSSProperties,
        button: {
            padding: "8px 16px",
            borderRadius: "4px",
            border: "none",
            fontWeight: "bold",
            cursor: "pointer",
            marginRight: "8px",
        } as React.CSSProperties,
        primaryButton: {
            backgroundColor: "#3b82f6",
            color: "#fff",
        } as React.CSSProperties,
        secondaryButton: {
            backgroundColor: "#6b7280",
            color: "#fff",
        } as React.CSSProperties,
        dogButton: {
            padding: "8px 12px",
            margin: "4px",
            borderRadius: "4px",
            border: "1px solid #444",
            backgroundColor: "#374151",
            color: "#fff",
            cursor: "pointer",
            fontSize: "0.9rem",
        } as React.CSSProperties,
        dogButtonSelected: {
            backgroundColor: "#3b82f6",
            borderColor: "#3b82f6",
        } as React.CSSProperties,
        checkboxContainer: {
            display: "flex",
            alignItems: "center",
            marginBottom: "12px",
        } as React.CSSProperties,
        checkbox: {
            marginRight: "8px",
        } as React.CSSProperties,
        error: {
            color: "#ef4444",
            backgroundColor: "#1f2937",
            border: "1px solid #ef4444",
            borderRadius: "4px",
            padding: "12px",
            marginBottom: "16px",
        } as React.CSSProperties,
        success: {
            color: "#10b981",
            backgroundColor: "#1f2937",
            border: "1px solid #10b981",
            borderRadius: "4px",
            padding: "16px",
            marginBottom: "24px",
        } as React.CSSProperties,
    };

    const isHistorical = Boolean(bookingDate && bookingTime && isPast(new Date(`${bookingDate}T${bookingTime}`)));

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>Admin - Create Booking</h1>
                <p style={{ color: "#9ca3af" }}>Create bookings for existing clients (historical or future)</p>
            </div>

            {error && (
                <div style={styles.error}>{error}</div>
            )}

            {success && (
                <div style={styles.success}>
                    <h3 style={{ margin: "0 0 8px 0" }}>✅ Booking Created Successfully!</h3>
                    <p>Booking ID: {success.booking_id}</p>
                    <p>Status: {success.is_historical ? "Historical (Completed)" : "Future (Confirmed)"}</p>
                    {success.google_event_id && <p>📅 Calendar event created</p>}
                    <button
                        style={{ ...styles.button, ...styles.primaryButton, marginTop: "12px" }}
                        onClick={() => setSuccess(null)}
                    >
                        Create Another Booking
                    </button>
                </div>
            )}

            {/* Customer Lookup */}
            <div style={styles.card}>
                <h2 style={{ color: "#d1d5db", marginBottom: "16px" }}>1. Find Customer</h2>
                <label style={styles.label}>Customer Phone Number</label>
                <div style={{ display: "flex", gap: "8px" }}>
                    <input
                        type="tel"
                        value={customerSearchPhone}
                        onChange={(e) => setCustomerSearchPhone(e.target.value)}
                        style={{ ...styles.input, marginBottom: "0", flex: "1" }}
                        placeholder="07123456789"
                    />
                    <button
                        type="button"
                        onClick={handleCustomerLookup}
                        style={{ ...styles.button, ...styles.primaryButton }}
                        disabled={isLoading}
                    >
                        {isLoading ? "Looking up..." : "Find Customer"}
                    </button>
                </div>

                {customer && (
                    <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#374151", borderRadius: "4px" }}>
                        <strong>{customer.owner_name}</strong><br />
                        {customer.phone} • {customer.email}<br />
                        {customer.address}
                    </div>
                )}
            </div>

            {/* Rest of form only shows if customer is found */}
            {customer && (
                <>
                    {/* Dog Selection */}
                    <div style={styles.card}>
                        <h2 style={{ color: "#d1d5db", marginBottom: "16px" }}>2. Select Dog(s) (Max 2)</h2>
                        <div>
                            {customer.dogs.map(dog => (
                                <button
                                    key={dog.id}
                                    type="button"
                                    onClick={() => handleDogToggle(dog.id)}
                                    style={{
                                        ...styles.dogButton,
                                        ...(selectedDogs.includes(dog.id) ? styles.dogButtonSelected : {})
                                    }}
                                >
                                    {dog.dog_name} ({dog.dog_breed}, {dog.dog_age}y)
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Booking Details Form */}
                    <form onSubmit={handleSubmit} style={styles.card}>
                        <h2 style={{ color: "#d1d5db", marginBottom: "16px" }}>3. Booking Details</h2>

                        <label style={styles.label}>Service Type</label>
                        <select
                            value={bookingData.service_type}
                            onChange={(e) => handleServiceChange(e.target.value)}
                            style={styles.select}
                        >
                            {SERVICE_OPTIONS.map(service => (
                                <option key={service.id} value={service.id}>
                                    {service.name}
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

                        {/* Multi-day options for Dog Sitting */}
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

                        {/* Duration for single bookings */}
                        {bookingData.service_type !== "Dog Sitting (Variable)" && (
                            <div>
                                <label style={styles.label}>Duration (minutes)</label>
                                <input
                                    type="number"
                                    value={bookingData.duration_minutes || ""}
                                    onChange={(e) => setBookingData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                                    style={styles.input}
                                    min="1"
                                />
                            </div>
                        )}

                        <label style={styles.label}>Notes (Optional)</label>
                        <textarea
                            value={bookingData.notes || ""}
                            onChange={(e) => setBookingData(prev => ({ ...prev, notes: e.target.value }))}
                            style={styles.textarea}
                            placeholder="Any special notes about this booking..."
                        />

                        {/* Options */}
                        <h3 style={{ color: "#d1d5db", marginBottom: "12px" }}>Options</h3>

                        <div style={styles.checkboxContainer}>
                            <input
                                type="checkbox"
                                id="calendar"
                                checked={bookingData.create_calendar_event}
                                onChange={(e) => setBookingData(prev => ({ ...prev, create_calendar_event: e.target.checked }))}
                                style={styles.checkbox}
                            />
                            <label htmlFor="calendar" style={styles.label}>Create Google Calendar event</label>
                        </div>

                        <div style={styles.checkboxContainer}>
                            <input
                                type="checkbox"
                                id="email"
                                checked={bookingData.send_email}
                                onChange={(e) => setBookingData(prev => ({ ...prev, send_email: e.target.checked }))}
                                style={styles.checkbox}
                                disabled={isHistorical}
                            />
                            <label htmlFor="email" style={styles.label}>
                                Send confirmation email {isHistorical ? "(disabled for historical bookings)" : ""}
                            </label>
                        </div>

                        {isHistorical && (
                            <div style={{ backgroundColor: "#f59e0b20", padding: "12px", borderRadius: "4px", marginBottom: "16px", border: "1px solid #f59e0b" }}>
                                <strong>📋 Historical Booking:</strong> This booking is in the past and will be marked as "completed".
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || selectedDogs.length === 0}
                            style={{
                                ...styles.button,
                                ...styles.primaryButton,
                                width: "100%",
                                padding: "12px",
                                fontSize: "1rem",
                                opacity: isLoading || selectedDogs.length === 0 ? 0.6 : 1
                            }}
                        >
                            {isLoading ? "Creating Booking..." : "Create Booking"}
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}