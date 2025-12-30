"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { getSoloWalkPrice, formatSoloWalkPrice } from "@/lib/pricing";

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

interface SecondaryAddress {
    id: number;
    address: string;
    address_label: string;
    contact_name: string;
    contact_email: string | null;
    contact_phone: string;
    partner_name: string | null;
    partner_email: string | null;
    partner_phone: string | null;
    is_active: boolean;
    notes: string | null;
}

interface BookingFormProps {
    serviceName: string;
    startTime: Date;
    endTime: Date;
    selectedDuration?: number | null;  // null for sitting services (duration calculated from times)
    currentUser?: User | null;  // NEW: Optional authenticated user
    onBookingSuccess: () => void;
    onCancel: () => void;
}

// --- Form States ---
type View = "lookup" | "register" | "selectDog" | "selectAddress" | "addDog" | "finalBooking";

export default function BookingForm({
    serviceName,
    startTime,
    endTime,
    selectedDuration,
    currentUser: initialUser = null,  // NEW: Default to null if not provided
    onBookingSuccess,
    onCancel,
}: BookingFormProps) {

    // --- Core State ---
    const [view, setView] = useState<View>(initialUser ? "selectDog" : "lookup");  // NEW: Skip to dog selection if user provided
    const [currentUser, setCurrentUser] = useState<User | null>(initialUser);  // NEW: Initialize with provided user
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Address Selection State ---
    const [secondaryAddresses, setSecondaryAddresses] = useState<SecondaryAddress[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null); // null = primary address
    const [addressesLoading, setAddressesLoading] = useState(false);

    // --- Form Data State - UPDATED: Changed phone to searchInput ---
    const [searchInput, setSearchInput] = useState("");
    const [registerData, setRegisterData] = useState({
        ownerName: "",
        email: "",
        phone: "",  // Added back for when user starts with email
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

    // Helper functions
    const isSoloWalk = serviceName.toLowerCase().includes('solo walk');

    const getServiceActionText = (serviceType: string): string => {
        const lowerService = serviceType.toLowerCase();
        if (lowerService.includes('walk')) {
            return 'walk';
        } else if (lowerService.includes('sitting')) {
            return 'booking';
        } else if (lowerService.includes('meet') || lowerService.includes('greet')) {
            return 'appointment';
        } else {
            return 'booking';
        }
    };

    const calculatePrice = () => {
        if (!isSoloWalk || !selectedDuration) {
            return null;
        }
        const dogCount = selectedDogIds.length || 1;
        return getSoloWalkPrice(selectedDuration, dogCount);
    };

    // --- NEW: Fetch Secondary Addresses ---
    const fetchSecondaryAddresses = async () => {
        if (!currentUser) return;

        setAddressesLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/dog-walking/secondary-addresses?owner_id=${currentUser.owner_id}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch addresses");
            }

            // Only show active addresses
            const activeAddresses = data.addresses.filter((addr: SecondaryAddress) => addr.is_active);
            setSecondaryAddresses(activeAddresses);
            console.log(`[BookingForm] Loaded ${activeAddresses.length} active secondary addresses`);

        } catch (err: any) {
            console.error("Failed to fetch secondary addresses:", err);
            setError("Could not load address options. Using primary address only.");
            setSecondaryAddresses([]);
        } finally {
            setAddressesLoading(false);
        }
    };

    // --- NEW: Dog Selection Handler (Updated) ---
    const handleDogSelection = (dogId: number) => {
        setSelectedDogIds(prev => {
            if (prev.includes(dogId)) {
                return prev.filter(id => id !== dogId);
            } else if (prev.length < 2) {
                return [...prev, dogId];
            }
            return prev;
        });
    };

    // --- NEW: Continue from Dog Selection to Address Selection ---
    const handleContinueFromDogSelection = async () => {
        if (selectedDogIds.length === 0) {
            setError("Please select at least one dog.");
            return;
        }

        setError(null);

        // Fetch secondary addresses before proceeding
        await fetchSecondaryAddresses();
        setView("selectAddress");
    };

    // --- NEW: Continue from Address Selection to Final Booking ---
    const handleContinueFromAddressSelection = () => {
        setView("finalBooking");
    };

    // --- Address Selection Helpers ---
    const getSelectedAddressInfo = () => {
        if (selectedAddressId === null) {
            return {
                label: "Primary Address",
                address: currentUser?.address,
                contact: currentUser?.owner_name,
            };
        }

        const selectedAddress = secondaryAddresses.find(addr => addr.id === selectedAddressId);
        if (selectedAddress) {
            return {
                label: selectedAddress.address_label,
                address: selectedAddress.address,
                contact: selectedAddress.contact_name,
            };
        }

        return null;
    };

    // --- Booking Summary Component ---
    const renderSummary = () => {
        const price = calculatePrice();
        const addressInfo = getSelectedAddressInfo();

        return (
            <div style={styles.summary}>
                <h3 style={{ color: "#fff", marginBottom: "12px" }}>Booking Summary</h3>
                <p><strong>Service:</strong> {serviceName}</p>
                <p><strong>Date:</strong> {format(startTime, "EEEE, MMMM d, yyyy")}</p>
                <p><strong>Time:</strong> {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}</p>
                {selectedDogIds.length > 0 && currentUser && (
                    <p><strong>Dog(s):</strong> {
                        selectedDogIds.map(id =>
                            currentUser.dogs.find(d => d.id === id)?.dog_name
                        ).join(', ')
                    }</p>
                )}
                {addressInfo && view !== "selectAddress" && (
                    <>
                        <p><strong>Location:</strong> {addressInfo.label}</p>
                        <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>{addressInfo.address}</p>
                    </>
                )}
                {price && (
                    <div style={styles.priceDisplay}>
                        Total: £{price.toFixed(2)}
                    </div>
                )}
            </div>
        );
    };

    // --- 1. LOOKUP HANDLER - UPDATED: Now supports both phone and email ---
    const handleLookup = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!searchInput.trim()) {
            setError("Please enter your phone number or email address.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Determine if input is email or phone
            const isEmail = searchInput.includes("@");
            const queryParam = isEmail ? `email=${encodeURIComponent(searchInput)}` : `phone=${encodeURIComponent(searchInput)}`;
            
            const response = await fetch(`/api/dog-walking/customer-lookup?${queryParam}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to find your account");
            }

            if (data.found) {
                // Success - customer found, convert to User format
                const user: User = {
                    owner_id: data.customer.owner_id,
                    owner_name: data.customer.owner_name,
                    phone: data.customer.phone,
                    email: data.customer.email,
                    address: data.customer.address,
                    dogs: data.customer.dogs
                };
                setCurrentUser(user);
                setView("selectDog");
            } else {
                // Customer not found - set up register data with search input
                if (isEmail) {
                    setRegisterData(prev => ({ ...prev, email: searchInput }));
                }
                setView("register");
            }

        } catch (err: any) {
            console.error("Customer lookup error:", err);
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- 2. REGISTER HANDLER - UPDATED: Uses searchInput instead of phone ---
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        console.log("🚀 Starting registration...", registerData);
        setIsLoading(true);
        setError(null);

        try {
            // Determine if we have email or phone in searchInput
            const isEmail = searchInput.includes("@");
            const registrationData = {
                ...registerData,
                phone: isEmail ? registerData.phone || "" : searchInput,  // Use searchInput if it's a phone
                email: isEmail ? searchInput : registerData.email,  // Use searchInput if it's an email
                dogAge: parseInt(registerData.dogAge, 10),
            };

            const res = await fetch("/api/dog-walking/user-register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(registrationData),
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

    // --- 3. ADD DOG HANDLER ---
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
            const res = await fetch("/api/dog-walking/add-dog", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    owner_id: currentUser.owner_id,
                    dogName: newDogData.dogName,
                    dogBreed: newDogData.dogBreed,
                    dogAge: parseInt(newDogData.dogAge),
                }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to add dog.");
            }

            const data = await res.json();
            
            // Update current user with new dog
            setCurrentUser(data.user);
            
            // Reset form and go back to dog selection
            setNewDogData({ dogName: "", dogBreed: "", dogAge: "" });
            setView("selectDog");

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- 4. BOOK HANDLER ---
    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || selectedDogIds.length === 0) return;

        setIsLoading(true);
        setError(null);

        try {
            const addressInfo = getSelectedAddressInfo();
            
            const selectedDogs = selectedDogIds.map(id => 
                currentUser.dogs.find(dog => dog.id === id)
            ).filter(Boolean);

            const bookingData = {
                ownerId: currentUser.owner_id,
                dog_id_1: selectedDogIds[0],
                dog_id_2: selectedDogIds.length > 1 ? selectedDogIds[1] : undefined,
                service_type: serviceName,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                // Only send duration_minutes for non-sitting services (sitting duration calculated from times)
                duration_minutes: serviceName.toLowerCase().includes('sitting') ? undefined : selectedDuration,
                secondary_address_id: selectedAddressId, // null = primary address
                owner_name: currentUser.owner_name,
                phone: currentUser.phone,
                email: currentUser.email,
                address: currentUser.address,
                dog_name_1: selectedDogs[0]?.dog_name,
                dog_name_2: selectedDogs[1]?.dog_name || undefined,
            };

            console.log("Booking request body:", bookingData);

            const res = await fetch("/api/dog-walking/book", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bookingData),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Booking failed.");
            }

            console.log("✅ Booking successful!");
            onBookingSuccess();

        } catch (err: any) {
            console.error("💥 Booking Error:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
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
            padding: "12px",
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
        smallButton: {
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
            fontSize: "0.9rem",
            marginBottom: "16px",
            padding: "8px",
            backgroundColor: "#7f1d1d",
            border: "1px solid #dc2626",
            borderRadius: "4px",
        } as React.CSSProperties,
        hint: {
            fontSize: "0.85rem",
            color: "#9ca3af",
            marginBottom: "16px",
            lineHeight: "1.4",
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
        priceDisplay: {
            backgroundColor: "#065f46",
            color: "#10b981",
            padding: "8px 12px",
            borderRadius: "4px",
            fontWeight: "bold",
            textAlign: "center" as const,
            marginTop: "8px",
        } as React.CSSProperties,
        // Address selection styles
        addressCard: {
            padding: "16px",
            border: "2px solid #374151",
            borderRadius: "8px",
            marginBottom: "12px",
            cursor: "pointer",
            transition: "all 0.2s",
            backgroundColor: "#1f2937",
        } as React.CSSProperties,
        addressCardSelected: {
            borderColor: "#3b82f6",
            backgroundColor: "#1e40af20",
        } as React.CSSProperties,
        addressCardHover: {
            borderColor: "#6b7280",
        } as React.CSSProperties,
    };

    // --- VIEW RENDERS ---

    const renderLookupView = () => (
        <form onSubmit={handleLookup}>
            {renderSummary()}
            <h4>Find Your Account</h4>
            
            {/* UPDATED: Changed label and placeholder to support both phone and email */}
            <label style={styles.label}>Phone Number or Email Address</label>
            <input
                style={styles.input}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter your phone or email"
                required
                autoComplete="tel email"
            />
            <p style={styles.hint}>
                Enter the phone number or email address you used when booking to find your account.
            </p>
            
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.button} type="submit" disabled={isLoading}>
                {isLoading ? "Searching..." : "Find My Account"}
            </button>
            <button style={styles.cancelButton} type="button" onClick={onCancel}>
                Cancel Booking
            </button>
        </form>
    );

    const renderRegisterView = () => {
        // Determine if we started with email or phone
        const isEmail = searchInput.includes("@");
        
        return (
            <form onSubmit={handleRegister}>
                {renderSummary()}
                <h4>Create Your Account</h4>
                <p>Let's create an account for <strong>{searchInput}</strong>:</p>

                <label style={styles.label}>Your Full Name*</label>
                <input
                    style={styles.input}
                    type="text"
                    value={registerData.ownerName}
                    onChange={(e) => setRegisterData({ ...registerData, ownerName: e.target.value })}
                    required
                />

                {/* Show phone field only if we started with email */}
                {isEmail && (
                    <>
                        <label style={styles.label}>Your Phone Number*</label>
                        <input
                            style={styles.input}
                            type="tel"
                            value={registerData.phone}
                            onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                            placeholder="07123456789"
                            required
                        />
                    </>
                )}

                {/* Show email field only if we started with phone */}
                {!isEmail && (
                    <>
                        <label style={styles.label}>Your Email Address*</label>
                        <input
                            style={styles.input}
                            type="email"
                            value={registerData.email}
                            onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                            required
                        />
                    </>
                )}

                <label style={styles.label}>Your Full Address*</label>
                <input
                    style={styles.input}
                    type="text"
                    value={registerData.address}
                    onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
                    placeholder="Full address including postcode"
                    required
                />

                <h4 style={{ marginTop: "20px", marginBottom: "10px" }}>Your Dog's Details</h4>

                <label style={styles.label}>Dog's Name*</label>
                <input
                    style={styles.input}
                    type="text"
                    value={registerData.dogName}
                    onChange={(e) => setRegisterData({ ...registerData, dogName: e.target.value })}
                    required
                />

                <label style={styles.label}>Dog's Breed*</label>
                <input
                    style={styles.input}
                    type="text"
                    value={registerData.dogBreed}
                    onChange={(e) => setRegisterData({ ...registerData, dogBreed: e.target.value })}
                    placeholder="e.g., Labrador, Golden Retriever, Mixed"
                    required
                />

                <label style={styles.label}>Dog's Age (years)*</label>
                <input
                    style={styles.input}
                    type="number"
                    min="0"
                    max="30"
                    value={registerData.dogAge}
                    onChange={(e) => setRegisterData({ ...registerData, dogAge: e.target.value })}
                    placeholder="e.g., 3"
                    required
                />

                {error && <p style={styles.error}>{error}</p>}
                <button style={styles.button} type="submit" disabled={isLoading}>
                    {isLoading ? "Creating Account..." : "Create Account & Continue"}
                </button>
                <button style={styles.cancelButton} type="button" onClick={() => setView("lookup")}>
                    Back to Login
                </button>
            </form>
        );
    };

    const renderSelectDogView = () => (
        <div>
            {renderSummary()}
            <h4>Select Dog(s) for Your Booking</h4>

            {currentUser?.dogs.map((dog) => (
                <label 
                    key={dog.id} 
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "16px",
                        border: selectedDogIds.includes(dog.id) ? "2px solid #3b82f6" : "2px solid #374151",
                        backgroundColor: selectedDogIds.includes(dog.id) ? "#1e40af20" : "#1f2937",
                        borderRadius: "8px",
                        marginBottom: "12px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                        if (!selectedDogIds.includes(dog.id)) {
                            e.currentTarget.style.borderColor = "#6b7280";
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!selectedDogIds.includes(dog.id)) {
                            e.currentTarget.style.borderColor = "#374151";
                        }
                    }}
                >
                    <input
                        type="checkbox"
                        checked={selectedDogIds.includes(dog.id)}
                        onChange={() => handleDogSelection(dog.id)}
                        style={{ marginTop: "2px" }}
                    />
                    <div style={{ flex: 1 }}>
                        <h5 style={{ color: "#fff", margin: "0 0 4px 0", fontWeight: "600" }}>
                            {dog.dog_name}
                        </h5>
                        <p style={{ color: "#9ca3af", margin: "0", fontSize: "0.85rem" }}>
                            {dog.dog_breed} • {dog.dog_age} years old
                        </p>
                    </div>
                </label>
            ))}

            <div style={{ marginTop: "16px" }}>
                <button 
                    style={styles.smallButton} 
                    type="button" 
                    onClick={() => setView("addDog")}
                >
                    + Add Another Dog
                </button>
            </div>

            {error && <p style={styles.error}>{error}</p>}
            
            <div style={{ marginTop: "20px" }}>
                <button 
                    style={styles.button} 
                    type="button" 
                    onClick={handleContinueFromDogSelection}
                    disabled={selectedDogIds.length === 0}
                >
                    Continue to Address Selection →
                </button>
                <button style={styles.cancelButton} type="button" onClick={() => setView("lookup")}>
                    ← Back to Account
                </button>
            </div>
        </div>
    );

    const renderSelectAddressView = () => (
        <div>
            {renderSummary()}
            <h4>Select Service Address</h4>
            <p>Where should your {getServiceActionText(serviceName)} take place?</p>

            {addressesLoading && (
                <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>
                    Loading address options...
                </div>
            )}

            {!addressesLoading && (
                <div>
                    {/* Primary Address */}
                    <div
                        style={{
                            padding: "16px",
                            border: selectedAddressId === null ? "2px solid #3b82f6" : "2px solid #374151",
                            backgroundColor: selectedAddressId === null ? "#1e40af20" : "#1f2937",
                            borderRadius: "8px",
                            marginBottom: "12px",
                            cursor: "pointer",
                            transition: "all 0.2s",
                        }}
                        onClick={() => setSelectedAddressId(null)}
                        onMouseEnter={(e) => {
                            if (selectedAddressId !== null) {
                                e.currentTarget.style.borderColor = "#6b7280";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (selectedAddressId !== null) {
                                e.currentTarget.style.borderColor = "#374151";
                            }
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                            <input
                                type="radio"
                                checked={selectedAddressId === null}
                                onChange={() => setSelectedAddressId(null)}
                                style={{ marginTop: "4px" }}
                            />
                            <div style={{ flex: 1 }}>
                                <h5 style={{
                                    color: "#fff",
                                    margin: "0 0 8px 0",
                                    fontWeight: "600",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px"
                                }}>
                                    🏠 Primary Address
                                    {selectedAddressId === null && (
                                        <span style={{
                                            fontSize: "0.75rem",
                                            color: "#3b82f6",
                                            fontWeight: "normal"
                                        }}>
                                            (Selected)
                                        </span>
                                    )}
                                </h5>
                                <p style={{ color: "#d1d5db", margin: "0 0 4px 0", fontSize: "0.9rem" }}>
                                    {currentUser?.address}
                                </p>
                                <p style={{ color: "#9ca3af", margin: "0", fontSize: "0.8rem" }}>
                                    Contact: {currentUser?.owner_name}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Addresses */}
                    {secondaryAddresses.map((address) => (
                        <div
                            key={address.id}
                            style={{
                                padding: "16px",
                                border: selectedAddressId === address.id ? "2px solid #3b82f6" : "2px solid #374151",
                                backgroundColor: selectedAddressId === address.id ? "#1e40af20" : "#1f2937",
                                borderRadius: "8px",
                                marginBottom: "12px",
                                cursor: "pointer",
                                transition: "all 0.2s",
                            }}
                            onClick={() => setSelectedAddressId(address.id)}
                            onMouseEnter={(e) => {
                                if (selectedAddressId !== address.id) {
                                    e.currentTarget.style.borderColor = "#6b7280";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (selectedAddressId !== address.id) {
                                    e.currentTarget.style.borderColor = "#374151";
                                }
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                                <input
                                    type="radio"
                                    checked={selectedAddressId === address.id}
                                    onChange={() => setSelectedAddressId(address.id)}
                                    style={{ marginTop: "4px" }}
                                />
                                <div style={{ flex: 1 }}>
                                    <h5 style={{
                                        color: "#fff",
                                        margin: "0 0 8px 0",
                                        fontWeight: "600",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px"
                                    }}>
                                        📍 {address.address_label}
                                        {selectedAddressId === address.id && (
                                            <span style={{
                                                fontSize: "0.75rem",
                                                color: "#3b82f6",
                                                fontWeight: "normal"
                                            }}>
                                                (Selected)
                                            </span>
                                        )}
                                    </h5>
                                    <p style={{ color: "#d1d5db", margin: "0 0 4px 0", fontSize: "0.9rem" }}>
                                        {address.address}
                                    </p>
                                    <p style={{ color: "#9ca3af", margin: "0", fontSize: "0.8rem" }}>
                                        Contact: {address.contact_name}
                                        {address.partner_name && ` & ${address.partner_name}`}
                                    </p>
                                    {address.notes && (
                                        <p style={{
                                            color: "#6b7280",
                                            margin: "8px 0 0 0",
                                            fontSize: "0.8rem",
                                            fontStyle: "italic"
                                        }}>
                                            Note: {address.notes}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {secondaryAddresses.length === 0 && !addressesLoading && (
                        <div style={{
                            textAlign: "center",
                            padding: "20px",
                            color: "#9ca3af",
                            fontSize: "0.9rem"
                        }}>
                            <p>You only have your primary address configured.</p>
                            <p style={{ fontSize: "0.8rem", marginTop: "8px" }}>
                                You can add secondary addresses in your dashboard after booking.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {error && <p style={styles.error}>{error}</p>}

            <button
                style={styles.button}
                type="button"
                onClick={handleContinueFromAddressSelection}
                disabled={addressesLoading}
            >
                Continue to Booking Confirmation →
            </button>

            <button
                style={styles.cancelButton}
                type="button"
                onClick={() => setView("selectDog")}
            >
                ← Back to Dog Selection
            </button>
        </div>
    );

    const renderFinalBookingView = () => (
        <div>
            {renderSummary()}
            <h4>Confirm Your Booking</h4>

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

            <button
                style={styles.cancelButton}
                type="button"
                onClick={() => setView("selectAddress")}
            >
                ← Back to Address Selection
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
            {view === "selectAddress" && currentUser && renderSelectAddressView()}
            {view === "finalBooking" && currentUser && renderFinalBookingView()}
            {view === "addDog" && renderAddDogView()}
        </div>
    );
}