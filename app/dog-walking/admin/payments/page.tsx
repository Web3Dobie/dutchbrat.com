"use client";

import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";

interface BookingForPayment {
    id: number;
    owner_id: number;
    service_type: string;
    start_time: string;
    end_time: string | null;
    duration_minutes: number | null;
    price_pounds: number | null;
    status: 'completed' | 'completed & paid' | 'confirmed' | 'cancelled';
    walk_summary: string | null;
    owner_name: string;
    phone: string;
    email: string;
    dog_names: string[];
    created_at: string;
}

interface CustomerSummary {
    owner_id: number;
    owner_name: string;
    email: string;
    bookingCount: number;
    totalOwed: number;
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
    
    // Walk summary states
    const [showCompletedModal, setShowCompletedModal] = useState(false);
    const [pendingBookingIds, setPendingBookingIds] = useState<number[]>([]);
    const [walkSummary, setWalkSummary] = useState('');
    const [editingSummaryId, setEditingSummaryId] = useState<number | null>(null);
    const [editSummaryText, setEditSummaryText] = useState('');

    // Email sending states
    const [sendingInvoice, setSendingInvoice] = useState<number | null>(null);
    const [sendingReminder, setSendingReminder] = useState<number | null>(null);

    useEffect(() => {
        fetchPaymentData();
    }, [viewMode]);

