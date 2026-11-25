"use client";

import React, { useState, useEffect } from "react";
import { formatDogAge, formatDogBirthday, parseBirthdayDate, birthdayToDateString, MONTHS } from "@/lib/dogAge";

// Types
interface Dog {
    id: number;
    dog_name: string;
    dog_breed: string;
    dog_age?: number | null;
    dog_birthday?: string | null;
    image_filename: string | null;
}

interface Client {
    id: number;
    owner_name: string;
    phone: string;
    email: string;
    address: string;
    created_at: string;
    // Vet & Insurance fields
    vet_info?: string | null;
    pet_insurance?: string | null;
    // Photo sharing consent
    photo_sharing_consent?: boolean;
    // Featured in public videos / profile page. Set by the client only.
    public_feature_consent?: boolean | null;
    // Extended travel time (30 min instead of 15 min)
    extended_travel_time?: boolean;
    // Payment preference
    payment_preference?: string | null;
    // Payment account names (exact names on bank transfers, for auto-matching — supports multiple accounts)
    payment_account_names?: string[];
    dogs: Dog[];
}

interface PhotoStatus {
    exists: boolean;
    filename: string;
    path?: string;
    size?: number;
    error?: string;
    message?: string;
}

interface ClientEditorProps {
    client: Client;
    onSave: (updatedClient: Client) => void;
    onCancel: () => void;
}

