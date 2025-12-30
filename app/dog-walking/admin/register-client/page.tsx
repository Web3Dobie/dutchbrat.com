"use client";

import React, { useState } from "react";

interface RegisterData {
    ownerName: string;
    phone: string;
    email: string;
    address: string;
    dogName: string;
    dogBreed: string;
    dogAge: string;
    photoConsent: boolean;
}

interface RegisteredUser {
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

export default function AdminRegisterClient() {
    const [formData, setFormData] = useState<RegisterData>({
        ownerName: "",
        phone: "",
        email: "",
        address: "",
        dogName: "",
        dogBreed: "",
        dogAge: "",
        photoConsent: false,
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<RegisteredUser | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        // Basic validation
        if (!formData.ownerName || !formData.phone || !formData.email ||
            !formData.address || !formData.dogName || !formData.dogBreed || !formData.dogAge) {
            setError("All fields are required");
            setIsLoading(false);
            return;
        }

        const dogAge = parseInt(formData.dogAge, 10);
        if (isNaN(dogAge) || dogAge < 0 || dogAge > 30) {
            setError("Dog age must be a valid number between 0 and 30");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch("/api/dog-walking/user-register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...formData,
                    dogAge: dogAge,
                    photoSharingConsent: formData.photoConsent,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Registration failed");
            }

            const result = await response.json();
            setSuccess(result.user);

            // Reset form
            setFormData({
                ownerName: "",
                phone: "",
                email: "",
                address: "",
                dogName: "",
                dogBreed: "",
                dogAge: "",
                photoConsent: false,
            });

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const styles = {
        container: {
            maxWidth: "600px",
            margin: "0 auto",
            padding: "24px",
            backgroundColor: "#111827",
            color: "#fff",
            minHeight: "100vh",
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
        subtitle: {
            color: "#9ca3af",
        } as React.CSSProperties,
        form: {
            padding: "24px",
            border: "1px solid #333",
            borderRadius: "8px",
            backgroundColor: "#1f2937",
            marginBottom: "24px",
        } as React.CSSProperties,
        sectionTitle: {
            fontSize: "1.2rem",
            fontWeight: "bold",
            color: "#d1d5db",
            marginBottom: "16px",
            borderBottom: "1px solid #333",
            paddingBottom: "8px",
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
            width: "100%",
            padding: "12px",
            fontSize: "1rem",
            fontWeight: "bold",
            color: "#fff",
            backgroundColor: "#3b82f6",
            border: "none",
            borderRadius: "4px",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.6 : 1,
        } as React.CSSProperties,
        error: {
            color: "#ef4444",
            marginBottom: "16px",
            padding: "12px",
            backgroundColor: "#1f2937",
            border: "1px solid #ef4444",
            borderRadius: "4px",
        } as React.CSSProperties,
        success: {
            color: "#10b981",
            backgroundColor: "#1f2937",
            border: "1px solid #10b981",
            borderRadius: "4px",
            padding: "16px",
            marginBottom: "24px",
        } as React.CSSProperties,
        successTitle: {
            fontWeight: "bold",
            fontSize: "1.1rem",
            marginBottom: "8px",
        } as React.CSSProperties,
        backLink: {
            display: "inline-block",
            color: "#3b82f6",
            textDecoration: "none",
            marginTop: "16px",
        } as React.CSSProperties,
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>Admin - Register New Client</h1>
                <p style={styles.subtitle}>Add a new client and their first dog to the system.<br />A welcome email will be automatically sent to the client.</p>
            </div>

            {error && (
                <div style={styles.error}>
                    {error}
                </div>
            )}

            {success && (
                <div style={styles.success}>
                    <div style={styles.successTitle}>✅ Client Registered Successfully!</div>
                    <div><strong>Owner:</strong> {success.owner_name} (ID: {success.owner_id})</div>
                    <div><strong>Phone:</strong> {success.phone}</div>
                    <div><strong>Email:</strong> {success.email}</div>
                    <div><strong>Dog:</strong> {success.dogs[0]?.dog_name} ({success.dogs[0]?.dog_breed}, {success.dogs[0]?.dog_age} years old)</div>
                    <div style={{ marginTop: "12px", fontSize: "0.9rem", color: "#059669" }}>
                        📧 Welcome email sent to client<br />
                        📱 Telegram notification sent to you
                    </div>
                    <a href="/dog-walking/admin/register-client" style={styles.backLink}>Register Another Client</a>
                </div>
            )}

            <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.sectionTitle}>Owner Information</div>

                <label style={styles.label}>Full Name</label>
                <input
                    type="text"
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="Enter client's full name"
                    required
                />

                <label style={styles.label}>Phone Number</label>
                <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="07123456789"
                    required
                />

                <label style={styles.label}>Email Address</label>
                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="client@email.com"
                    required
                />

                <label style={styles.label}>Address</label>
                <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    style={styles.textarea}
                    placeholder="Full address including postcode"
                    required
                />

                <div style={styles.sectionTitle}>First Dog</div>

                <label style={styles.label}>Dog Name</label>
                <input
                    type="text"
                    name="dogName"
                    value={formData.dogName}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="Enter dog's name"
                    required
                />

                <label style={styles.label}>Breed</label>
                <input
                    type="text"
                    name="dogBreed"
                    value={formData.dogBreed}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="Enter dog's breed"
                    required
                />

                <label style={styles.label}>Age (years)</label>
                <input
                    type="number"
                    name="dogAge"
                    value={formData.dogAge}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="0"
                    min="0"
                    max="30"
                    required
                />

                <div style={styles.sectionTitle}>Photo Sharing Consent</div>
                <label style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    cursor: "pointer",
                    color: "#d1d5db",
                    marginBottom: "24px"
                }}>
                    <input
                        type="checkbox"
                        checked={formData.photoConsent}
                        onChange={(e) => setFormData(prev => ({ ...prev, photoConsent: e.target.checked }))}
                        style={{
                            marginTop: "4px",
                            width: "18px",
                            height: "18px",
                            cursor: "pointer"
                        }}
                    />
                    <span style={{ fontSize: "14px", lineHeight: "1.5" }}>
                        Client gives permission to share photos of their dog on website and social media
                    </span>
                </label>

                <button
                    type="submit"
                    style={styles.button}
                    disabled={isLoading}
                >
                    {isLoading ? "Registering..." : "Register Client"}
                </button>
            </form>
        </div>
    );
}