    const fetchPaymentData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/dog-walking/admin/payment-status?view=${viewMode}`, {
                credentials: 'include'
            });

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

    const handleMarkAsCompleted = async (bookingIds: number[], summary?: string) => {
        setIsUpdating(true);
        setError(null);
        setSuccess(null);

        try {
            const requestBody: any = { booking_ids: bookingIds };
            if (summary && summary.trim()) {
                requestBody.walk_summary = summary.trim();
            }

            const response = await fetch("/api/dog-walking/admin/mark-completed", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to mark as completed");
            }

            const result = await response.json();
            setSuccess(result.message);
            setSelectedBookings(new Set());
            setShowCompletedModal(false);
            setWalkSummary('');
            setPendingBookingIds([]);
            fetchPaymentData(); // Refresh data
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUpdateSummary = async (bookingId: number, summary: string) => {
        setIsUpdating(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch("/api/dog-walking/admin/update-summary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    booking_id: bookingId, 
                    walk_summary: summary.trim() 
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to update summary");
            }

            const result = await response.json();
            setSuccess(result.message);
            setEditingSummaryId(null);
            setEditSummaryText('');
            fetchPaymentData(); // Refresh data
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    const openCompletedModal = () => {
        const selectedIds = Array.from(selectedBookings);
        setPendingBookingIds(selectedIds);
        setShowCompletedModal(true);
    };

    const startEditingSummary = (booking: BookingForPayment) => {
        setEditingSummaryId(booking.id);
        setEditSummaryText(booking.walk_summary || '');
    };

    const cancelEditingSummary = () => {
        setEditingSummaryId(null);
        setEditSummaryText('');
    };

    // Get customers with outstanding balances
    const getCustomerSummaries = (): CustomerSummary[] => {
        const customerMap = new Map<number, CustomerSummary>();

        bookings
            .filter(b => b.status === 'completed' && b.price_pounds && b.price_pounds > 0)
            .forEach(booking => {
                const existing = customerMap.get(booking.owner_id);
                if (existing) {
                    existing.bookingCount += 1;
                    existing.totalOwed += booking.price_pounds || 0;
                } else {
                    customerMap.set(booking.owner_id, {
                        owner_id: booking.owner_id,
                        owner_name: booking.owner_name,
                        email: booking.email,
                        bookingCount: 1,
                        totalOwed: booking.price_pounds || 0
                    });
                }
            });

        return Array.from(customerMap.values()).sort((a, b) => b.totalOwed - a.totalOwed);
    };

    const handleSendInvoice = async (ownerId: number) => {
        setSendingInvoice(ownerId);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch("/api/dog-walking/admin/send-invoice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ owner_id: ownerId }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to send invoice");
            }

            setSuccess(`Invoice sent! ${result.details.bookingCount} bookings, £${result.details.totalAmount.toFixed(2)}`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSendingInvoice(null);
        }
    };

    const handleSendReminder = async (ownerId: number) => {
        setSendingReminder(ownerId);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch("/api/dog-walking/admin/send-reminder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ owner_id: ownerId }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to send reminder");
            }

            setSuccess(`Reminder sent! ${result.details.bookingCount} bookings, £${result.details.totalAmount.toFixed(2)}`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSendingReminder(null);
        }
    };

    const handleSelectAll = () => {
        const selectableBookings = bookings.filter(b =>
            viewMode === 'awaiting_payment' ? b.status === 'completed' :
                viewMode === 'all' ? ['confirmed', 'completed'].includes(b.status) :
                    false
        );

        if (selectedBookings.size === selectableBookings.length) {
            setSelectedBookings(new Set());
        } else {
            setSelectedBookings(new Set(selectableBookings.map(b => b.id)));
        }
    };

    const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed & paid': return '#059669';
            case 'completed': return '#dc2626';
            case 'confirmed': return '#3b82f6';
            case 'cancelled': return '#6b7280';
            default: return '#6b7280';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed & paid': return 'Paid ✅';
            case 'completed': return 'Awaiting Payment';
            case 'confirmed': return 'Confirmed';
            case 'cancelled': return 'Cancelled';
            default: return status;
        }
    };

    const formatSummaryDisplay = (summary: string) => {
        return summary.split('\n').map((paragraph, index) => (
            <React.Fragment key={index}>
                {paragraph}
                {index < summary.split('\n').length - 1 && <br />}
            </React.Fragment>
        ));
    };

    // Styles
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
            marginBottom: "32px",
            textAlign: "center",
        } as React.CSSProperties,
        title: {
            fontSize: "2rem",
            fontWeight: "bold",
            marginBottom: "8px",
        } as React.CSSProperties,
        tabs: {
            display: "flex",
            gap: "4px",
            marginBottom: "24px",
            backgroundColor: "#1f2937",
            padding: "4px",
            borderRadius: "8px",
        } as React.CSSProperties,
        tab: {
            flex: 1,
            padding: "8px 16px",
            textAlign: "center",
            cursor: "pointer",
            borderRadius: "4px",
            transition: "all 0.2s",
        } as React.CSSProperties,
        activeTab: {
            backgroundColor: "#3b82f6",
            color: "#fff",
        } as React.CSSProperties,
        inactiveTab: {
            backgroundColor: "transparent",
            color: "#9ca3af",
        } as React.CSSProperties,
        statsGrid: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
        } as React.CSSProperties,
        statCard: {
            backgroundColor: "#1f2937",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #374151",
        } as React.CSSProperties,
        statValue: {
            fontSize: "1.5rem",
            fontWeight: "bold",
            color: "#10b981",
        } as React.CSSProperties,
        statLabel: {
            color: "#9ca3af",
            fontSize: "0.9rem",
        } as React.CSSProperties,
        actions: {
            display: "flex",
            gap: "12px",
            marginBottom: "16px",
            alignItems: "center",
        } as React.CSSProperties,
        button: {
            padding: "8px 16px",
            borderRadius: "4px",
            border: "none",
            cursor: "pointer",
            fontWeight: "600",
            transition: "all 0.2s",
        } as React.CSSProperties,
        primaryButton: {
            backgroundColor: "#10b981",
            color: "#fff",
        } as React.CSSProperties,
        secondaryButton: {
            backgroundColor: "#3b82f6",
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
            verticalAlign: "top",
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
        summaryContainer: {
            marginTop: "8px",
            padding: "8px",
            backgroundColor: "#374151",
            borderRadius: "4px",
            fontSize: "0.9rem",
            lineHeight: "1.4",
        } as React.CSSProperties,
        summaryTextarea: {
            width: "100%",
            minHeight: "100px",
            padding: "8px",
            backgroundColor: "#111827",
            color: "#fff",
            border: "1px solid #4b5563",
            borderRadius: "4px",
            resize: "vertical",
            fontFamily: "inherit",
        } as React.CSSProperties,
        modal: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
        } as React.CSSProperties,
        modalContent: {
            backgroundColor: "#1f2937",
            padding: "24px",
            borderRadius: "8px",
            maxWidth: "600px",
            width: "90%",
            maxHeight: "80vh",
            overflow: "auto",
        } as React.CSSProperties,
        modalTitle: {
            fontSize: "1.25rem",
            fontWeight: "bold",
            marginBottom: "16px",
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
        customerSummaryCard: {
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "24px",
        } as React.CSSProperties,
        customerRow: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px",
            borderBottom: "1px solid #374151",
            flexWrap: "wrap",
            gap: "12px",
        } as React.CSSProperties,
        customerInfo: {
            display: "flex",
            flexDirection: "column",
            gap: "4px",
        } as React.CSSProperties,
        emailButton: {
            padding: "6px 12px",
            borderRadius: "4px",
            border: "none",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "0.85rem",
            transition: "all 0.2s",
        } as React.CSSProperties,
        invoiceButton: {
            backgroundColor: "#3b82f6",
            color: "#fff",
        } as React.CSSProperties,
        reminderButton: {
            backgroundColor: "#f59e0b",
            color: "#fff",
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
                <p style={{ color: "#9ca3af" }}>Track and manage booking payments with walk summaries</p>
            </div>

            {/* Error/Success Messages */}
            {error && <div style={styles.error}>{error}</div>}
            {success && <div style={styles.success}>{success}</div>}

            {/* Payment Stats */}
            {paymentStats && (
                <div style={styles.statsGrid}>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>{formatCurrency(paymentStats.total_awaiting_payment)}</div>
                        <div style={styles.statLabel}>Total Awaiting Payment</div>
                        <div style={{ ...styles.statLabel, marginTop: "4px" }}>
                            ({paymentStats.bookings_awaiting_payment} bookings)
                        </div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>{formatCurrency(paymentStats.total_paid_this_month)}</div>
                        <div style={styles.statLabel}>Paid This Month</div>
                        <div style={{ ...styles.statLabel, marginTop: "4px" }}>
                            ({paymentStats.paid_bookings_this_month} bookings)
                        </div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>{formatCurrency(paymentStats.total_paid_this_year)}</div>
                        <div style={styles.statLabel}>Paid This Year</div>
                        <div style={{ ...styles.statLabel, marginTop: "4px" }}>
                            ({paymentStats.paid_bookings_this_year} bookings)
                        </div>
                    </div>
                </div>
            )}

            {/* View Mode Tabs */}
            <div style={styles.tabs}>
                {[
                    { key: 'awaiting_payment', label: 'Awaiting Payment' },
                    { key: 'paid', label: 'Paid' },
                    { key: 'all', label: 'All Bookings' },
                ].map(tab => (
                    <div
                        key={tab.key}
                        style={{
                            ...styles.tab,
                            ...(viewMode === tab.key ? styles.activeTab : styles.inactiveTab),
                        }}
                        onClick={() => setViewMode(tab.key as any)}
                    >
                        {tab.label}
                    </div>
                ))}
            </div>

            {/* Customer Summary - Send Invoice/Reminder */}
            {viewMode === 'awaiting_payment' && getCustomerSummaries().length > 0 && (
                <div style={styles.customerSummaryCard}>
                    <h3 style={{ margin: "0 0 16px 0", color: "#d1d5db" }}>
                        Customers with Outstanding Balance
                    </h3>
                    {getCustomerSummaries().map((customer, index) => (
                        <div
                            key={customer.owner_id}
                            style={{
                                ...styles.customerRow,
                                borderBottom: index === getCustomerSummaries().length - 1 ? 'none' : '1px solid #374151'
                            }}
                        >
                            <div style={styles.customerInfo}>
                                <div style={{ fontWeight: "bold", color: "#fff" }}>
                                    {customer.owner_name}
                                </div>
                                <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
                                    {customer.bookingCount} booking(s) • {customer.email}
                                </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{ fontWeight: "bold", color: "#ef4444", fontSize: "1.1rem" }}>
                                    £{customer.totalOwed.toFixed(2)}
                                </div>
                                <button
                                    onClick={() => handleSendInvoice(customer.owner_id)}
                                    disabled={sendingInvoice === customer.owner_id}
                                    style={{
                                        ...styles.emailButton,
                                        ...styles.invoiceButton,
                                        opacity: sendingInvoice === customer.owner_id ? 0.6 : 1,
                                        cursor: sendingInvoice === customer.owner_id ? 'wait' : 'pointer',
                                    }}
                                >
                                    {sendingInvoice === customer.owner_id ? 'Sending...' : 'Send Invoice'}
                                </button>
                                <button
                                    onClick={() => handleSendReminder(customer.owner_id)}
                                    disabled={sendingReminder === customer.owner_id}
                                    style={{
                                        ...styles.emailButton,
                                        ...styles.reminderButton,
                                        opacity: sendingReminder === customer.owner_id ? 0.6 : 1,
                                        cursor: sendingReminder === customer.owner_id ? 'wait' : 'pointer',
                                    }}
                                >
                                    {sendingReminder === customer.owner_id ? 'Sending...' : 'Send Reminder'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div style={styles.actions}>
                <span style={{ color: "#9ca3af" }}>
                    {selectedBookings.size} booking(s) selected
                </span>

                {viewMode === 'awaiting_payment' && selectedBookings.size > 0 && (
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

                {(viewMode === 'all' || viewMode === 'awaiting_payment') && 
                 selectedBookings.size > 0 && 
                 bookings.some(b => selectedBookings.has(b.id) && b.status === 'confirmed') && (
                    <button
                        onClick={openCompletedModal}
                        disabled={isUpdating}
                        style={{
                            ...styles.button,
                            ...(isUpdating ? styles.disabledButton : styles.secondaryButton)
                        }}
                    >
                        Mark as Completed ({selectedBookings.size})
                    </button>
                )}
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
                                    checked={selectedBookings.size > 0 && 
                                             selectedBookings.size === bookings.filter(b =>
                                                viewMode === 'awaiting_payment' ? b.status === 'completed' :
                                                viewMode === 'all' ? ['confirmed', 'completed'].includes(b.status) :
                                                false
                                             ).length}
                                />
                            </th>
                            <th style={styles.th}>Date & Time</th>
                            <th style={styles.th}>Customer</th>
                            <th style={styles.th}>Service</th>
                            <th style={styles.th}>Dogs</th>
                            <th style={styles.th}>Price</th>
                            <th style={styles.th}>Status</th>
                            <th style={styles.th}>Walk Summary</th>
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
                                        disabled={
                                            (viewMode === 'awaiting_payment' && booking.status !== 'completed') ||
                                            (viewMode === 'paid')
                                        }
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
                                    {booking.price_pounds ? (
                                        <span style={{ fontWeight: "bold" }}>
                                            {formatCurrency(booking.price_pounds)}
                                        </span>
                                    ) : (
                                        <span style={{ color: "#10b981" }}>FREE</span>
                                    )}
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
                                <td style={styles.td}>
                                    {/* Walk Summary Column */}
                                    {(['completed', 'completed & paid'].includes(booking.status)) && (
                                        <div>
                                            {editingSummaryId === booking.id ? (
                                                <div>
                                                    <textarea
                                                        style={styles.summaryTextarea}
                                                        value={editSummaryText}
                                                        onChange={(e) => setEditSummaryText(e.target.value)}
                                                        placeholder="Enter walk summary..."
                                                    />
                                                    <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
                                                        <button
                                                            onClick={() => handleUpdateSummary(booking.id, editSummaryText)}
                                                            disabled={isUpdating}
                                                            style={{
                                                                ...styles.button,
                                                                fontSize: "0.8rem",
                                                                padding: "4px 8px",
                                                                ...(isUpdating ? styles.disabledButton : styles.primaryButton)
                                                            }}
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={cancelEditingSummary}
                                                            style={{
                                                                ...styles.button,
                                                                fontSize: "0.8rem",
                                                                padding: "4px 8px",
                                                                backgroundColor: "#6b7280",
                                                                color: "#fff"
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    {booking.walk_summary ? (
                                                        <div style={styles.summaryContainer}>
                                                            {formatSummaryDisplay(booking.walk_summary)}
                                                        </div>
                                                    ) : (
                                                        <div style={{ color: "#9ca3af", fontStyle: "italic" }}>
                                                            No summary added
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => startEditingSummary(booking)}
                                                        style={{
                                                            ...styles.button,
                                                            fontSize: "0.8rem",
                                                            padding: "4px 8px",
                                                            marginTop: "8px",
                                                            backgroundColor: "#4b5563",
                                                            color: "#fff"
                                                        }}
                                                    >
                                                        {booking.walk_summary ? 'Edit Summary' : 'Add Summary'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
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

            {/* Mark as Completed Modal */}
            {showCompletedModal && (
                <div style={styles.modal}>
                    <div style={styles.modalContent}>
                        <h2 style={styles.modalTitle}>
                            Mark {pendingBookingIds.length} Booking(s) as Completed
                        </h2>
                        
                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ 
                                display: "block", 
                                marginBottom: "8px",
                                fontWeight: "bold"
                            }}>
                                Walk Summary (Optional):
                            </label>
                            <textarea
                                style={styles.summaryTextarea}
                                value={walkSummary}
                                onChange={(e) => setWalkSummary(e.target.value)}
                                placeholder="Enter details about the walk/service...

Examples:
• Great walk in Clissold Park
• Practiced sit and stay commands
• Met several other dogs and socialized well
• No behavioral issues"
                            />
                            <div style={{ 
                                fontSize: "0.8rem", 
                                color: "#9ca3af", 
                                marginTop: "4px" 
                            }}>
                                This summary will be visible to customers on their dashboard
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                            <button
                                onClick={() => {
                                    setShowCompletedModal(false);
                                    setWalkSummary('');
                                    setPendingBookingIds([]);
                                }}
                                style={{
                                    ...styles.button,
                                    backgroundColor: "#6b7280",
                                    color: "#fff"
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleMarkAsCompleted(pendingBookingIds, walkSummary)}
                                disabled={isUpdating}
                                style={{
                                    ...styles.button,
                                    ...(isUpdating ? styles.disabledButton : styles.secondaryButton)
                                }}
                            >
                                {isUpdating ? 'Updating...' : `Mark as Completed${walkSummary.trim() ? ' with Summary' : ''}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}