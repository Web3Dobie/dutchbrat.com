"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface DatabaseStats {
    total_customers: number;
    total_dogs: number;
    active_bookings: number;
    cancelled_bookings: number;
}

interface RecentCustomer {
    id: number;
    owner_name: string;
    phone: string;
    email: string;
    created_at: string;
}

interface DatabaseOverview {
    stats: DatabaseStats;
    recentCustomers: RecentCustomer[];
    timestamp: string;
}

export default function AdminDashboard() {
    const [overview, setOverview] = useState<DatabaseOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchOverview();
    }, []);

    const fetchOverview = async () => {
        try {
            const response = await fetch("/api/admin/check-database");
            if (!response.ok) {
                throw new Error("Failed to fetch database overview");
            }
            const data = await response.json();
            setOverview(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const styles = {
        container: {
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "24px",
        } as React.CSSProperties,
        header: {
            textAlign: "center",
            marginBottom: "40px",
        } as React.CSSProperties,
        title: {
            fontSize: "2.5rem",
            fontWeight: "bold",
            marginBottom: "8px",
            color: "#3b82f6",
        } as React.CSSProperties,
        subtitle: {
            color: "#9ca3af",
            fontSize: "1.1rem",
        } as React.CSSProperties,
        grid: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "24px",
            marginBottom: "40px",
        } as React.CSSProperties,
        card: {
            backgroundColor: "#1f2937",
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "24px",
        } as React.CSSProperties,
        cardTitle: {
            fontSize: "1.2rem",
            fontWeight: "bold",
            color: "#d1d5db",
            marginBottom: "16px",
        } as React.CSSProperties,
        statsGrid: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
        } as React.CSSProperties,
        statItem: {
            textAlign: "center",
        } as React.CSSProperties,
        statNumber: {
            fontSize: "2rem",
            fontWeight: "bold",
            color: "#3b82f6",
        } as React.CSSProperties,
        statLabel: {
            color: "#9ca3af",
            fontSize: "0.9rem",
        } as React.CSSProperties,
        recentItem: {
            padding: "12px",
            backgroundColor: "#374151",
            borderRadius: "4px",
            marginBottom: "8px",
        } as React.CSSProperties,
        recentName: {
            fontWeight: "bold",
            color: "#d1d5db",
        } as React.CSSProperties,
        recentDetails: {
            fontSize: "0.9rem",
            color: "#9ca3af",
        } as React.CSSProperties,
        actionsCard: {
            backgroundColor: "#1f2937",
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "24px",
            textAlign: "center",
        } as React.CSSProperties,
        actionButton: {
            display: "inline-block",
            backgroundColor: "#3b82f6",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: "6px",
            textDecoration: "none",
            fontWeight: "bold",
            margin: "8px",
            transition: "background-color 0.2s",
        } as React.CSSProperties,
        paymentButton: {
            backgroundColor: "#059669", // Green for payment
        } as React.CSSProperties,
        clientButton: {
            backgroundColor: "#7c3aed", // Purple for client management
        } as React.CSSProperties,
        bookingButton: {
            backgroundColor: "#f59e0b", // Orange for booking management
        } as React.CSSProperties,
        loading: {
            textAlign: "center",
            padding: "40px",
            color: "#9ca3af",
        } as React.CSSProperties,
        error: {
            color: "#ef4444",
            backgroundColor: "#1f2937",
            border: "1px solid #ef4444",
            borderRadius: "4px",
            padding: "16px",
            textAlign: "center",
        } as React.CSSProperties,
        timestamp: {
            textAlign: "center",
            color: "#6b7280",
            fontSize: "0.8rem",
            marginTop: "24px",
        } as React.CSSProperties,
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>Loading dashboard...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.error}>
                    Error loading dashboard: {error}
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>Admin Dashboard</h1>
                <p style={styles.subtitle}>Hunter's Hounds Management System</p>
            </div>

            <div style={styles.grid}>
                {/* Stats Card */}
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>Database Overview</h2>
                    <div style={styles.statsGrid}>
                        <div style={styles.statItem}>
                            <div style={styles.statNumber}>{overview?.stats.total_customers}</div>
                            <div style={styles.statLabel}>Total Customers</div>
                        </div>
                        <div style={styles.statItem}>
                            <div style={styles.statNumber}>{overview?.stats.total_dogs}</div>
                            <div style={styles.statLabel}>Total Dogs</div>
                        </div>
                        <div style={styles.statItem}>
                            <div style={styles.statNumber}>{overview?.stats.active_bookings}</div>
                            <div style={styles.statLabel}>Active Bookings</div>
                        </div>
                        <div style={styles.statItem}>
                            <div style={styles.statNumber}>{overview?.stats.cancelled_bookings}</div>
                            <div style={styles.statLabel}>Cancelled Bookings</div>
                        </div>
                    </div>
                </div>

                {/* Recent Customers Card */}
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>Recent Customers</h2>
                    {overview?.recentCustomers.map((customer) => (
                        <div key={customer.id} style={styles.recentItem}>
                            <div style={styles.recentName}>{customer.owner_name}</div>
                            <div style={styles.recentDetails}>
                                {customer.phone} • {customer.email}
                            </div>
                            <div style={styles.recentDetails}>
                                Registered: {new Date(customer.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Actions - UPDATED with Booking Management */}
            <div style={styles.actionsCard}>
                <h2 style={styles.cardTitle}>Quick Actions</h2>
                <Link href="/dog-walking/admin/register-client" style={styles.actionButton}>
                    Register New Client
                </Link>
                <Link href="/dog-walking/admin/create-booking" style={styles.actionButton}>
                    Create Booking
                </Link>
                <Link href="/dog-walking/admin/payments" style={{ ...styles.actionButton, ...styles.paymentButton }}>
                    💰 Payment Management
                </Link>
                <Link href="/dog-walking/admin/manage-clients" style={{ ...styles.actionButton, ...styles.clientButton }}>
                    📋 Client Management
                </Link>
                <Link href="/dog-walking/admin/manage-bookings" style={{ ...styles.actionButton, ...styles.bookingButton }}>
                    🗓️ Manage Bookings
                </Link>
                <Link href="/dog-walking/admin/newsletter" style={{ ...styles.actionButton, ...styles.bookingButton }}>
                    📧 Newsletter Management
                </Link>
            </div>

            {overview?.timestamp && (
                <div style={styles.timestamp}>
                    Last updated: {new Date(overview.timestamp).toLocaleString()}
                </div>
            )}
        </div>
    );
}