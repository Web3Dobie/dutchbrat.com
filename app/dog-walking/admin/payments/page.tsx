"use client";

import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";

interface BookingForPayment {
    id: number;
    service_type: string;
    start_time: string;
    end_time: string | null;
    duration_minutes: number | null;
    price_pounds: number | null;
    status: 'completed' | 'completed & paid' | 'confirmed' | 'cancelled';
    owner_name: string;
    phone: string;
    email: string;
    dog_names: string[];
    created_at: string;
}

interface PaymentStats {
    total_awaiting_payment: number;
    bookings_awaiting_payment: number;
    total_paid_this_month: number;
    paid_bookings_this_month: number;
    total_paid_this_year: number;
    paid_bookings_this_year: number;
}

export default function AdminPaymentManagement() {
    const [bookings, setBookings] = useState<BookingForPayment[]>([]);
    const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
    const [selectedBookings, setSelectedBookings] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'awaiting_payment' | 'paid' | 'all'>('awaiting_payment');

    useEffect(() => {
        fetchPaymentData();
    }, [viewMode]);

    const fetchPaymentData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/dog-walking/admin/payment-status?view=${viewMode}`);

            if (!response.ok) {
                throw new Error("Failed to fetch payment data");
            }

            const data = await response.json();
            setBookings(data.bookings);
            setPaymentStats(data.stats);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBookingSelect = (bookingId: number) => {
        setSelectedBookings(prev => {
            const newSet = new Set(prev);
            if (newSet.has(bookingId)) {
                newSet.delete(bookingId);
            } else {
                newSet.add(bookingId);
            }
            return newSet;
        });
    };

    const handleMarkAsPaid = async (bookingIds: number[]) => {
        setIsUpdating(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch("/api/dog-walking/admin/mark-paid", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ booking_ids: bookingIds }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to mark as paid");
            }

            const result = await response.json();
            setSuccess(`${result.updated_count} booking(s) marked as paid!`);
            setSelectedBookings(new Set());
            fetchPaymentData(); // Refresh data
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleMarkAsCompleted = async (bookingIds: number[]) => {
        setIsUpdating(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch("/api/dog-walking/admin/mark-completed", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ booking_ids: bookingIds }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to mark as completed");
            }

            const result = await response.json();
            setSuccess(`${result.updated_count} booking(s) marked as completed (awaiting payment)`);
            setSelectedBookings(new Set());
            fetchPaymentData(); // Refresh data
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSelectAll = () => {
        const selectableBookings = bookings.filter(b =>
            viewMode === 'awaiting_payment' ? b.status === 'completed' :
                viewMode === 'all' ? b.status !== 'cancelled' : true
        );

        if (selectedBookings.size === selectableBookings.length) {
            setSelectedBookings(new Set());
        } else {
            setSelectedBookings(new Set(selectableBookings.map(b => b.id)));
        }
    };

    const formatCurrency = (amount: number | null) => {
        if (amount === null || amount === 0) return 'FREE';
        return `£${amount.toFixed(2)}`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed & paid': return '#059669';
            case 'completed': return '#f59e0b';
            case 'confirmed': return '#3b82f6';
            case 'cancelled': return '#dc2626';
            default: return '#6b7280';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed & paid': return 'Paid ✅';
            case 'completed': return 'Awaiting Payment 💰';
            case 'confirmed': return 'Upcoming 📅';
            case 'cancelled': return 'Cancelled ❌';
            default: return status;
        }
    };

    // Filter bookings that can be marked as paid (only 'completed' status)
    const canMarkPaid = selectedBookings.size > 0 &&
        Array.from(selectedBookings).every(id =>
            bookings.find(b => b.id === id)?.status === 'completed'
        );

    // Filter bookings that can be marked as completed (only 'confirmed' status)
    const canMarkCompleted = selectedBookings.size > 0 &&
        Array.from(selectedBookings).every(id =>
            bookings.find(b => b.id === id)?.status === 'confirmed'
        );

    const styles = {
        container: {
            maxWidth: "1200px",
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
        statsGrid: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "32px",
        } as React.CSSProperties,
        statCard: {
            backgroundColor: "#1f2937",
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "20px",
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
            marginTop: "4px",
        } as React.CSSProperties,
        controls: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            flexWrap: "wrap",
            gap: "16px",
        } as React.CSSProperties,
        viewTabs: {
            display: "flex",
            gap: "8px",
        } as React.CSSProperties,
        tab: {
            padding: "8px 16px",
            borderRadius: "4px",
            border: "1px solid #444",
            backgroundColor: "#374151",
            color: "#d1d5db",
            cursor: "pointer",
            fontSize: "0.9rem",
        } as React.CSSProperties,
        activeTab: {
            backgroundColor: "#3b82f6",
            borderColor: "#3b82f6",
            color: "#fff",
        } as React.CSSProperties,
        actions: {
            display: "flex",
            gap: "8px",
        } as React.CSSProperties,
        button: {
            padding: "8px 16px",
            borderRadius: "4px",
            border: "none",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "0.9rem",
        } as React.CSSProperties,
        primaryButton: {
            backgroundColor: "#059669",
            color: "#fff",
        } as React.CSSProperties,
        secondaryButton: {
            backgroundColor: "#f59e0b",
            color: "#fff",
        } as React.CSSProperties,
        disabledButton: {
            backgroundColor: "#6b7280",
            color: "#9ca3af",
            cursor: "not-allowed",
        } as React.CSSProperties,
        table: {
            width: "100%",
            borderCollapse: "collapse",
            backgroundColor: "#1f2937",
            borderRadius: "8px",
            overflow: "hidden",
        } as React.CSSProperties,
        th: {
            backgroundColor: "#374151",
            padding: "12px",
            textAlign: "left",
            fontWeight: "bold",
            borderBottom: "1px solid #4b5563",
        } as React.CSSProperties,
        td: {
            padding: "12px",
            borderBottom: "1px solid #374151",
        } as React.CSSProperties,
        checkbox: {
            marginRight: "8px",
        } as React.CSSProperties,
        status: {
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "0.8rem",
            fontWeight: "bold",
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
            padding: "12px",
            marginBottom: "16px",
        } as React.CSSProperties,
    };

    if (isLoading) {
        return (
            <div style={styles.container}>
                <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
                    Loading payment data...
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>Payment Management</h1>
                <p style={{ color: "#9ca3af" }}>Track and manage booking payments</p>
            </div>

            {/* Payment Stats */}
            {paymentStats && (
                <div style={styles.statsGrid}>
                    <div style={styles.statCard}>
                        <div style={{ ...styles.statNumber, color: "#f59e0b" }}>{formatCurrency(paymentStats.total_awaiting_payment)}</div>
                        <div style={styles.statLabel}>Awaiting Payment</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statNumber}>{paymentStats.bookings_awaiting_payment}</div>
                        <div style={styles.statLabel}>Bookings Unpaid</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={{ ...styles.statNumber, color: "#059669" }}>{formatCurrency(paymentStats.total_paid_this_month)}</div>
                        <div style={styles.statLabel}>Paid This Month</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statNumber}>{paymentStats.paid_bookings_this_month}</div>
                        <div style={styles.statLabel}>Bookings This Month</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={{ ...styles.statNumber, color: "#10b981" }}>{formatCurrency(paymentStats.total_paid_this_year)}</div>
                        <div style={styles.statLabel}>Paid This Year</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statNumber}>{paymentStats.paid_bookings_this_year}</div>
                        <div style={styles.statLabel}>Bookings This Year</div>
                    </div>
                </div>
            )}

            {error && <div style={styles.error}>{error}</div>}
            {success && <div style={styles.success}>{success}</div>}

            {/* Controls */}
            <div style={styles.controls}>
                <div style={styles.viewTabs}>
                    <button
                        onClick={() => setViewMode('awaiting_payment')}
                        style={{
                            ...styles.tab,
                            ...(viewMode === 'awaiting_payment' ? styles.activeTab : {})
                        }}
                    >
                        Awaiting Payment ({paymentStats?.bookings_awaiting_payment || 0})
                    </button>
                    <button
                        onClick={() => setViewMode('paid')}
                        style={{
                            ...styles.tab,
                            ...(viewMode === 'paid' ? styles.activeTab : {})
                        }}
                    >
                        Paid
                    </button>
                    <button
                        onClick={() => setViewMode('all')}
                        style={{
                            ...styles.tab,
                            ...(viewMode === 'all' ? styles.activeTab : {})
                        }}
                    >
                        All Bookings
                    </button>
                </div>

                <div style={styles.actions}>
                    <button
                        onClick={handleSelectAll}
                        style={{ ...styles.button, backgroundColor: "#6b7280", color: "#fff" }}
                    >
                        {selectedBookings.size === bookings.filter(b =>
                            viewMode === 'awaiting_payment' ? b.status === 'completed' : true
                        ).length ? 'Deselect All' : 'Select All'}
                    </button>

                    {canMarkCompleted && (
                        <button
                            onClick={() => handleMarkAsCompleted(Array.from(selectedBookings))}
                            disabled={isUpdating}
                            style={{
                                ...styles.button,
                                ...(isUpdating ? styles.disabledButton : styles.secondaryButton)
                            }}
                        >
                            Mark as Completed
                        </button>
                    )}

                    {canMarkPaid && (
                        <button
                            onClick={() => handleMarkAsPaid(Array.from(selectedBookings))}
                            disabled={isUpdating}
                            style={{
                                ...styles.button,
                                ...(isUpdating ? styles.disabledButton : styles.primaryButton)
                            }}
                        >
                            Mark as Paid ({selectedBookings.size})
                        </button>
                    )}
                </div>
            </div>

            {/* Bookings Table */}
            {bookings.length > 0 ? (
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>
                                <input
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={selectedBookings.size > 0 && selectedBookings.size === bookings.length}
                                />
                            </th>
                            <th style={styles.th}>Date & Time</th>
                            <th style={styles.th}>Customer</th>
                            <th style={styles.th}>Service</th>
                            <th style={styles.th}>Dogs</th>
                            <th style={styles.th}>Price</th>
                            <th style={styles.th}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bookings.map((booking) => (
                            <tr key={booking.id}>
                                <td style={styles.td}>
                                    <input
                                        type="checkbox"
                                        checked={selectedBookings.has(booking.id)}
                                        onChange={() => handleBookingSelect(booking.id)}
                                        style={styles.checkbox}
                                    />
                                </td>
                                <td style={styles.td}>
                                    <div>{format(parseISO(booking.start_time), "MMM d, yyyy")}</div>
                                    <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                                        {format(parseISO(booking.start_time), "h:mm a")}
                                        {booking.duration_minutes && ` (${booking.duration_minutes}m)`}
                                    </div>
                                </td>
                                <td style={styles.td}>
                                    <div style={{ fontWeight: "bold" }}>{booking.owner_name}</div>
                                    <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>{booking.phone}</div>
                                </td>
                                <td style={styles.td}>{booking.service_type}</td>
                                <td style={styles.td}>{booking.dog_names.join(", ")}</td>
                                <td style={styles.td}>
                                    <span style={{ fontWeight: "bold" }}>{formatCurrency(booking.price_pounds)}</span>
                                </td>
                                <td style={styles.td}>
                                    <span
                                        style={{
                                            ...styles.status,
                                            backgroundColor: getStatusColor(booking.status),
                                            color: "#fff",
                                        }}
                                    >
                                        {getStatusText(booking.status)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
                    {viewMode === 'awaiting_payment' ? 'No bookings awaiting payment' :
                        viewMode === 'paid' ? 'No paid bookings' : 'No bookings found'}
                </div>
            )}
        </div>
    );
}