export default function ClientEditor({ client, onSave, onCancel }: ClientEditorProps) {
    // State for form data
    const [formData, setFormData] = useState({
        owner_name: client.owner_name,
        phone: client.phone,
        email: client.email,
        address: client.address,
        vet_info: client.vet_info || '',
        pet_insurance: client.pet_insurance || '',
        photo_sharing_consent: client.photo_sharing_consent || false,
        extended_travel_time: client.extended_travel_time || false,
        payment_preference: client.payment_preference || 'per_service',
        payment_account_names: client.payment_account_names || [],
        dogs: [...client.dogs]
    });

    // Payment name input
    const [newPaymentName, setNewPaymentName] = useState('');

    const addPaymentName = () => {
        // Normalize whitespace (matches what the payment matcher does on incoming names)
        const name = newPaymentName.trim().replace(/\s+/g, ' ');
        if (name && !formData.payment_account_names.includes(name)) {
            setFormData(prev => ({ ...prev, payment_account_names: [...prev.payment_account_names, name] }));
        }
        setNewPaymentName('');
    };

    const removePaymentName = (index: number) => {
        setFormData(prev => ({
            ...prev,
            payment_account_names: prev.payment_account_names.filter((_, i) => i !== index)
        }));
    };

    // Mobile detection
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // State for photo statuses
    const [photoStatuses, setPhotoStatuses] = useState<Record<number, PhotoStatus>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewPhoto, setPreviewPhoto] = useState<{ dogId: number; path: string; name: string } | null>(null);

    // Check photo statuses on mount and when filenames change
    useEffect(() => {
        checkAllPhotoStatuses();
    }, [formData.dogs]);

    // Functions
    const checkAllPhotoStatuses = async () => {
        const statuses: Record<number, PhotoStatus> = {};
        
        for (const dog of formData.dogs) {
            if (dog.image_filename) {
                try {
                    const response = await fetch(`/api/dog-walking/admin/photo-check/${encodeURIComponent(dog.image_filename)}`, {
                        credentials: 'include'
                    });
                    const data = await response.json();
                    statuses[dog.id] = data;
                } catch (err) {
                    statuses[dog.id] = {
                        exists: false,
                        filename: dog.image_filename,
                        error: "Failed to check file"
                    };
                }
            }
        }
        
        setPhotoStatuses(statuses);
    };

    const generateFilename = async (dog: Dog) => {
        try {
            const response = await fetch('/api/dog-walking/admin/photo-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dog_name: dog.dog_name,
                    owner_name: formData.owner_name,
                    dog_id: dog.id
                })
            });

            const data = await response.json();
            
            if (data.success) {
                // Update the dog's filename
                setFormData(prev => ({
                    ...prev,
                    dogs: prev.dogs.map(d => 
                        d.id === dog.id 
                            ? { ...d, image_filename: data.suggestedFilename }
                            : d
                    )
                }));
            }
        } catch (err) {
            console.error('Failed to generate filename:', err);
        }
    };

    const handleDogChange = (dogId: number, field: keyof Dog, value: any) => {
        setFormData(prev => ({
            ...prev,
            dogs: prev.dogs.map(dog => 
                dog.id === dogId 
                    ? { ...dog, [field]: value }
                    : dog
            )
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        try {
            const response = await fetch(`/api/dog-walking/admin/clients/${client.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                // Only send fields the list endpoint actually gave us.
                //
                // This form is initialised from the row in the client list, and
                // every value is coerced with `|| false` / `|| ''` for the
                // inputs. So any field the list did NOT return arrived as
                // undefined, became a falsy default, and was then written back
                // over the real value — silently, on every unrelated edit.
                //
                // That is exactly what happened to photo_sharing_consent
                // between 2025-12-30 and 2026-11-17: the list never selected
                // it, so editing a client's phone number quietly revoked their
                // consent to use their dog's photo. vet_info and pet_insurance
                // were going the same way.
                //
                // The list now returns all three. This guard is here so the
                // next field added to this form cannot repeat it: if it is
                // missing from the list, we send nothing for it and the PUT
                // route (which ignores undefined) leaves the stored value
                // alone.
                body: JSON.stringify({
                    owner_name: formData.owner_name,
                    phone: formData.phone,
                    email: formData.email,
                    address: formData.address,
                    dogs: formData.dogs,
                    ...(client.vet_info !== undefined ? { vet_info: formData.vet_info } : {}),
                    ...(client.pet_insurance !== undefined ? { pet_insurance: formData.pet_insurance } : {}),
                    ...(client.photo_sharing_consent !== undefined
                        ? { photo_sharing_consent: formData.photo_sharing_consent }
                        : {}),
                    ...(client.extended_travel_time !== undefined
                        ? { extended_travel_time: formData.extended_travel_time }
                        : {}),
                    ...(client.payment_preference !== undefined
                        ? { payment_preference: formData.payment_preference }
                        : {}),
                    ...(client.payment_account_names !== undefined
                        ? { payment_account_names: formData.payment_account_names }
                        : {}),
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update client');
            }

            onSave(data.client);
        } catch (err: any) {
            setError(err.message || 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const showPhotoPreview = (dog: Dog) => {
        const status = photoStatuses[dog.id];
        if (status?.exists && status.path) {
            setPreviewPhoto({
                dogId: dog.id,
                path: status.path,
                name: dog.dog_name
            });
        }
    };

    const clearPhotoFilename = (dogId: number) => {
        setFormData(prev => ({
            ...prev,
            dogs: prev.dogs.map(d => 
                d.id === dogId 
                    ? { ...d, image_filename: null }
                    : d
            )
        }));
    };

    // Styles
    const styles = {
        overlay: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobile ? "0" : "20px",
        } as React.CSSProperties,
        modal: {
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: isMobile ? "0" : "12px",
            padding: "24px",
            maxWidth: "800px",
            width: "100%",
            maxHeight: isMobile ? "100dvh" : "90vh",
            overflow: "auto",
            color: "#fff"
        } as React.CSSProperties,
        header: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            borderBottom: "1px solid #374151",
            paddingBottom: "16px"
        } as React.CSSProperties,
        title: {
            fontSize: "1.5rem",
            fontWeight: "bold",
            color: "#d1d5db"
        } as React.CSSProperties,
        section: {
            marginBottom: "24px"
        } as React.CSSProperties,
        sectionTitle: {
            fontSize: "1.2rem",
            fontWeight: "bold",
            color: "#d1d5db",
            marginBottom: "16px"
        } as React.CSSProperties,
        inputGrid: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "16px",
            marginBottom: "16px"
        } as React.CSSProperties,
        inputGroup: {
            display: "flex",
            flexDirection: "column",
            gap: "4px"
        } as React.CSSProperties,
        label: {
            fontSize: "14px",
            fontWeight: "bold",
            color: "#9ca3af"
        } as React.CSSProperties,
        input: {
            padding: "12px",
            backgroundColor: "#374151",
            border: "1px solid #4b5563",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "16px"
        } as React.CSSProperties,
        dogCard: {
            backgroundColor: "#374151",
            border: "1px solid #4b5563",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "16px"
        } as React.CSSProperties,
        dogHeader: {
            fontSize: "1.1rem",
            fontWeight: "bold",
            color: "#d1d5db",
            marginBottom: "12px"
        } as React.CSSProperties,
        photoRow: {
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "12px",
            flexWrap: "wrap"
        } as React.CSSProperties,
        button: {
            padding: "8px 16px",
            backgroundColor: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            fontSize: "14px",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "background-color 0.2s"
        } as React.CSSProperties,
        buttonSecondary: {
            backgroundColor: "#6b7280"
        } as React.CSSProperties,
        buttonSuccess: {
            backgroundColor: "#059669"
        } as React.CSSProperties,
        buttonDanger: {
            backgroundColor: "#dc2626"
        } as React.CSSProperties,
        statusIcon: {
            fontSize: "18px",
            marginLeft: "8px"
        } as React.CSSProperties,
        footer: {
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid #374151"
        } as React.CSSProperties,
        error: {
            backgroundColor: "#1f2937",
            border: "1px solid #dc2626",
            borderRadius: "6px",
            padding: "12px",
            color: "#fca5a5",
            marginBottom: "16px"
        } as React.CSSProperties,
        tip: {
            backgroundColor: "#374151",
            border: "1px solid #4b5563",
            borderRadius: "6px",
            padding: "12px",
            color: "#9ca3af",
            fontSize: "14px",
            marginTop: "16px"
        } as React.CSSProperties
    };

    return (
        <>
            <div style={styles.overlay}>
                <div style={styles.modal}>
                    {/* Header */}
                    <div style={styles.header}>
                        <h2 style={styles.title}>
                            Edit Client: {client.owner_name} (#{client.id})
                        </h2>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div style={styles.error}>
                            Error: {error}
                        </div>
                    )}

                    {/* Owner Information Section */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Owner Information</h3>
                        <div style={styles.inputGrid}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Full Name</label>
                                <input
                                    type="text"
                                    value={formData.owner_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                                    style={styles.input}
                                    placeholder="Owner full name"
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Phone Number</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                    style={styles.input}
                                    placeholder="Phone number"
                                />
                            </div>
                        </div>
                        <div style={styles.inputGrid}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Email Address</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    style={styles.input}
                                    placeholder="Email address"
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Address</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                    style={styles.input}
                                    placeholder="Full address"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Vet & Insurance Section */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Vet & Insurance Information</h3>
                        <div style={styles.inputGrid}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Vet Details</label>
                                <textarea
                                    value={formData.vet_info}
                                    onChange={(e) => setFormData(prev => ({ ...prev, vet_info: e.target.value }))}
                                    style={{ ...styles.input, minHeight: "80px", resize: "vertical" }}
                                    placeholder="Vet name, address, phone number..."
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Pet Insurance</label>
                                <textarea
                                    value={formData.pet_insurance}
                                    onChange={(e) => setFormData(prev => ({ ...prev, pet_insurance: e.target.value }))}
                                    style={{ ...styles.input, minHeight: "80px", resize: "vertical" }}
                                    placeholder="Insurance provider, policy number..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Photo Sharing Consent Section */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Photo Sharing Consent</h3>
                        <label style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            cursor: "pointer",
                            padding: "12px",
                            backgroundColor: "#374151",
                            border: "1px solid #4b5563",
                            borderRadius: "6px"
                        }}>
                            <input
                                type="checkbox"
                                checked={formData.photo_sharing_consent}
                                onChange={(e) => setFormData(prev => ({ ...prev, photo_sharing_consent: e.target.checked }))}
                                style={{
                                    width: "20px",
                                    height: "20px",
                                    cursor: "pointer"
                                }}
                            />
                            <span style={{ color: "#d1d5db" }}>
                                Client allows sharing photos of their dog on website and social media
                            </span>
                            <span style={{
                                marginLeft: "auto",
                                fontSize: "14px",
                                color: formData.photo_sharing_consent ? "#10b981" : "#9ca3af"
                            }}>
                                {formData.photo_sharing_consent ? "✅ Allowed" : "❌ Not allowed"}
                            </span>
                        </label>

                        {/* Read-only on purpose: this answer is only ever the
                            client's own, given in their dashboard. */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px",
                            marginTop: "10px",
                            backgroundColor: "#1f2937",
                            border: "1px solid #4b5563",
                            borderRadius: "6px"
                        }}>
                            <span style={{ color: "#d1d5db" }}>
                                Videos &amp; pack profile (client sets this in their dashboard)
                            </span>
                            <span style={{
                                marginLeft: "auto",
                                fontSize: "14px",
                                color: client.public_feature_consent === true ? "#10b981" : "#9ca3af"
                            }}>
                                {client.public_feature_consent === true
                                    ? "✅ Yes"
                                    : client.public_feature_consent === false
                                        ? "❌ No"
                                        : "— Not answered yet"}
                            </span>
                        </div>
                    </div>

                    {/* Extended Travel Time Section */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Travel Time</h3>
                        <label style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            cursor: "pointer",
                            padding: "12px",
                            backgroundColor: "#374151",
                            border: "1px solid #4b5563",
                            borderRadius: "6px"
                        }}>
                            <input
                                type="checkbox"
                                checked={formData.extended_travel_time}
                                onChange={(e) => setFormData(prev => ({ ...prev, extended_travel_time: e.target.checked }))}
                                style={{
                                    width: "20px",
                                    height: "20px",
                                    cursor: "pointer"
                                }}
                            />
                            <span style={{ color: "#d1d5db" }}>
                                Extended travel time (30 min instead of 15 min) - for clients outside catchment area
                            </span>
                            <span style={{
                                marginLeft: "auto",
                                fontSize: "14px",
                                color: formData.extended_travel_time ? "#f59e0b" : "#9ca3af"
                            }}>
                                {formData.extended_travel_time ? "30 min buffer" : "15 min buffer"}
                            </span>
                        </label>
                    </div>

                    {/* Payment Preferences Section */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Payment Preferences</h3>
                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                            padding: "12px",
                            backgroundColor: "#374151",
                            border: "1px solid #4b5563",
                            borderRadius: "6px"
                        }}>
                            {[
                                { value: 'per_service', label: 'Per Service', desc: 'Pay after each service (default)' },
                                { value: 'weekly', label: 'Weekly', desc: 'Pay on Monday after week ends' },
                                { value: 'fortnightly', label: 'Fortnightly', desc: 'Pay on Monday after 2-week period ends' },
                                { value: 'monthly', label: 'Monthly', desc: 'Pay on 1st of new month' }
                            ].map(option => (
                                <label
                                    key={option.value}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "12px",
                                        cursor: "pointer",
                                        padding: "8px",
                                        borderRadius: "4px",
                                        backgroundColor: formData.payment_preference === option.value ? "#1f2937" : "transparent",
                                        border: formData.payment_preference === option.value ? "1px solid #3b82f6" : "1px solid transparent"
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="payment_preference"
                                        value={option.value}
                                        checked={formData.payment_preference === option.value}
                                        onChange={(e) => setFormData(prev => ({ ...prev, payment_preference: e.target.value }))}
                                        style={{
                                            width: "18px",
                                            height: "18px",
                                            cursor: "pointer"
                                        }}
                                    />
                                    <div>
                                        <span style={{ color: "#d1d5db", fontWeight: "600" }}>{option.label}</span>
                                        <span style={{ color: "#9ca3af", fontSize: "14px", marginLeft: "8px" }}>
                                            - {option.desc}
                                        </span>
                                    </div>
                                </label>
                            ))}
                        </div>
                        <div style={{ marginTop: "16px" }}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Payment Account Names</label>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                                    {formData.payment_account_names.map((name, i) => (
                                        <span key={i} style={{
                                            display: "inline-flex", alignItems: "center", gap: "4px",
                                            padding: "4px 10px", borderRadius: "999px",
                                            background: "#e5e7eb", fontSize: "13px", color: "#1f2937"
                                        }}>
                                            {name}
                                            <button
                                                type="button"
                                                onClick={() => removePaymentName(i)}
                                                style={{
                                                    background: "none", border: "none", cursor: "pointer",
                                                    padding: "0 0 0 2px", color: "#6b7280", fontSize: "15px",
                                                    lineHeight: 1
                                                }}
                                                title="Remove"
                                            >×</button>
                                        </span>
                                    ))}
                                </div>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <input
                                        type="text"
                                        value={newPaymentName}
                                        onChange={(e) => setNewPaymentName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPaymentName(); } }}
                                        style={{ ...styles.input, flex: 1, marginBottom: 0 }}
                                        placeholder="Exact name as it appears on bank transfer"
                                    />
                                    <button
                                        type="button"
                                        onClick={addPaymentName}
                                        style={{
                                            padding: "8px 14px", borderRadius: "6px", border: "1px solid #d1d5db",
                                            background: "#f9fafb", cursor: "pointer", fontSize: "13px",
                                            color: "#374151", whiteSpace: "nowrap"
                                        }}
                                    >Add</button>
                                </div>
                                <span style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
                                    Add one entry per bank account. Names must match exactly as they appear on Revolut transfers. Added automatically after the first matched payment.
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Dogs & Photos Section */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Dogs & Photos</h3>
                        
                        {formData.dogs.map((dog) => {
                            const photoStatus = photoStatuses[dog.id];
                            return (
                                <div key={dog.id} style={styles.dogCard}>
                                    <div style={styles.dogHeader}>
                                        🐕 {dog.dog_name} (#{dog.id})
                                    </div>
                                    
                                    <div style={styles.inputGrid}>
                                        <div style={styles.inputGroup}>
                                            <label style={styles.label}>Dog Name</label>
                                            <input
                                                type="text"
                                                value={dog.dog_name}
                                                onChange={(e) => handleDogChange(dog.id, 'dog_name', e.target.value)}
                                                style={styles.input}
                                            />
                                        </div>
                                        <div style={styles.inputGroup}>
                                            <label style={styles.label}>Breed</label>
                                            <input
                                                type="text"
                                                value={dog.dog_breed || ''}
                                                onChange={(e) => handleDogChange(dog.id, 'dog_breed', e.target.value)}
                                                style={styles.input}
                                            />
                                        </div>
                                        <div style={styles.inputGroup}>
                                            <label style={styles.label}>
                                                Birthday (Month &amp; Year)
                                                {dog.dog_birthday && (
                                                    <span style={{ color: '#9ca3af', fontWeight: 'normal', marginLeft: 8 }}>
                                                        — {formatDogAge(dog.dog_birthday)} old
                                                    </span>
                                                )}
                                                {!dog.dog_birthday && dog.dog_age != null && (
                                                    <span style={{ color: '#f59e0b', fontWeight: 'normal', marginLeft: 8 }}>
                                                        — {dog.dog_age} yrs (static, no birthday set)
                                                    </span>
                                                )}
                                            </label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <select
                                                    style={{ ...styles.input, flex: 2 }}
                                                    value={dog.dog_birthday ? String(parseBirthdayDate(dog.dog_birthday)?.month ?? '') : ''}
                                                    onChange={(e) => {
                                                        const parsed = parseBirthdayDate(dog.dog_birthday);
                                                        const year = parsed?.year ?? new Date().getFullYear();
                                                        const month = parseInt(e.target.value);
                                                        if (month) handleDogChange(dog.id, 'dog_birthday', birthdayToDateString(month, year));
                                                    }}
                                                >
                                                    <option value="">Month</option>
                                                    {MONTHS.map((m, i) => (
                                                        <option key={m} value={String(i + 1)}>{m}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    style={{ ...styles.input, flex: 1 }}
                                                    value={dog.dog_birthday ? String(parseBirthdayDate(dog.dog_birthday)?.year ?? '') : ''}
                                                    onChange={(e) => {
                                                        const parsed = parseBirthdayDate(dog.dog_birthday);
                                                        const month = parsed?.month ?? 1;
                                                        const year = parseInt(e.target.value);
                                                        if (year) handleDogChange(dog.id, 'dog_birthday', birthdayToDateString(month, year));
                                                    }}
                                                >
                                                    <option value="">Year</option>
                                                    {Array.from({ length: new Date().getFullYear() - 1989 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                                        <option key={y} value={String(y)}>{y}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Photo Management Row */}
                                    <div style={styles.photoRow}>
                                        <div style={styles.inputGroup}>
                                            <label style={styles.label}>Photo Filename</label>
                                            <input
                                                type="text"
                                                value={dog.image_filename || ''}
                                                onChange={(e) => handleDogChange(dog.id, 'image_filename', e.target.value || null)}
                                                style={{ ...styles.input, minWidth: "250px" }}
                                                placeholder="e.g., bella_smith_123.jpg"
                                            />
                                        </div>

                                        {/* Photo status indicator */}
                                        {photoStatus && (
                                            <span style={styles.statusIcon}>
                                                {photoStatus.exists ? "✅" : "❌"}
                                            </span>
                                        )}

                                        {/* Action buttons */}
                                        <button
                                            onClick={() => generateFilename(dog)}
                                            style={{ ...styles.button, ...styles.buttonSecondary }}
                                            type="button"
                                        >
                                            Generate
                                        </button>

                                        {photoStatus?.exists && (
                                            <button
                                                onClick={() => showPhotoPreview(dog)}
                                                style={{ ...styles.button, ...styles.buttonSuccess }}
                                                type="button"
                                            >
                                                Preview
                                            </button>
                                        )}

                                        {dog.image_filename && (
                                            <button
                                                onClick={() => clearPhotoFilename(dog.id)}
                                                style={{ ...styles.button, ...styles.buttonDanger }}
                                                type="button"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>

                                    {/* Photo status message */}
                                    {photoStatus && (
                                        <div style={{ fontSize: "14px", color: "#9ca3af", marginTop: "8px" }}>
                                            {photoStatus.exists 
                                                ? `✅ File exists (${Math.round((photoStatus.size || 0) / 1024)}KB)`
                                                : "❌ " + (photoStatus.message || photoStatus.error || "File not found")
                                            }
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Upload tip */}
                        <div style={styles.tip}>
                            💡 <strong>Upload Tips:</strong> Use Filezilla to upload photos to <code>/public/images/dogs/</code>.
                            Recommended format: <code>dogname_ownerlastname_dogid.jpg</code>
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div style={styles.footer}>
                        <button
                            onClick={onCancel}
                            style={{ ...styles.button, ...styles.buttonSecondary }}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            style={styles.button}
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Photo Preview Modal */}
            {previewPhoto && (
                <div style={styles.overlay}>
                    <div style={{ ...styles.modal, maxWidth: "600px" }}>
                        <div style={styles.header}>
                            <h3 style={styles.title}>{previewPhoto.name}'s Photo</h3>
                        </div>
                        
                        <div style={{ textAlign: "center", padding: "20px" }}>
                            <img 
                                src={previewPhoto.path}
                                alt={`${previewPhoto.name}'s photo`}
                                style={{
                                    maxWidth: "100%",
                                    maxHeight: "400px",
                                    borderRadius: "8px",
                                    border: "1px solid #374151"
                                }}
                            />
                        </div>
                        
                        <div style={{ fontSize: "14px", color: "#9ca3af", textAlign: "center", marginBottom: "16px" }}>
                            Path: {previewPhoto.path}
                        </div>
                        
                        <div style={styles.footer}>
                            <button
                                onClick={() => setPreviewPhoto(null)}
                                style={styles.button}
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}