"use client";

import React, { useState } from "react";

// --- Types ---
interface Dog {
    id: number;
    dog_name: string;
    dog_breed: string;
    dog_age: number;
    image_filename?: string | null;
}

interface Customer {
    owner_id: number;
    owner_name: string;
    phone: string;
    email: string;
    address: string;
    dogs: Dog[];
    // Partner fields
    partner_name?: string | null;
    partner_email?: string | null;
    partner_phone?: string | null;
    // Vet & Insurance fields
    vet_info?: string | null;
    pet_insurance?: string | null;
    // Photo sharing consent
    photo_sharing_consent?: boolean;
}

interface AccountDetailsProps {
    customer: Customer;
    onCustomerUpdated: (updatedCustomer: Customer) => void;
    onBack: () => void;
}

interface AccountFormData {
    // Primary contact details
    owner_name: string;
    phone: string;
    email: string;
    address: string;
    // Partner details
    partner_name: string;
    partner_email: string;
    partner_phone: string;
    // Vet & Insurance details
    vet_info: string;
    pet_insurance: string;
}

export default function AccountDetails({ customer, onCustomerUpdated, onBack }: AccountDetailsProps) {
    // --- State ---
    const [formData, setFormData] = useState<AccountFormData>({
        owner_name: customer.owner_name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        partner_name: customer.partner_name || '',
        partner_email: customer.partner_email || '',
        partner_phone: customer.partner_phone || '',
        vet_info: customer.vet_info || '',
        pet_insurance: customer.pet_insurance || '',
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [hasPartner, setHasPartner] = useState(!!customer.partner_name || !!customer.partner_email);

    // --- Styles (matching existing dashboard theme) ---
    const styles = {
        container: {
            maxWidth: "800px",
            margin: "0 auto",
            padding: "16px",
        } as React.CSSProperties,
        card: {
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "24px",
            marginBottom: "20px",
        } as React.CSSProperties,
        sectionHeader: {
            fontSize: "1.25rem",
            fontWeight: "600",
            color: "#fff",
            marginBottom: "16px",
            borderBottom: "2px solid #374151",
            paddingBottom: "8px",
        } as React.CSSProperties,
        inputGroup: {
            marginBottom: "16px",
        } as React.CSSProperties,
        label: {
            display: "block",
            marginBottom: "6px",
            fontSize: "0.875rem",
            fontWeight: "500",
            color: "#d1d5db",
        } as React.CSSProperties,
        input: {
            width: "100%",
            padding: "12px",
            borderRadius: "6px",
            border: "1px solid #4b5563",
            backgroundColor: "#1f2937",
            color: "#fff",
            fontSize: "1rem",
        } as React.CSSProperties,
        textArea: {
            width: "100%",
            padding: "12px",
            borderRadius: "6px",
            border: "1px solid #4b5563",
            backgroundColor: "#1f2937",
            color: "#fff",
            fontSize: "1rem",
            minHeight: "80px",
            resize: "vertical" as const,
        } as React.CSSProperties,
        button: {
            padding: "12px 24px",
            fontSize: "1rem",
            fontWeight: "600",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s",
            marginRight: "12px",
        } as React.CSSProperties,
        primaryButton: {
            backgroundColor: "#3b82f6",
            color: "#fff",
        } as React.CSSProperties,
        secondaryButton: {
            backgroundColor: "#6b7280",
            color: "#fff",
        } as React.CSSProperties,
        errorMessage: {
            backgroundColor: "#7f1d1d",
            color: "#fecaca",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "16px",
            border: "1px solid #dc2626",
        } as React.CSSProperties,
        successMessage: {
            backgroundColor: "#065f46",
            color: "#a7f3d0",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "16px",
            border: "1px solid #059669",
        } as React.CSSProperties,
        toggleContainer: {
            display: "flex",
            alignItems: "center",
            marginBottom: "20px",
            padding: "12px",
            backgroundColor: "#1f2937",
            borderRadius: "6px",
            border: "1px solid #4b5563",
        } as React.CSSProperties,
        checkbox: {
            marginRight: "12px",
            transform: "scale(1.2)",
        } as React.CSSProperties,
    };

    // --- Handlers ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear messages when user starts editing
        if (error) setError(null);
        if (successMessage) setSuccessMessage(null);
    };

    const handlePartnerToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const enabled = e.target.checked;
        setHasPartner(enabled);

        // Clear partner fields if disabled
        if (!enabled) {
            setFormData(prev => ({
                ...prev,
                partner_name: '',
                partner_email: '',
                partner_phone: '',
            }));
        }
    };

    const validateForm = (): boolean => {
        if (!formData.owner_name.trim()) {
            setError("Your name is required");
            return false;
        }
        if (!formData.email.trim()) {
            setError("Email address is required");
            return false;
        }
        if (!formData.phone.trim()) {
            setError("Phone number is required");
            return false;
        }
        if (!formData.address.trim()) {
            setError("Address is required");
            return false;
        }

        // Validate partner email if provided
        if (hasPartner && formData.partner_email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.partner_email)) {
                setError("Please enter a valid partner email address");
                return false;
            }
        }

        return true;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);
        setError(null);

        try {
            // Prepare data - clear partner fields if not enabled
            const updateData = hasPartner ? formData : {
                ...formData,
                partner_name: '',
                partner_email: '',
                partner_phone: '',
            };

            // Always include vet and insurance fields
            updateData.vet_info = formData.vet_info;
            updateData.pet_insurance = formData.pet_insurance;

            const response = await fetch(`/api/dog-walking/admin/clients/${customer.owner_id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updateData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to update account details");
            }

            // Update the customer data with new info
            const updatedCustomer: Customer = {
                ...customer,
                owner_name: formData.owner_name,
                phone: formData.phone,
                email: formData.email,
                address: formData.address,
                partner_name: hasPartner ? formData.partner_name || null : null,
                partner_email: hasPartner ? formData.partner_email || null : null,
                partner_phone: hasPartner ? formData.partner_phone || null : null,
                vet_info: formData.vet_info || null,
                pet_insurance: formData.pet_insurance || null,
            };

            setSuccessMessage("Account details updated successfully!");
            onCustomerUpdated(updatedCustomer);

        } catch (err: any) {
            console.error("Failed to update account:", err);
            setError(err.message || "Failed to update account details. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Render ---
    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
                <button
                    onClick={onBack}
                    style={{
                        ...styles.button,
                        ...styles.secondaryButton,
                        marginBottom: "16px",
                    }}
                >
                    ← Back to Dashboard
                </button>
                <h2 style={{
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    color: "#fff",
                    margin: 0
                }}>
                    My Account Details
                </h2>
            </div>

            {/* Success/Error Messages */}
            {error && <div style={styles.errorMessage}>{error}</div>}
            {successMessage && <div style={styles.successMessage}>{successMessage}</div>}

            {/* Account Form */}
            <form onSubmit={handleSave}>
                {/* Primary Contact Information */}
                <div style={styles.card}>
                    <h3 style={styles.sectionHeader}>Your Details</h3>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Your Name *</label>
                        <input
                            style={styles.input}
                            type="text"
                            name="owner_name"
                            value={formData.owner_name}
                            onChange={handleInputChange}
                            placeholder="Enter your full name"
                            required
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Email Address *</label>
                        <input
                            style={styles.input}
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="your.email@example.com"
                            required
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Phone Number *</label>
                        <input
                            style={styles.input}
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="Your phone number"
                            required
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Address *</label>
                        <textarea
                            style={styles.textArea}
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder="Your full address"
                            required
                        />
                    </div>
                </div>

                {/* Partner Information */}
                <div style={styles.card}>
                    <h3 style={styles.sectionHeader}>Partner Details (Optional)</h3>

                    <div style={styles.toggleContainer}>
                        <input
                            type="checkbox"
                            id="hasPartner"
                            checked={hasPartner}
                            onChange={handlePartnerToggle}
                            style={styles.checkbox}
                        />
                        <label htmlFor="hasPartner" style={{ color: "#d1d5db", margin: 0 }}>
                            My partner should also receive booking confirmations and updates
                        </label>
                    </div>

                    {hasPartner && (
                        <>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Partner's Name</label>
                                <input
                                    style={styles.input}
                                    type="text"
                                    name="partner_name"
                                    value={formData.partner_name}
                                    onChange={handleInputChange}
                                    placeholder="Your partner's name"
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Partner's Email</label>
                                <input
                                    style={styles.input}
                                    type="email"
                                    name="partner_email"
                                    value={formData.partner_email}
                                    onChange={handleInputChange}
                                    placeholder="partner@example.com"
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Partner's Phone</label>
                                <input
                                    style={styles.input}
                                    type="tel"
                                    name="partner_phone"
                                    value={formData.partner_phone}
                                    onChange={handleInputChange}
                                    placeholder="Partner's phone number"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Vet & Insurance Information */}
                <div style={styles.card}>
                    <h3 style={styles.sectionHeader}>Vet & Insurance Information (Optional)</h3>
                    <p style={{ color: "#9ca3af", marginBottom: "16px", fontSize: "0.875rem" }}>
                        This information is helpful for dog sitting services, especially multi-day bookings.
                    </p>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Vet Details</label>
                        <textarea
                            style={styles.textArea}
                            name="vet_info"
                            value={formData.vet_info}
                            onChange={handleInputChange}
                            placeholder="Vet name, address, phone number..."
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Pet Insurance</label>
                        <textarea
                            style={styles.textArea}
                            name="pet_insurance"
                            value={formData.pet_insurance}
                            onChange={handleInputChange}
                            placeholder="Insurance provider, policy number..."
                        />
                    </div>
                </div>

                {/* Photo Sharing Consent (Read-Only) */}
                <div style={styles.card}>
                    <h3 style={styles.sectionHeader}>Photo Sharing Permission</h3>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "16px",
                        backgroundColor: "#1f2937",
                        borderRadius: "6px",
                        border: "1px solid #4b5563"
                    }}>
                        <span style={{
                            fontSize: "1.5rem"
                        }}>
                            {customer.photo_sharing_consent ? "✅" : "❌"}
                        </span>
                        <div>
                            <div style={{
                                color: customer.photo_sharing_consent ? "#10b981" : "#9ca3af",
                                fontWeight: "600",
                                marginBottom: "4px"
                            }}>
                                {customer.photo_sharing_consent
                                    ? "You have allowed photo sharing"
                                    : "Photo sharing not allowed"}
                            </div>
                            <div style={{
                                color: "#6b7280",
                                fontSize: "0.875rem"
                            }}>
                                {customer.photo_sharing_consent
                                    ? "Your dog's photos may appear on our website and social media."
                                    : "Your dog's photos will not be shared publicly."}
                            </div>
                        </div>
                    </div>
                    <p style={{
                        color: "#6b7280",
                        fontSize: "0.8rem",
                        marginTop: "12px",
                        fontStyle: "italic"
                    }}>
                        To change this setting, please contact Hunter's Hounds directly.
                    </p>
                </div>

                {/* Action Buttons */}
                <div style={{ textAlign: "center", marginTop: "24px" }}>
                    <button
                        type="button"
                        onClick={onBack}
                        style={{
                            ...styles.button,
                            ...styles.secondaryButton,
                        }}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        style={{
                            ...styles.button,
                            ...styles.primaryButton,
                            ...(isLoading ? { opacity: 0.7, cursor: 'not-allowed' } : {}),
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </form>
        </div>
    );
}