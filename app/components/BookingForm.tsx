"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { getSoloWalkPrice, formatSoloWalkPrice } from "@/lib/pricing"; // NEW: Import pricing functions

// --- Types ---
interface Dog {
    id: number;
    dog_name: string;
    dog_breed: string;
    dog_age: number;
}

interface User {
    owner_id: number;
    owner_name: string;
    phone: string;
    email: string;
    address: string;
    dogs: Dog[];
}

interface BookingFormProps {
    serviceName: string;
    startTime: Date;
    endTime: Date;
    selectedDuration?: number; // NEW: Optional duration for solo walks
    onBookingSuccess: () => void;
    onCancel: () => void;
}

// --- Form States ---
type View = "lookup" | "register" | "selectDog" | "addDog";

export default function BookingForm({
    serviceName,
    startTime,
    endTime,
    selectedDuration, // NEW: Duration prop
    onBookingSuccess,
    onCancel,
}: BookingFormProps) {

    // --- Core State ---
    const [view, setView] = useState<View>("lookup");
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Form Data State ---
    const [phone, setPhone] = useState("");
    const [registerData, setRegisterData] = useState({
        ownerName: "",
        email: "",
        address: "",
        dogName: "",
        dogBreed: "",
        dogAge: "",
    });
    const [newDogData, setNewDogData] = useState({
        dogName: "",
        dogBreed: "",
        dogAge: "",
    });
    const [selectedDogIds, setSelectedDogIds] = useState<number[]>([]);

    // NEW: Helper function to check if service is Solo Walk
    const isSoloWalk = serviceName.toLowerCase().includes('solo walk');

    // NEW: Helper function to determine action text based on service type
    const getServiceActionText = (serviceType: string): string => {
        const lowerService = serviceType.toLowerCase();
        if (lowerService.includes('walk')) {
            return 'walk';
        } else if (lowerService.includes('sitting')) {
            return 'booking';
        } else if (lowerService.includes('meet') || lowerService.includes('greet')) {
            return 'appointment';
        } else {
            return 'booking'; // Default fallback
        }
    };

    // NEW: Calculate exact price for current selection
    const calculatePrice = () => {
        if (!isSoloWalk || !selectedDuration) {
            return null; // No pricing for non-solo walks or missing duration
        }
        const dogCount = selectedDogIds.length || 1; // Default to 1 for display
        return getSoloWalkPrice(selectedDuration, dogCount);
    };

    // --- Styles ---
    const styles = {
        form: {
            padding: "24px",
            border: "1px solid #333",
            borderRadius: "8px",
            backgroundColor: "#111827",
        } as React.CSSProperties,
        label: {
            display: "block",
            marginBottom: "4px",
            fontSize: "0.9rem",
            color: "#d1d5db",
        } as React.CSSProperties,
        input: {
            width: "100%",
            padding: "8px",
            marginBottom: "16px",
            borderRadius: "4px",
            border: "1px solid #444",
            backgroundColor: "#1f2937",
            color: "#fff",
            fontSize: "1rem",
        } as React.CSSProperties,
        button: {
            width: "100%",
            padding: "12px",
            fontSize: "1rem",
            fontWeight: "bold",
            color: "#fff",
            backgroundColor: "#3b82f6",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
        } as React.CSSProperties,
        secondaryButton: {
            width: "auto",
            padding: "8px 12px",
            fontSize: "0.9rem",
            color: "#fff",
            backgroundColor: "#374151",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
        } as React.CSSProperties,
        cancelButton: {
            width: "100%",
            padding: "10px",
            fontSize: "0.9rem",
            color: "#d1d5db",
            backgroundColor: "transparent",
            border: "none",
            marginTop: "8px",
            cursor: "pointer",
        } as React.CSSProperties,
        summary: {
            padding: "12px",
            backgroundColor: "#1f2937",
            borderRadius: "4px",
            marginBottom: "16px",
            border: "1px solid #333",
        } as React.CSSProperties,
        disclaimer: {
            fontSize: "0.8rem",
            color: "#9ca3af",
            marginTop: "16px",
        } as React.CSSProperties,
        error: {
            color: "#ef4444",
            marginBottom: "12px",
        } as React.CSSProperties,
        checkboxLabel: {
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px",
            border: "1px solid #333",
            borderRadius: "4px",
            marginBottom: "8px",
            cursor: "pointer",
        } as React.CSSProperties,
        // NEW: Price display style
        priceDisplay: {
            backgroundColor: "#065f46",
            color: "#10b981",
            padding: "8px 12px",
            borderRadius: "4px",
            fontWeight: "bold",
            textAlign: "center" as const,
            marginTop: "8px",
        } as React.CSSProperties,
    };

    // --- 1. LOOKUP HANDLER (Unchanged) ---
    const handleLookup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `/api/dog-walking/user-lookup?phone=${encodeURIComponent(phone)}`
            );
            if (!res.ok) throw new Error("Could not find user.");

            const data = await res.json();
            if (data.found) {
                setCurrentUser(data.user);
                setView("selectDog");
            } else {
                setView("register");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- 2. REGISTER HANDLER (Unchanged) ---
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        console.log("🚀 Starting registration...", registerData);
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/dog-walking/user-register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...registerData,
                    phone: phone,
                    dogAge: parseInt(registerData.dogAge, 10),
                }),
            });

            console.log("📥 Response status:", res.status);

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Registration failed.");
            }

            const data = await res.json();
            console.log("✅ Response data:", data);

            setCurrentUser(data.user);
            console.log("🔄 Setting view to selectDog");
            setView("selectDog");

        } catch (err: any) {
            console.error("💥 Error:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- 3. ADD DOG HANDLER (Unchanged) ---
    const handleAddDog = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        if (!newDogData.dogBreed.trim()) {
            setError("Dog's breed is required.");
            return;
        }

        if (!newDogData.dogAge || parseInt(newDogData.dogAge) < 0) {
            setError("Dog's age is required and must be a valid number.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/dog-walking/dog-add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...newDogData,
                    ownerId: currentUser.owner_id,
                    dogAge: parseInt(newDogData.dogAge, 10),
                }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to add dog.");
            }

            const data = await res.json();
            setCurrentUser(data.user);
            setView("selectDog");
            setNewDogData({ dogName: "", dogBreed: "", dogAge: "" });

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- 4. FINAL BOOKING HANDLER (UPDATED for Duration Support) ---
    const handleBook = async (event?: React.MouseEvent<HTMLButtonElement>) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if (!currentUser || selectedDogIds.length === 0) {
            setError("Please select at least one dog.");
            return;
        }

        console.log('Booking button clicked - starting process');
        setIsLoading(true);
        setError(null);

        const dog1 = currentUser.dogs.find((d) => d.id === selectedDogIds[0]);
        const dog2 =
            selectedDogIds.length > 1
                ? currentUser.dogs.find((d) => d.id === selectedDogIds[1])
                : undefined;

        // UPDATED: Smart duration detection
        const getDurationFromService = (serviceName: string): number => {
            // For Solo Walk with duration prop, use the prop
            if (isSoloWalk && selectedDuration) {
                return selectedDuration;
            }
            // Fallback: extract from service name for other services
            if (serviceName.includes('60 min') || serviceName.includes('1 hour')) return 60;
            if (serviceName.includes('30 min')) return 30;
            if (serviceName.includes('2 hour')) return 120;
            return 60; // default
        };

        const bookingData = {
            ownerId: currentUser.owner_id,
            dog_id_1: selectedDogIds[0],
            dog_id_2: selectedDogIds.length > 1 ? selectedDogIds[1] : undefined,
            service_type: serviceName,
            start_time: startTime.toISOString(),

            // Smart conditional data
            ...(serviceName.includes('Dog Sitting')
                ? { end_time: endTime.toISOString() }
                : { duration_minutes: getDurationFromService(serviceName) }
            ),

            owner_name: currentUser.owner_name,
            dog_name_1: dog1?.dog_name,
            dog_name_2: dog2?.dog_name,
            address: currentUser.address,
            phone: currentUser.phone,
            email: currentUser.email,
        };

        try {
            console.log('Sending booking request...', bookingData);

            const res = await fetch("/api/dog-walking/book", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                    "Cache-Control": "no-cache"
                },
                body: JSON.stringify(bookingData),
            });

            console.log('Response status:', res.status);

            if (!res.ok) {
                const errData = await res.json();
                console.error('Server error response:', errData);
                throw new Error(errData.error || "Booking failed.");
            }

            const responseData = await res.json();
            console.log('Booking successful:', responseData);
            onBookingSuccess();
        } catch (err: any) {
            console.error('Booking error:', err);
            setError(err.message || "Booking failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Dog Selection Handler (UPDATED with price calculation) ---
    const handleDogSelection = (dogId: number) => {
        const isSelected = selectedDogIds.includes(dogId);
        if (isSelected) {
            setSelectedDogIds(selectedDogIds.filter((id) => id !== dogId));
        } else {
            if (selectedDogIds.length < 2) {
                setSelectedDogIds([...selectedDogIds, dogId]);
            } else {
                alert(`You can select a maximum of 2 dogs for a ${getServiceActionText(serviceName)}.`);
            }
        }
    };

    // --- RENDER FUNCTIONS ---

    // UPDATED: Enhanced summary with pricing
    const renderSummary = () => {
        const price = calculatePrice();

        return (
            <div style={styles.summary}>
                <p><strong>Service:</strong> {serviceName}</p>
                <p><strong>Date:</strong> {format(startTime, "EEEE, MMMM d, yyyy")}</p>
                <p><strong>Time:</strong> {`${format(startTime, "HH:mm")} - ${format(endTime, "HH:mm")}`}</p>

                {/* NEW: Price display for solo walks */}
                {price && selectedDogIds.length > 0 && (
                    <div style={styles.priceDisplay}>
                        Total Price: £{price.toFixed(2)}
                        <span style={{ fontSize: '0.9em', opacity: 0.8 }}>
                            {' '}({selectedDogIds.length} dog{selectedDogIds.length > 1 ? 's' : ''})
                        </span>
                    </div>
                )}

                {/* Show pricing info when no dogs selected yet */}
                {isSoloWalk && selectedDuration && selectedDogIds.length === 0 && (
                    <div style={{ ...styles.priceDisplay, backgroundColor: '#374151', color: '#d1d5db' }}>
                        Pricing: {formatSoloWalkPrice(selectedDuration, 1)} (1 dog) / {formatSoloWalkPrice(selectedDuration, 2)} (2 dogs)
                    </div>
                )}
            </div>
        );
    };

    const renderLookupView = () => (
        <form onSubmit={handleLookup}>
            {renderSummary()}
            <label style={styles.label} htmlFor="phone">Enter your phone number to book:</label>
            <input
                style={styles.input}
                type="tel"
                id="phone"
                name="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., 07932749772"
                required
            />
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.button} type="submit" disabled={isLoading}>
                {isLoading ? "Looking..." : "Continue"}
            </button>
            <button style={styles.cancelButton} type="button" onClick={onCancel}>
                Back to Times
            </button>
        </form>
    );

    const renderRegisterView = () => (
        <form onSubmit={handleRegister}>
            {renderSummary()}
            <h4>New Customer - Welcome!</h4>
            <p style={{ marginBottom: "16px" }}>Please fill out your details to register.</p>

            <label style={styles.label} htmlFor="ownerName">Your Name*</label>
            <input
                style={styles.input}
                type="text"
                id="ownerName"
                value={registerData.ownerName}
                onChange={(e) => setRegisterData({ ...registerData, ownerName: e.target.value })}
                required
            />

            <label style={styles.label} htmlFor="phone">Phone Number*</label>
            <input
                style={styles.input}
                type="tel"
                id="phone"
                value={phone}
                disabled
            />

            <label style={styles.label} htmlFor="email">Email*</label>
            <input
                style={styles.input}
                type="email"
                id="email"
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                required
            />

            <label style={styles.label} htmlFor="address">Full Address for Pickup*</label>
            <textarea
                style={{ ...styles.input, minHeight: "80px" }}
                id="address"
                value={registerData.address}
                onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
                required
            />

            <h4>Your Dog's Details</h4>
            <label style={styles.label} htmlFor="dogName">Dog's Name*</label>
            <input
                style={styles.input}
                type="text"
                id="dogName"
                value={registerData.dogName}
                onChange={(e) => setRegisterData({ ...registerData, dogName: e.target.value })}
                required
            />

            <label style={styles.label} htmlFor="dogBreed">Dog's Breed*</label>
            <input
                style={styles.input}
                type="text"
                id="dogBreed"
                value={registerData.dogBreed}
                onChange={(e) => setRegisterData({ ...registerData, dogBreed: e.target.value })}
                placeholder="e.g., Labrador, Golden Retriever, Mixed"
                required
            />

            <label style={styles.label} htmlFor="dogAge">Dog's Age (years)*</label>
            <input
                style={styles.input}
                type="number"
                id="dogAge"
                min="0"
                max="30"
                value={registerData.dogAge}
                onChange={(e) => setRegisterData({ ...registerData, dogAge: e.target.value })}
                placeholder="e.g., 3"
                required
            />

            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.button} type="submit" disabled={isLoading}>
                {isLoading ? "Registering..." : "Register and Continue"}
            </button>
            <button style={styles.cancelButton} type="button" onClick={() => setView("lookup")}>
                Back
            </button>
        </form>
    );

    const renderSelectDogView = () => (
        <div>
            {renderSummary()}
            <h4>Welcome back, {currentUser?.owner_name}!</h4>

            <p style={styles.label}>Select dog(s) for this {getServiceActionText(serviceName)} (max 2):</p>
            <div style={{ marginBottom: "16px" }}>
                {currentUser?.dogs.map((dog) => (
                    <label key={dog.id} style={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={selectedDogIds.includes(dog.id)}
                            onChange={() => handleDogSelection(dog.id)}
                            style={{ width: "18px", height: "18px" }}
                        />
                        {dog.dog_name}
                    </label>
                ))}
            </div>

            <button
                style={{ ...styles.secondaryButton, marginBottom: "16px" }}
                type="button"
                onClick={() => setView("addDog")}
            >
                + Add Another Dog
            </button>

            {/* Disclaimer */}
            <div style={styles.disclaimer}>
                <p style={{ marginBottom: "8px" }}>
                    <strong>Cancellations:</strong> I offer a flexible and understanding
                    cancellation policy. You can cancel your booking at any time, even on
                    the same day, with absolutely no cancellation fee.
                </p>
                <p style={{ marginBottom: "8px" }}>
                    <strong>A Small Request:</strong> Whenever possible, please provide at
                    least 2-3 hours' notice. This greatly helps me manage my schedule and
                    potentially offer the slot to another dog in need of a walk.
                </p>
                <p style={{ marginBottom: "8px" }}>
                    <strong>How to Cancel:</strong> You can easily cancel or reschedule
                    your appointment by using the link provided in your calendar
                    invitation. Or send me a message on 07932749772.
                </p>
                <p style={{ marginBottom: "8px" }}>
                    <strong>No-Shows:</strong> If I arrive for a scheduled walk and am unable
                    to access your home or find your dog, I will wait for 10 minutes
                    while trying to contact you. If I can't reach you, this will be
                    considered a no-show. While no fee will be charged for the first
                    time, repeated no-shows may require prepayment for future bookings.
                </p>
                <p style={{ marginTop: "12px", fontWeight: "bold" }}>
                    By clicking "Confirm & Book", you agree to this policy.
                </p>
            </div>

            {error && <p style={styles.error}>{error}</p>}
            <button
                style={{ ...styles.button, marginTop: "16px" }}
                type="button"
                onClick={(e) => handleBook(e)}
                disabled={isLoading || selectedDogIds.length === 0}
                onSubmit={(e) => e.preventDefault()}
            >
                {isLoading ? "Booking..." : "Confirm & Book"}
            </button>
            <button style={styles.cancelButton} type="button" onClick={onCancel}>
                Cancel Booking
            </button>
        </div>
    );

    const renderAddDogView = () => (
        <form onSubmit={handleAddDog}>
            <h4>Add a New Dog</h4>
            <p>Add a new dog to your account, <strong>{currentUser?.owner_name}</strong>.</p>

            <label style={styles.label} htmlFor="newDogName">Dog's Name*</label>
            <input
                style={styles.input}
                type="text"
                id="newDogName"
                value={newDogData.dogName}
                onChange={(e) => setNewDogData({ ...newDogData, dogName: e.target.value })}
                required
            />

            <label style={styles.label} htmlFor="newDogBreed">Dog's Breed*</label>
            <input
                style={styles.input}
                type="text"
                id="newDogBreed"
                value={newDogData.dogBreed}
                onChange={(e) => setNewDogData({ ...newDogData, dogBreed: e.target.value })}
                placeholder="e.g., Labrador, Golden Retriever, Mixed"
                required
            />

            <label style={styles.label} htmlFor="newDogAge">Dog's Age (years)*</label>
            <input
                style={styles.input}
                type="number"
                id="newDogAge"
                min="0"
                max="30"
                value={newDogData.dogAge}
                onChange={(e) => setNewDogData({ ...newDogData, dogAge: e.target.value })}
                placeholder="e.g., 3"
                required
            />

            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.button} type="submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add Dog"}
            </button>
            <button style={styles.cancelButton} type="button" onClick={() => setView("selectDog")}>
                Cancel
            </button>
        </form>
    );

    // --- Main Switch Render ---
    return (
        <div style={styles.form}>
            {view === "lookup" && renderLookupView()}
            {view === "register" && renderRegisterView()}
            {view === "selectDog" && currentUser && renderSelectDogView()}
            {view === "addDog" && renderAddDogView()}
        </div>
    );
}