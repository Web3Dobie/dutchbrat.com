"use client";

import React, { useState, useEffect } from "react";

// --- Types ---
interface Customer {
    owner_id: number;
    owner_name: string;
    phone: string;
    email: string;
    address: string;
    dogs: Array<{
        id: number;
        dog_name: string;
        dog_breed: string;
        dog_age: number;
        image_filename?: string | null;
    }>;
    partner_name?: string | null;
    partner_email?: string | null;
    partner_phone?: string | null;
}

interface SecondaryAddress {
    id: number;
    address: string;
    address_label: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    partner_name?: string | null;
    partner_email?: string | null;
    partner_phone?: string | null;
    is_active: boolean;
    notes?: string | null;
    created_at: string;
    updated_at: string;
}

interface SecondaryAddressFormData {
    address: string;
    address_label: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    partner_name: string;
    partner_email: string;
    partner_phone: string;
    notes: string;
}

interface SecondaryAddressesProps {
    customer: Customer;
    onBack: () => void;
}

export default function SecondaryAddresses({ customer, onBack }: SecondaryAddressesProps) {
    // --- State ---
    const [addresses, setAddresses] = useState<SecondaryAddress[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<SecondaryAddressFormData>({
        address: '',
        address_label: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        partner_name: '',
        partner_email: '',
        partner_phone: '',
        notes: '',
    });
    const [hasPartner, setHasPartner] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // --- Styles ---
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
        addressCard: {
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "16px",
            position: "relative" as const,
        } as React.CSSProperties,
        inactiveCard: {
            backgroundColor: "#1f2937",
            border: "1px solid #4b5563",
            opacity: 0.7,
        } as React.CSSProperties,
        button: {
            padding: "8px 16px",
            fontSize: "0.875rem",
            fontWeight: "600",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s",
            marginRight: "8px",
            marginBottom: "8px",
        } as React.CSSProperties,
        primaryButton: {
            backgroundColor: "#3b82f6",
            color: "#fff",
        } as React.CSSProperties,
        secondaryButton: {
            backgroundColor: "#6b7280",
            color: "#fff",
        } as React.CSSProperties,
        dangerButton: {
            backgroundColor: "#ef4444",
            color: "#fff",
        } as React.CSSProperties,
        successButton: {
            backgroundColor: "#10b981",
            color: "#fff",
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
        statusBadge: {
            position: "absolute" as const,
            top: "16px",
            right: "16px",
            padding: "4px 12px",
            fontSize: "0.75rem",
            fontWeight: "600",
            borderRadius: "12px",
            textTransform: "capitalize" as const,
        } as React.CSSProperties,
        activeBadge: {
            backgroundColor: "#065f46",
            color: "#a7f3d0",
        } as React.CSSProperties,
        inactiveBadge: {
            backgroundColor: "#7f1d1d",
            color: "#fecaca",
        } as React.CSSProperties,
    };

    // --- Effects ---
    useEffect(() => {
        fetchAddresses();
    }, [customer.owner_id]);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    // --- API Functions ---
    const fetchAddresses = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch(`/api/dog-walking/secondary-addresses?owner_id=${customer.owner_id}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch addresses");
            }

            setAddresses(data.addresses || []);
        } catch (err: any) {
            console.error("Failed to fetch addresses:", err);
            setError(err.message || "Could not load addresses. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            address: '',
            address_label: '',
            contact_name: '',
            contact_email: '',
            contact_phone: '',
            partner_name: '',
            partner_email: '',
            partner_phone: '',
            notes: '',
        });
        setHasPartner(false);
        setShowAddForm(false);
        setEditingId(null);
        setError(null);
        setSuccessMessage(null);
    };

    const handleAddAddress = () => {
        resetForm();
        setShowAddForm(true);
    };

    const handleEditAddress = (address: SecondaryAddress) => {
        setFormData({
            address: address.address,
            address_label: address.address_label,
            contact_name: address.contact_name,
            contact_email: address.contact_email,
            contact_phone: address.contact_phone,
            partner_name: address.partner_name || '',
            partner_email: address.partner_email || '',
            partner_phone: address.partner_phone || '',
            notes: address.notes || '',
        });
        setHasPartner(!!address.partner_name || !!address.partner_email);
        setEditingId(address.id);
        setShowAddForm(true);
        setError(null);
        setSuccessMessage(null);
    };

    const validateForm = (): boolean => {
        if (!formData.address.trim()) {
            setError("Address is required");
            return false;
        }
        if (!formData.address_label.trim()) {
            setError("Address label is required (e.g., 'Sarah's House')");
            return false;
        }
        if (!formData.contact_name.trim()) {
            setError("Contact name is required");
            return false;
        }
        if (!formData.contact_phone.trim()) {
            setError("Contact phone is required");
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const submitData = hasPartner ? formData : {
                ...formData,
                partner_name: '',
                partner_email: '',
                partner_phone: '',
            };

            const url = editingId
                ? `/api/dog-walking/secondary-addresses/${editingId}`
                : `/api/dog-walking/secondary-addresses`;

            const method = editingId ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...submitData,
                    owner_id: customer.owner_id,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Failed to ${editingId ? 'update' : 'create'} address`);
            }

            setSuccessMessage(editingId ? "Address updated successfully!" : "Address added successfully!");
            resetForm();
            await fetchAddresses(); // Refresh the list

        } catch (err: any) {
            console.error("Failed to save address:", err);
            setError(err.message || "Failed to save address. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleActive = async (addressId: number, currentActive: boolean) => {
        try {
            const response = await fetch(`/api/dog-walking/secondary-addresses/${addressId}/toggle`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    is_active: !currentActive,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to toggle address status");
            }

            setSuccessMessage(`Address ${!currentActive ? 'activated' : 'deactivated'} successfully!`);
            await fetchAddresses();

        } catch (err: any) {
            console.error("Failed to toggle address:", err);
            setError(err.message || "Failed to update address status. Please try again.");
        }
    };

    const handleDeleteAddress = async (addressId: number) => {
        if (!window.confirm("Are you sure you want to delete this address? This action cannot be undone.")) {
            return;
        }

        try {
            const response = await fetch(`/api/dog-walking/secondary-addresses/${addressId}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to delete address");
            }

            setSuccessMessage("Address deleted successfully!");
            await fetchAddresses();

        } catch (err: any) {
            console.error("Failed to delete address:", err);
            setError(err.message || "Failed to delete address. Please try again.");
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user starts typing
        if (error) setError(null);
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
                    Secondary Addresses
                </h2>
                <p style={{
                    color: "#9ca3af",
                    fontSize: "0.9rem",
                    margin: "8px 0 0 0"
                }}>
                    Manage alternate pickup and drop-off locations
                </p>
            </div>

            {/* Success/Error Messages */}
            {error && <div style={styles.errorMessage}>{error}</div>}
            {successMessage && <div style={styles.successMessage}>{successMessage}</div>}

            {/* Add New Address Button */}
            {!showAddForm && (
                <div style={{ marginBottom: "24px" }}>
                    <button
                        onClick={handleAddAddress}
                        style={{
                            ...styles.button,
                            ...styles.successButton,
                        }}
                    >
                        + Add New Address
                    </button>
                </div>
            )}

            {/* Add/Edit Form */}
            {showAddForm && (
                <div style={styles.card}>
                    <h3 style={{
                        fontSize: "1.25rem",
                        fontWeight: "600",
                        color: "#fff",
                        marginBottom: "20px",
                        borderBottom: "2px solid #374151",
                        paddingBottom: "8px",
                    }}>
                        {editingId ? "Edit Address" : "Add New Address"}
                    </h3>

                    <form onSubmit={handleSubmit}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Address Label *</label>
                            <input
                                style={styles.input}
                                type="text"
                                name="address_label"
                                value={formData.address_label}
                                onChange={handleInputChange}
                                placeholder="e.g., Sarah's House, Work Office, Dog Sitter"
                                required
                            />
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Full Address *</label>
                            <textarea
                                style={styles.textArea}
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                placeholder="Enter the complete address"
                                required
                            />
                        </div>

                        <div style={{
                            borderBottom: "1px solid #374151",
                            marginBottom: "20px",
                            paddingBottom: "16px"
                        }}>
                            <h4 style={{
                                fontSize: "1.1rem",
                                fontWeight: "600",
                                color: "#fff",
                                marginBottom: "16px"
                            }}>
                                Primary Contact at This Address
                            </h4>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Contact Name *</label>
                                <input
                                    style={styles.input}
                                    type="text"
                                    name="contact_name"
                                    value={formData.contact_name}
                                    onChange={handleInputChange}
                                    placeholder="Who to contact at this address"
                                    required
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Contact Email</label>
                                <input
                                    style={styles.input}
                                    type="email"
                                    name="contact_email"
                                    value={formData.contact_email}
                                    onChange={handleInputChange}
                                    placeholder="contact@example.com"
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Contact Phone *</label>
                                <input
                                    style={styles.input}
                                    type="tel"
                                    name="contact_phone"
                                    value={formData.contact_phone}
                                    onChange={handleInputChange}
                                    placeholder="Contact phone number"
                                    required
                                />
                            </div>
                        </div>

                        {/* Partner Section */}
                        <div style={{ marginBottom: "20px" }}>
                            <h4 style={{
                                fontSize: "1.1rem",
                                fontWeight: "600",
                                color: "#fff",
                                marginBottom: "16px"
                            }}>
                                Partner at This Address (Optional)
                            </h4>

                            <div style={styles.toggleContainer}>
                                <input
                                    type="checkbox"
                                    id="hasAddressPartner"
                                    checked={hasPartner}
                                    onChange={handlePartnerToggle}
                                    style={styles.checkbox}
                                />
                                <label htmlFor="hasAddressPartner" style={{ color: "#d1d5db", margin: 0 }}>
                                    There's a partner at this address who should also receive notifications
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
                                            placeholder="Partner's name"
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

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Notes (Optional)</label>
                            <textarea
                                style={styles.textArea}
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                placeholder="Any special instructions or notes about this address"
                            />
                        </div>

                        <div style={{ textAlign: "center", marginTop: "24px" }}>
                            <button
                                type="button"
                                onClick={resetForm}
                                style={{
                                    ...styles.button,
                                    ...styles.secondaryButton,
                                }}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                style={{
                                    ...styles.button,
                                    ...styles.primaryButton,
                                    ...(isSubmitting ? { opacity: 0.7, cursor: 'not-allowed' } : {}),
                                }}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Saving..." : editingId ? "Update Address" : "Add Address"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Address List */}
            <div style={styles.card}>
                <h3 style={{
                    fontSize: "1.25rem",
                    fontWeight: "600",
                    color: "#fff",
                    marginBottom: "20px",
                    borderBottom: "2px solid #374151",
                    paddingBottom: "8px",
                }}>
                    Your Addresses ({addresses.length})
                </h3>

                {isLoading && (
                    <p style={{ color: "#9ca3af", textAlign: "center", padding: "40px" }}>
                        Loading addresses...
                    </p>
                )}

                {!isLoading && addresses.length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px 20px" }}>
                        <p style={{ color: "#9ca3af", fontSize: "1.1rem", marginBottom: "16px" }}>
                            No secondary addresses added yet
                        </p>
                        <p style={{ color: "#6b7280", marginBottom: "20px" }}>
                            Add alternate addresses for convenient pickup and drop-off options.
                        </p>
                        <button
                            onClick={handleAddAddress}
                            style={{
                                ...styles.button,
                                ...styles.primaryButton,
                            }}
                        >
                            Add Your First Address
                        </button>
                    </div>
                )}

                {!isLoading && addresses.length > 0 && addresses.map((address) => (
                    <div
                        key={address.id}
                        style={{
                            ...styles.addressCard,
                            ...(address.is_active ? {} : styles.inactiveCard),
                        }}
                    >
                        {/* Status Badge */}
                        <div
                            style={{
                                ...styles.statusBadge,
                                ...(address.is_active ? styles.activeBadge : styles.inactiveBadge),
                            }}
                        >
                            {address.is_active ? "Active" : "Inactive"}
                        </div>

                        {/* Main Content */}
                        <h4 style={{
                            color: "#fff",
                            fontSize: "1.1rem",
                            fontWeight: "600",
                            marginBottom: "8px",
                            paddingRight: "100px" // Space for status badge
                        }}>
                            {address.address_label}
                        </h4>

                        <p style={{ color: "#d1d5db", marginBottom: "12px", fontSize: "0.9rem" }}>
                            {address.address}
                        </p>

                        <div style={{ marginBottom: "12px" }}>
                            <p style={{ color: "#9ca3af", fontSize: "0.875rem", margin: "4px 0" }}>
                                <strong>Contact:</strong> {address.contact_name}
                            </p>
                            {address.contact_email && (
                                <p style={{ color: "#9ca3af", fontSize: "0.875rem", margin: "4px 0" }}>
                                    <strong>Email:</strong> {address.contact_email}
                                </p>
                            )}
                            <p style={{ color: "#9ca3af", fontSize: "0.875rem", margin: "4px 0" }}>
                                <strong>Phone:</strong> {address.contact_phone}
                            </p>

                            {address.partner_name && (
                                <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #4b5563" }}>
                                    <p style={{ color: "#9ca3af", fontSize: "0.875rem", margin: "4px 0" }}>
                                        <strong>Partner:</strong> {address.partner_name}
                                        {address.partner_email && ` (${address.partner_email})`}
                                    </p>
                                </div>
                            )}

                            {address.notes && (
                                <p style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: "8px", fontStyle: "italic" }}>
                                    <strong>Notes:</strong> {address.notes}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div>
                            <button
                                onClick={() => handleEditAddress(address)}
                                style={{
                                    ...styles.button,
                                    ...styles.primaryButton,
                                }}
                            >
                                Edit
                            </button>

                            <button
                                onClick={() => handleToggleActive(address.id, address.is_active)}
                                style={{
                                    ...styles.button,
                                    ...(address.is_active ? styles.dangerButton : styles.successButton),
                                }}
                            >
                                {address.is_active ? "Deactivate" : "Activate"}
                            </button>

                            <button
                                onClick={() => handleDeleteAddress(address.id)}
                                style={{
                                    ...styles.button,
                                    ...styles.dangerButton,
                                    opacity: 0.8,
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}