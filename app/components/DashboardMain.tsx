"use client";

import React, { useState, useEffect } from "react";
import { format, isPast, isToday, isTomorrow, addHours, isBefore, getISOWeek, endOfWeek, addDays, addWeeks, startOfMonth, addMonths, isSameDay } from "date-fns";
import { formatPrice } from '@/lib/pricing';
import { getServiceDisplayName } from '@/lib/serviceTypes';

// --- Types ---
interface Dog {
    id: number;
    dog_name: string;
    dog_breed: string;
    dog_age: number;
}

interface Customer {
    owner_id: number;
    owner_name: string;
    phone: string;
    email: string;
    address: string;
    dogs: Dog[];
    // NEW: Partner fields
    partner_name?: string | null;
    partner_email?: string | null;
    partner_phone?: string | null;
    // Payment preference for period-aware status display
    payment_preference?: string | null;
}

interface Booking {
    id: number;
    service_type: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    status: 'confirmed' | 'cancelled' | 'completed' | 'completed & paid' | 'paid' | 'active' | 'no_show';
    price_pounds: number;
    dog_names: string[];
    created_at: string;
    walk_summary?: string | null;
    // Series fields for recurring bookings
    series_id?: number | null;
    series_index?: number | null;
    recurrence_pattern?: string | null;
    series_status?: string | null;
    is_recurring?: boolean;
}

interface DashboardMainProps {
    customer: Customer;
    onLogout: () => void;
    onBookingSelect: (bookingId: number) => void;
    onAccountView: () => void;
    onAddressesView: () => void;
    onMediaView: () => void;
}

