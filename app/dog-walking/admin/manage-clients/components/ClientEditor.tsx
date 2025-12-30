"use client";

import React, { useState, useEffect } from "react";

// Types
interface Dog {
    id: number;
    dog_name: string;
    dog_breed: string;
    dog_age: number;
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
        dogs: [...client.dogs]
    });

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
                    const response = await fetch(`/api/dog-walking/admin/photo-check/${encodeURIComponent(dog.image_filename)}`);
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
                body: JSON.stringify({
                    owner_name: formData.owner_name,
                    phone: formData.phone,
                    email: formData.email,
                    address: formData.address,
                    vet_info: formData.vet_info,
                    pet_insurance: formData.pet_insurance,
                    photo_sharing_consent: formData.photo_sharing_consent,
                    dogs: formData.dogs
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
            padding: "20px"
        } as React.CSSProperties,
        modal: {
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "12px",
            padding: "24px",
            maxWidth: "800px",
            width: "100%",
            maxHeight: "90vh",
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
                                            <label style={styles.label}>Age (years)</label>
                                            <input
                                                type="number"
                                                value={dog.dog_age || ''}
                                                onChange={(e) => handleDogChange(dog.id, 'dog_age', parseInt(e.target.value) || 0)}
                                                style={styles.input}
                                                min="0"
                                                max="30"
                                            />
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