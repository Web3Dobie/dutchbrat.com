"use client";

import React, { useState, useEffect } from "react";
import { addMinutes } from "date-fns";
import BookingForm from "../../../components/BookingForm";
import DashboardAuth from "../../../components/DashboardAuth";

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
    }>;
}

interface User {
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
    }>;
}

interface BookingService {
    id: string;
    name: string;
    duration: number;
    description: string;
}

// Available services
const SERVICES: BookingService[] = [
    {
        id: "meetgreet",
        name: "Meet & Greet",
        duration: 30,
        description: "Initial meeting to get to know your dog"
    },
    {
        id: "quick",
        name: "Quick Walk",
        duration: 30,
        description: "Perfect for a quick bathroom break and stretch"
    },
    {
        id: "solo",
        name: "Solo Walk",
        duration: 60,
        description: "One-on-one attention with solo or duo dogs"
    },
];

export default function AuthenticatedBookingPage() {
    // --- State ---
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [selectedService, setSelectedService] = useState<BookingService | null>(null);
    const [selectedDuration, setSelectedDuration] = useState<number | undefined>(undefined);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // --- Effects ---
    useEffect(() => {
        // Check if user is already authenticated in dashboard context
        checkDashboardAuth();
    }, []);

    // --- API Functions ---
    const checkDashboardAuth = async () => {
        try {
            // Try to get user from session/localStorage or URL params
            const urlParams = new URLSearchParams(window.location.search);
            const userId = urlParams.get('userId');
            const userPhone = urlParams.get('phone');
            const userEmail = urlParams.get('email');

            console.log("🔍 Auth check - URL params:", { userId, userPhone, userEmail });

            // Always prefer phone/email over userId for customer lookup
            if (userPhone || userEmail) {
                // User came from dashboard with context, do a customer lookup using phone or email
                const queryParam = userEmail 
                    ? `email=${encodeURIComponent(userEmail)}`
                    : userPhone 
                    ? `phone=${encodeURIComponent(userPhone)}`
                    : '';

                if (!queryParam) {
                    console.log("❌ No valid query param for customer lookup");
                    setIsAuthenticated(false);
                    return;
                }

                console.log("📞 Calling customer lookup with:", queryParam);
                const response = await fetch(`/api/dog-walking/customer-lookup?${queryParam}`);
                const data = await response.json();

                console.log("📋 Customer lookup response:", { status: response.status, data });

                if (response.ok && data.found) {
                    console.log("✅ Customer authenticated:", data.customer.owner_name);
                    setCustomer(data.customer);
                    setIsAuthenticated(true);
                } else {
                    console.error("❌ Customer lookup failed:", data);
                    setIsAuthenticated(false);
                }
            } else {
                // No phone/email context provided, require authentication
                console.log("❌ No phone/email provided, requiring authentication");
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error("💥 Authentication error:", error);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Handlers ---
    const handleAuthSuccess = (authenticatedCustomer: Customer) => {
        setCustomer(authenticatedCustomer);
        setIsAuthenticated(true);
    };

    const handleServiceSelect = (service: BookingService) => {
        setSelectedService(service);
        
        // Set duration based on service
        if (service.id === "solo") {
            // Solo walks can have custom durations, default to 60
            setSelectedDuration(60);
        } else {
            setSelectedDuration(service.duration);
        }
    };

    const handleBookingSuccess = () => {
        // Redirect back to dashboard on successful booking
        window.location.href = "/dog-walking/dashboard";
    };

    const handleCancel = () => {
        // Go back to dashboard
        window.location.href = "/dog-walking/dashboard";
    };

    // Convert Customer to User format for BookingForm
    const convertCustomerToUser = (customer: Customer): User => {
        return {
            owner_id: customer.owner_id,
            owner_name: customer.owner_name,
            phone: customer.phone,
            email: customer.email,
            address: customer.address,
            dogs: customer.dogs
        };
    };

    // --- Styles ---
    const styles = {
        container: {
            minHeight: "100vh",
            backgroundColor: "#0f172a",
            paddingTop: "20px",
            paddingBottom: "40px",
        } as React.CSSProperties,
        content: {
            maxWidth: "800px",
            margin: "0 auto",
            padding: "16px",
        } as React.CSSProperties,
        header: {
            textAlign: "center" as const,
            marginBottom: "40px",
            borderBottom: "1px solid #374151",
            paddingBottom: "20px",
        } as React.CSSProperties,
        title: {
            color: "#fff",
            fontSize: "2rem",
            fontWeight: "bold",
            margin: "0 0 8px 0",
        } as React.CSSProperties,
        subtitle: {
            color: "#9ca3af",
            fontSize: "1rem",
            margin: "0",
        } as React.CSSProperties,
        card: {
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "24px",
            marginBottom: "20px",
        } as React.CSSProperties,
        serviceGrid: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
        } as React.CSSProperties,
        serviceCard: {
            backgroundColor: "#1f2937",
            border: "2px solid #374151",
            borderRadius: "8px",
            padding: "20px",
            cursor: "pointer",
            transition: "all 0.2s",
        } as React.CSSProperties,
        serviceCardSelected: {
            borderColor: "#3b82f6",
            backgroundColor: "#1e40af20",
        } as React.CSSProperties,
        serviceTitle: {
            color: "#fff",
            fontSize: "1.2rem",
            fontWeight: "600",
            marginBottom: "8px",
        } as React.CSSProperties,
        serviceDuration: {
            color: "#3b82f6",
            fontSize: "0.9rem",
            fontWeight: "500",
            marginBottom: "8px",
        } as React.CSSProperties,
        serviceDescription: {
            color: "#d1d5db",
            fontSize: "0.9rem",
            lineHeight: "1.4",
        } as React.CSSProperties,
        continueButton: {
            width: "100%",
            padding: "12px 24px",
            backgroundColor: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "1rem",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s",
        } as React.CSSProperties,
        backButton: {
            display: "inline-block",
            padding: "8px 16px",
            backgroundColor: "#6b7280",
            color: "#fff",
            textDecoration: "none",
            borderRadius: "4px",
            fontSize: "0.9rem",
            marginBottom: "20px",
        } as React.CSSProperties,
    };

    // --- Loading State ---
    if (isLoading) {
        return (
            <div style={styles.container}>
                <div style={styles.content}>
                    <div style={styles.header}>
                        <h1 style={styles.title}>Hunter's Hounds</h1>
                        <p style={styles.subtitle}>Loading...</p>
                    </div>
                </div>
            </div>
        );
    }

    // --- Authentication Required ---
    if (!isAuthenticated || !customer) {
        return (
            <div style={styles.container}>
                <div style={styles.content}>
                    <div style={styles.header}>
                        <h1 style={styles.title}>Hunter's Hounds</h1>
                        <p style={styles.subtitle}>Please sign in to book a new service</p>
                    </div>
                    <DashboardAuth onAuthSuccess={handleAuthSuccess} />
                </div>
            </div>
        );
    }

    // --- Service Selection ---
    if (!selectedService) {
        return (
            <div style={styles.container}>
                <div style={styles.content}>
                    <div style={styles.header}>
                        <h1 style={styles.title}>Book New Service</h1>
                        <p style={styles.subtitle}>Welcome back, {customer.owner_name}! Choose your service</p>
                    </div>

                    <a href="/dog-walking/dashboard" style={styles.backButton}>
                        ← Back to Dashboard
                    </a>

                    <div style={styles.card}>
                        <h3 style={{ color: "#fff", marginBottom: "20px", fontSize: "1.2rem" }}>
                            Select a Service
                        </h3>
                        
                        <div style={styles.serviceGrid}>
                            {SERVICES.map((service: BookingService) => (
                                <div
                                    key={service.id}
                                    style={styles.serviceCard}
                                    onClick={() => handleServiceSelect(service)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "#6b7280";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "#374151";
                                    }}
                                >
                                    <h4 style={styles.serviceTitle}>{service.name}</h4>
                                    <p style={styles.serviceDuration}>{service.duration} minutes</p>
                                    <p style={styles.serviceDescription}>{service.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- Booking Form ---
    if (!selectedService || !customer) {
        return (
            <div style={styles.container}>
                <div style={styles.content}>
                    <div style={styles.header}>
                        <h1 style={styles.title}>Loading...</h1>
                        <p style={styles.subtitle}>Preparing booking form</p>
                    </div>
                </div>
            </div>
        );
    }

    const now = new Date();
    const startTime = addMinutes(now, 60); // Default to 1 hour from now
    const endTime = addMinutes(startTime, selectedDuration || 60);

    return (
        <div style={styles.container}>
            <div style={styles.content}>
                <div style={styles.header}>
                    <h1 style={styles.title}>Book New Service</h1>
                    <p style={styles.subtitle}>{selectedService.name} for {customer.owner_name}</p>
                </div>

                <a href="/dog-walking/dashboard" style={styles.backButton}>
                    ← Back to Dashboard
                </a>

                <BookingForm
                    serviceName={selectedService.name}  // Use display name - API expects this format
                    startTime={startTime}
                    endTime={endTime}
                    selectedDuration={selectedDuration}
                    currentUser={convertCustomerToUser(customer)}  // Pass authenticated user
                    onBookingSuccess={handleBookingSuccess}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    );
}