export default function DashboardMain({ customer, onLogout, onBookingSelect, onAccountView, onAddressesView, onMediaView }: DashboardMainProps) {
    // --- State ---
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'bookings' | 'account'>('bookings');

    // --- Styles ---
    const styles = {
        container: {
            maxWidth: "800px",
            margin: "0 auto",
            padding: "16px",
        } as React.CSSProperties,
        tabContainer: {
            display: "flex",
            borderBottom: "2px solid #374151",
            marginBottom: "24px",
        } as React.CSSProperties,
        tab: {
            padding: "12px 24px",
            fontSize: "1rem",
            fontWeight: "600",
            border: "none",
            background: "none",
            cursor: "pointer",
            color: "#9ca3af",
            borderBottom: "2px solid transparent",
            transition: "all 0.2s",
        } as React.CSSProperties,
        activeTab: {
            color: "#3b82f6",
            borderBottomColor: "#3b82f6",
        } as React.CSSProperties,
        card: {
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "16px",
        } as React.CSSProperties,
        bookingCard: {
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "12px",
            position: "relative" as const,
        } as React.CSSProperties,
        button: {
            padding: "8px 16px",
            fontSize: "0.875rem",
            fontWeight: "600",
            borderRadius: "4px",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s",
            marginRight: "8px",
            marginTop: "8px",
        } as React.CSSProperties,
        primaryButton: {
            backgroundColor: "#3b82f6",
            color: "#fff",
        } as React.CSSProperties,
        dangerButton: {
            backgroundColor: "#ef4444",
            color: "#fff",
        } as React.CSSProperties,
        statusBadge: {
            padding: "4px 8px",
            fontSize: "0.75rem",
            fontWeight: "600",
            borderRadius: "12px",
            textTransform: "capitalize" as const,
        } as React.CSSProperties,
    };

    // --- Effects ---
    useEffect(() => {
        fetchBookings();
    }, [customer.owner_id]);

    // --- API Functions ---
    const fetchBookings = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch(`/api/dog-walking/customer-bookings?owner_id=${customer.owner_id}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch bookings");
            }

            console.log("Fetched bookings:", data.bookings);
            setBookings(data.bookings || []);
        } catch (err: any) {
            console.error("Failed to fetch bookings:", err);
            setError(err.message || "Could not load bookings. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Helper Functions ---
    // getServiceDisplayName is now imported from @/lib/serviceTypes

    // Calculate payment due date based on customer's payment preference
    const getPaymentDueDate = (bookingEndTime: Date, paymentPreference: string): Date => {
        switch (paymentPreference) {
            case 'weekly': {
                // Find the Monday after the booking week, then add 3 days
                const endOfBookingWeek = endOfWeek(bookingEndTime, { weekStartsOn: 1 }); // Monday start
                const nextMonday = addDays(endOfBookingWeek, 1);
                return addDays(nextMonday, 3);
            }
            case 'fortnightly': {
                // Find the Monday after the 2-week period, then add 3 days
                // Use ISO week numbers: odd weeks are first week of period, even weeks are second
                const weekNumber = getISOWeek(bookingEndTime);
                const isEvenWeek = weekNumber % 2 === 0;

                if (isEvenWeek) {
                    // Already in an even week, payment due after this week
                    const endOfThisWeek = endOfWeek(bookingEndTime, { weekStartsOn: 1 });
                    const nextMonday = addDays(endOfThisWeek, 1);
                    return addDays(nextMonday, 3);
                } else {
                    // In odd week, payment due after next week (the even week)
                    const endOfNextWeek = addWeeks(endOfWeek(bookingEndTime, { weekStartsOn: 1 }), 1);
                    const mondayAfter = addDays(endOfNextWeek, 1);
                    return addDays(mondayAfter, 3);
                }
            }
            case 'monthly': {
                // Find the 1st of the next month, then add 3 days
                const nextMonth = startOfMonth(addMonths(bookingEndTime, 1));
                return addDays(nextMonth, 3);
            }
            case 'per_service':
            default: {
                // Current behavior: 3 days after booking end
                return addDays(bookingEndTime, 3);
            }
        }
    };

    // Customer status display mapping with payment preference-aware logic
    const getCustomerStatusDisplay = (status: string, booking: Booking): string => {
        if (status === 'completed') {
            const endTime = new Date(booking.end_time);
            const now = new Date();
            const paymentDueDate = getPaymentDueDate(endTime, customer.payment_preference || 'per_service');

            if (now >= paymentDueDate) {
                return 'Completed - Payment Pending';
            } else {
                return 'Completed';
            }
        }
        return status;
    };

    const formatBookingDateTime = (startTime: string, endTime: string, durationMinutes: number) => {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const isMultiDay = !isSameDay(start, end);

        let dateDisplay = "";
        if (isToday(start)) {
            dateDisplay = "Today";
        } else if (isTomorrow(start)) {
            dateDisplay = "Tomorrow";
        } else if (isPast(start)) {
            dateDisplay = format(start, "MMM d, yyyy");
        } else {
            dateDisplay = format(start, "EEE, MMM d");
        }

        let endDateDisplay = "";
        if (isMultiDay) {
            if (isToday(end)) {
                endDateDisplay = "Today";
            } else if (isTomorrow(end)) {
                endDateDisplay = "Tomorrow";
            } else {
                endDateDisplay = format(end, "EEE, MMM d");
            }
        }

        const timeDisplay = isMultiDay
            ? `${format(start, "h:mm a")} → ${format(end, "h:mm a")}`
            : `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;

        return { dateDisplay, endDateDisplay, timeDisplay, isMultiDay };
    };

    const getBookingStatusColor = (booking: Booking): string => {
        if (booking.status === 'completed') {
            // Use payment preference-aware due date calculation
            const endTime = new Date(booking.end_time);
            const now = new Date();
            const paymentDueDate = getPaymentDueDate(endTime, customer.payment_preference || 'per_service');

            if (now >= paymentDueDate) {
                return '#ef4444'; // Red for payment pending
            } else {
                return '#10b981'; // Green for recently completed
            }
        }

        switch (booking.status) {
            case 'confirmed': return '#3b82f6';
            case 'completed & paid':
            case 'paid': return '#059669';
            case 'cancelled': return '#ef4444';
            case 'active': return '#f59e0b';
            case 'no_show': return '#6b7280';
            default: return '#6b7280';
        }
    };

    const canCancelBooking = (booking: Booking): boolean => {
        const bookingTime = new Date(booking.start_time);
        const now = new Date();
        const timeDifference = bookingTime.getTime() - now.getTime();
        const hoursDifference = timeDifference / (1000 * 3600);

        // NEW: Can't cancel completed services (completed or awaiting payment)
        return booking.status === 'confirmed' && hoursDifference > 24;
    };

    const handleCancelBooking = (booking: Booking) => {
        const confirmCancel = window.confirm(
            `Are you sure you want to cancel your ${getServiceDisplayName(booking.service_type)} appointment on ${format(new Date(booking.start_time), "EEEE, MMMM d 'at' h:mm a")}?`
        );

        if (confirmCancel) {
            window.open(`/dog-walking/cancel?bookingId=${booking.id}`, '_blank');
        }
    };

    // --- NEW: Tab Change Handler ---
    const handleTabChange = (tab: 'bookings' | 'account' | 'addresses' | 'media') => {
        if (tab === 'account') {
            onAccountView();
        } else if (tab === 'addresses') {
            onAddressesView();
        } else if (tab === 'media') {
            onMediaView();
        } else {
            setActiveTab(tab);
        }
    };

    // --- Helper Function to Render Booking Card ---
    const renderBookingCard = (booking: Booking, showCancel: boolean = true) => {
        const { dateDisplay, endDateDisplay, timeDisplay, isMultiDay } = formatBookingDateTime(
            booking.start_time,
            booking.end_time,
            booking.duration_minutes
        );

        return (
            <div key={booking.id} style={styles.bookingCard}>
                {/* Status indicator stripe */}
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: "4px",
                        backgroundColor: getBookingStatusColor(booking),
                        borderTopLeftRadius: "8px",
                        borderBottomLeftRadius: "8px",
                    }}
                />

                {/* Main content */}
                <div style={{ marginLeft: "8px" }}>
                    {/* Header row */}
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <h3 className="text-white text-lg font-semibold" style={{ margin: 0 }}>
                                    {getServiceDisplayName(booking.service_type)}
                                </h3>
                                {booking.is_recurring && (
                                    <span style={{
                                        backgroundColor: '#7c3aed',
                                        color: '#fff',
                                        fontSize: '0.65rem',
                                        fontWeight: '600',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        textTransform: 'uppercase',
                                    }}>
                                        Recurring
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-300 text-sm">
                                {booking.dog_names?.join(' & ') || 'Unknown dogs'}
                            </p>
                        </div>
                        <div
                            style={{
                                ...styles.statusBadge,
                                backgroundColor: getBookingStatusColor(booking),
                                color: '#fff',
                            }}
                        >
                            {getCustomerStatusDisplay(booking.status, booking)}
                        </div>
                    </div>

                    {/* Date and Time */}
                    <div className="flex justify-between items-center mb-3">
                        <div>
                            <p className="text-gray-400 text-sm">
                                {isMultiDay
                                    ? `${dateDisplay} → ${endDateDisplay} • ${timeDisplay}`
                                    : `${dateDisplay} • ${timeDisplay}`
                                }
                            </p>
                        </div>
                        {booking.price_pounds && (
                            <div className="text-green-400 font-semibold">
                                {formatPrice(booking.price_pounds)}
                            </div>
                        )}
                    </div>

                    {/* Walk Summary */}
                    {booking.walk_summary && (
                        <div style={{
                            backgroundColor: "#065f46",
                            border: "1px solid #059669",
                            borderRadius: "6px",
                            padding: "8px",
                            marginBottom: "12px"
                        }}>
                            <p style={{ color: "#10b981", fontSize: "0.75rem", fontWeight: "600", marginBottom: "4px" }}>
                                WALK SUMMARY
                            </p>
                            <p style={{ color: "#a7f3d0", fontSize: "0.875rem", margin: "0" }}>
                                {booking.walk_summary}
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            style={{ ...styles.button, ...styles.primaryButton }}
                            onClick={() => onBookingSelect(booking.id)}
                            className="hover:bg-blue-600"
                        >
                            View Details
                        </button>

                        {showCancel && canCancelBooking(booking) && (
                            <button
                                style={{ ...styles.button, ...styles.dangerButton }}
                                onClick={() => handleCancelBooking(booking)}
                                className="hover:bg-red-600"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // --- Render ---
    return (
        <div style={styles.container}>
            {/* Customer Info Card */}
            <div style={styles.card}>
                <h2 style={{ color: "#fff", marginBottom: "16px", fontSize: "1.25rem" }}>
                    Welcome back, {customer.owner_name}!
                </h2>
                <div style={{ color: "#d1d5db" }}>
                    <p style={{ margin: "0 0 8px 0" }}>📧 {customer.email}</p>
                    <p style={{ margin: "0 0 8px 0" }}>📞 {customer.phone}</p>
                    {customer.partner_name && (
                        <p style={{ margin: "0 0 8px 0" }}>
                            👫 Partner: {customer.partner_name}
                            {customer.partner_email && ` (${customer.partner_email})`}
                        </p>
                    )}
                    <p style={{ margin: "0" }}>📍 {customer.address}</p>
                </div>
            </div>

            {/* Outstanding Balance Card */}
            {(() => {
                const outstandingTotal = bookings
                    .filter(b => b.status === 'completed')
                    .reduce((sum, b) => sum + (b.price_pounds || 0), 0);

                if (outstandingTotal > 0) {
                    return (
                        <div style={{
                            ...styles.card,
                            backgroundColor: "#7f1d1d",
                            border: "1px solid #dc2626"
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <h3 style={{ color: "#fecaca", margin: "0 0 4px 0", fontSize: "1rem" }}>
                                        Outstanding Balance
                                    </h3>
                                    <p style={{ color: "#fca5a5", margin: "0", fontSize: "0.875rem" }}>
                                        Payment due at agreed date
                                    </p>
                                </div>
                                <div style={{
                                    color: "#fff",
                                    fontSize: "1.5rem",
                                    fontWeight: "bold"
                                }}>
                                    {formatPrice(outstandingTotal)}
                                </div>
                            </div>
                        </div>
                    );
                }
                return null;
            })()}

            {/* Tab Navigation */}
            <div style={styles.tabContainer}>
                <button
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'bookings' ? styles.activeTab : {}),
                    }}
                    onClick={() => handleTabChange('bookings')}
                >
                    📅 My Bookings
                </button>
                <button
                    style={{
                        ...styles.tab,
                    }}
                    onClick={() => handleTabChange('account')}
                >
                    ⚙️ My Details
                </button>
                <button
                    style={{
                        ...styles.tab,
                    }}
                    onClick={() => handleTabChange('addresses')}
                >
                    📍 Secondary Addresses
                </button>
                <button
                    style={{
                        ...styles.tab,
                    }}
                    onClick={() => handleTabChange('media')}
                >
                    📷 My Media
                </button>
            </div>

            {/* Bookings Content */}
            {activeTab === 'bookings' && (
                <>
                    {/* Quick Actions */}
                    <div style={styles.card}>
                        <h3 style={{ color: "#fff", marginBottom: "16px", fontSize: "1.1rem" }}>
                            Quick Actions
                        </h3>
                        <a
                            href={`/book-now?userId=${customer.owner_id}&phone=${encodeURIComponent(customer.phone)}&email=${encodeURIComponent(customer.email)}`}
                            className="inline-block px-4 py-2 text-sm font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 mr-2 mt-2 no-underline"
                        >
                            📅 Book New Service
                        </a>
                        <a
                            href="/dog-walking/dashboard/book-recurring"
                            className="inline-block px-4 py-2 text-sm font-semibold rounded bg-purple-600 text-white hover:bg-purple-700 transition-all duration-200 mr-2 mt-2 no-underline"
                        >
                            🔄 Book Recurring
                        </a>
                        <button
                            onClick={onLogout}
                            className="inline-block px-4 py-2 text-sm font-semibold rounded bg-gray-600 text-white hover:bg-gray-700 transition-all duration-200 mr-2 mt-2"
                        >
                            🚪 Log Out
                        </button>
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div style={styles.card}>
                            <p style={{ color: "#9ca3af", textAlign: "center", padding: "20px" }}>
                                Loading your bookings...
                            </p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div style={styles.card}>
                            <div style={{
                                color: "#fecaca",
                                backgroundColor: "#7f1d1d",
                                padding: "12px",
                                borderRadius: "6px",
                                border: "1px solid #dc2626",
                            }}>
                                {error}
                            </div>
                        </div>
                    )}

                    {/* Current Bookings Section */}
                    {!isLoading && !error && (
                        <div style={styles.card}>
                            <h3 style={{ color: "#fff", marginBottom: "16px", fontSize: "1.1rem" }}>
                                📅 Your Current Bookings
                            </h3>

                            {(() => {
                                // NEW: Filter for current bookings (confirmed, completed, and awaiting payment)
                                const currentBookings = bookings.filter(booking => {
                                    if (booking.status === 'confirmed') return true;

                                    if (booking.status === 'completed') {
                                        // Only show completed bookings in "current" if they're unpaid (any age)
                                        return true;
                                    }

                                    return false;
                                });

                                if (currentBookings.length === 0) {
                                    return (
                                        <div style={{ textAlign: "center", padding: "20px" }}>
                                            <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
                                                No upcoming bookings or unpaid services
                                            </p>
                                        </div>
                                    );
                                }

                                return currentBookings.map((booking) => renderBookingCard(booking, true));
                            })()}
                        </div>
                    )}

                    {/* Booking History Section */}
                    {!isLoading && !error && (
                        <div style={styles.card}>
                            <h3 style={{ color: "#fff", marginBottom: "16px", fontSize: "1.1rem" }}>
                                📋 Booking History
                            </h3>

                            {(() => {
                                // Filter for historical bookings (completed & paid, cancelled, no-show)
                                const historyBookings = bookings.filter(booking =>
                                    booking.status === 'completed & paid' ||
                                    booking.status === 'cancelled' ||
                                    booking.status === 'no_show'
                                );

                                if (historyBookings.length === 0) {
                                    return (
                                        <div style={{ textAlign: "center", padding: "20px" }}>
                                            <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
                                                No booking history yet
                                            </p>
                                        </div>
                                    );
                                }

                                return historyBookings.map((booking) => renderBookingCard(booking, false));
                            })()}
                        </div>
                    )}

                    {/* Empty State - Only show if no bookings at all */}
                    {!isLoading && !error && bookings.length === 0 && (
                        <div style={styles.card}>
                            <div style={{ textAlign: "center", padding: "40px 20px" }}>
                                <p style={{ color: "#9ca3af", fontSize: "1.1rem", marginBottom: "16px" }}>
                                    No bookings found
                                </p>
                                <p style={{ color: "#6b7280", marginBottom: "20px" }}>
                                    Ready to schedule your first dog walking service?
                                </p>
                                <a
                                    href={`/book-now?userId=${customer.owner_id}&phone=${encodeURIComponent(customer.phone)}&email=${encodeURIComponent(customer.email)}`}
                                    className="inline-block px-4 py-2 text-sm font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 mr-2 mt-2 no-underline"
                                >
                                    Book Your First Walk
                                </a>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}