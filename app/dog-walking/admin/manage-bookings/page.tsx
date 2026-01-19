"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";

// Types
interface EditableBooking {
    id: number;
    status: string;
    service_type: string;
    price_pounds: number | null;
    start_time: string;
    end_time: string | null;
    duration_minutes: number;
    created_at: string;
    owner_name: string;
    phone: string;
    email: string;
    dog_names: string[];
}

interface BookingsResponse {
    success: boolean;
    bookings: EditableBooking[];
    count: number;
}

export default function ManageBookings() {
    // State
    const [bookings, setBookings] = useState<EditableBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingPrice, setEditingPrice] = useState<number | null>(null);
    const [priceValue, setPriceValue] = useState<string>('');
    const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
    const [updatingPrice, setUpdatingPrice] = useState<number | null>(null);

    // Filter State
    const [filterClient, setFilterClient] = useState<string>('');
    const [filterDateFrom, setFilterDateFrom] = useState<string>('');
    const [filterDateTo, setFilterDateTo] = useState<string>('');
    const [filterService, setFilterService] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');

    // Effects
    useEffect(() => {
        fetchBookings();
    }, []);

    // API Functions
    const fetchBookings = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/dog-walking/admin/bookings/editable', {
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to fetch bookings");
            }

            const data: BookingsResponse = await response.json();
            setBookings(data.bookings || []);

        } catch (err: any) {
            console.error("Failed to fetch bookings:", err);
            setError(err.message || "Could not load bookings. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const updatePrice = async (bookingId: number, newPrice: number | null) => {
        try {
            setUpdatingPrice(bookingId);
            setError(null);

            const response = await fetch(`/api/dog-walking/admin/bookings/${bookingId}/price`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ price: newPrice }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to update price");
            }

            // Update the booking in local state
            setBookings(prev => prev.map(booking =>
                booking.id === bookingId
                    ? { ...booking, price_pounds: newPrice }
                    : booking
            ));

            setEditingPrice(null);
            setPriceValue('');

        } catch (err: any) {
            console.error("Failed to update price:", err);
            setError(err.message || "Could not update price. Please try again.");
        } finally {
            setUpdatingPrice(null);
        }
    };

    const updateStatus = async (bookingId: number, newStatus: string) => {
        try {
            setUpdatingStatus(bookingId);
            setError(null);

            const response = await fetch(`/api/dog-walking/admin/bookings/${bookingId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to update status");
            }

            // Update the booking in local state
            setBookings(prev => prev.map(booking =>
                booking.id === bookingId
                    ? { ...booking, status: newStatus }
                    : booking
            ));

        } catch (err: any) {
            console.error("Failed to update status:", err);
            setError(err.message || "Could not update status. Please try again.");
        } finally {
            setUpdatingStatus(null);
        }
    };

    // Helper Functions
    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);

            if (date.toDateString() === today.toDateString()) {
                return `Today ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
            } else if (date.toDateString() === tomorrow.toDateString()) {
                return `Tomorrow ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
            } else {
                return date.toLocaleDateString('en-GB', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        } catch (error) {
            return dateString;
        }
    };

    const formatPrice = (price: number | null | undefined) => {
        if (price === null || price === undefined) return "Not Set";
        const numPrice = Number(price);
        if (isNaN(numPrice)) return "Invalid";
        if (numPrice === 0) return "FREE";
        return `£${numPrice.toFixed(2)}`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return '#3b82f6';
            case 'completed': return '#059669';
            case 'cancelled': return '#dc2626';
            case 'no_show': return '#f59e0b';
            default: return '#6b7280';
        }
    };

    const getStatusDisplayName = (status: string) => {
        switch (status) {
            case 'confirmed': return 'Confirmed';
            case 'completed': return 'Completed';
            case 'cancelled': return 'Cancelled';
            case 'no_show': return 'No Show';
            default: return status;
        }
    };

    // Price editing handlers
    const handlePriceClick = (bookingId: number, currentPrice: number | null) => {
        setEditingPrice(bookingId);
        setPriceValue(currentPrice?.toString() || '');
    };

    const handlePriceKeyDown = (e: React.KeyboardEvent, bookingId: number) => {
        if (e.key === 'Enter') {
            handlePriceSave(bookingId);
        } else if (e.key === 'Escape') {
            setEditingPrice(null);
            setPriceValue('');
        }
    };

    const handlePriceSave = (bookingId: number) => {
        const newPrice = priceValue === '' ? null : parseFloat(priceValue);
        if (priceValue !== '' && (isNaN(newPrice!) || newPrice! < 0)) {
            setError("Price must be a positive number or empty for no charge");
            return;
        }
        updatePrice(bookingId, newPrice);
    };

    // Extract unique values for filter dropdowns
    const uniqueClients = useMemo(() => {
        const clients = Array.from(new Set(bookings.map(b => b.owner_name)));
        return clients.sort((a, b) => a.localeCompare(b));
    }, [bookings]);

    const uniqueServices = useMemo(() => {
        const services = Array.from(new Set(bookings.map(b => b.service_type)));
        return services.sort((a, b) => a.localeCompare(b));
    }, [bookings]);

    const uniqueStatuses = useMemo(() => {
        const statuses = Array.from(new Set(bookings.map(b => b.status)));
        return statuses;
    }, [bookings]);

    // Apply filters
    const filteredBookings = useMemo(() => {
        return bookings.filter(booking => {
            // Client filter
            if (filterClient && booking.owner_name !== filterClient) {
                return false;
            }

            // Date from filter
            if (filterDateFrom) {
                const bookingDate = new Date(booking.start_time);
                const fromDate = new Date(filterDateFrom);
                fromDate.setHours(0, 0, 0, 0);
                if (bookingDate < fromDate) {
                    return false;
                }
            }

            // Date to filter
            if (filterDateTo) {
                const bookingDate = new Date(booking.start_time);
                const toDate = new Date(filterDateTo);
                toDate.setHours(23, 59, 59, 999);
                if (bookingDate > toDate) {
                    return false;
                }
            }

            // Service filter
            if (filterService && booking.service_type !== filterService) {
                return false;
            }

            // Status filter
            if (filterStatus && booking.status !== filterStatus) {
                return false;
            }

            return true;
        });
    }, [bookings, filterClient, filterDateFrom, filterDateTo, filterService, filterStatus]);

    // Clear all filters
    const clearFilters = () => {
        setFilterClient('');
        setFilterDateFrom('');
        setFilterDateTo('');
        setFilterService('');
        setFilterStatus('');
    };

    const hasActiveFilters = filterClient || filterDateFrom || filterDateTo || filterService || filterStatus;

    // Separate and sort bookings
    const now = new Date();
    const upcomingBookings = filteredBookings
        .filter(booking => new Date(booking.start_time) >= now)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const pastBookings = filteredBookings
        .filter(booking => new Date(booking.start_time) < now)
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    const renderPriceCell = (booking: EditableBooking) => {
        const isEditing = editingPrice === booking.id;
        const isUpdating = updatingPrice === booking.id;

        if (isUpdating) {
            return (
                <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
                    Saving...
                </div>
            );
        }

        if (isEditing) {
            return (
                <input
                    type="number"
                    value={priceValue}
                    onChange={(e) => setPriceValue(e.target.value)}
                    onBlur={() => handlePriceSave(booking.id)}
                    onKeyDown={(e) => handlePriceKeyDown(e, booking.id)}
                    placeholder="Enter price"
                    autoFocus
                    style={{
                        width: "100px",
                        padding: "4px 8px",
                        backgroundColor: "#111827",
                        color: "#fff",
                        border: "1px solid #3b82f6",
                        borderRadius: "4px",
                        fontFamily: "monospace",
                        fontSize: "0.875rem",
                    }}
                />
            );
        }

        return (
            <span
                onClick={() => handlePriceClick(booking.id, booking.price_pounds)}
                style={{
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: "1px solid transparent",
                    fontFamily: "monospace",
                    transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#374151";
                    e.currentTarget.style.borderColor = "#6b7280";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.borderColor = "transparent";
                }}
            >
                {formatPrice(booking.price_pounds)}
            </span>
        );
    };

    const renderStatusCell = (booking: EditableBooking) => {
        const isUpdating = updatingStatus === booking.id;

        if (isUpdating) {
            return (
                <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
                    Updating...
                </div>
            );
        }

        return (
            <select
                value={booking.status}
                onChange={(e) => updateStatus(booking.id, e.target.value)}
                disabled={isUpdating}
                style={{
                    padding: "4px 8px",
                    backgroundColor: getStatusColor(booking.status),
                    color: "#fff",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "0.875rem",
                    fontWeight: "bold",
                    cursor: "pointer",
                }}
            >
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
            </select>
        );
    };

    const renderBookingSection = (title: string, bookingList: EditableBooking[], sectionColor: string) => (
        <div style={{ marginBottom: "32px" }}>
            <h2 style={{
                color: sectionColor,
                fontSize: "1.3rem",
                fontWeight: "bold",
                marginBottom: "16px",
                borderBottom: `2px solid ${sectionColor}`,
                paddingBottom: "8px"
            }}>
                {title} ({bookingList.length})
            </h2>
            {bookingList.length > 0 ? (
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Date & Time</th>
                                <th style={styles.th}>Customer</th>
                                <th style={styles.th}>Service</th>
                                <th style={styles.th}>Dogs</th>
                                <th style={styles.th}>Price</th>
                                <th style={styles.th}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookingList.map((booking) => (
                                <tr key={booking.id}>
                                    <td style={styles.td}>
                                        {formatDate(booking.start_time)}
                                    </td>
                                    <td style={styles.td}>
                                        <div style={{ fontWeight: "bold" }}>
                                            {booking.owner_name}
                                        </div>
                                        <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
                                            {booking.phone}
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        {booking.service_type}
                                        <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
                                            {booking.duration_minutes} min
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        {Array.isArray(booking.dog_names) ? booking.dog_names.join(", ") : "Unknown"}
                                    </td>
                                    <td style={{ ...styles.td, ...styles.priceCell }}>
                                        {renderPriceCell(booking)}
                                    </td>
                                    <td style={styles.td}>
                                        {renderStatusCell(booking)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{ ...styles.noData, backgroundColor: "#374151", borderRadius: "4px", padding: "20px" }}>
                    No {title.toLowerCase()} found
                </div>
            )}
        </div>
    );

    // Styles
    const styles = {
        container: {
            maxWidth: "1200px",
            margin: "0 auto",
        } as React.CSSProperties,
        header: {
            marginBottom: "32px",
        } as React.CSSProperties,
        title: {
            fontSize: "1.8rem",
            fontWeight: "bold",
            color: "#d1d5db",
            marginBottom: "8px",
        } as React.CSSProperties,
        subtitle: {
            color: "#9ca3af",
            fontSize: "1rem",
        } as React.CSSProperties,
        backButton: {
            display: "inline-block",
            padding: "12px 24px",
            backgroundColor: "#6b7280",
            color: "#fff",
            textDecoration: "none",
            borderRadius: "6px",
            fontWeight: "bold",
            marginBottom: "24px",
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
            borderRadius: "8px",
            padding: "16px",
            textAlign: "center",
            marginBottom: "24px",
        } as React.CSSProperties,
        tableContainer: {
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            overflow: "auto",
        } as React.CSSProperties,
        table: {
            width: "100%",
            borderCollapse: "collapse",
        } as React.CSSProperties,
        th: {
            backgroundColor: "#374151",
            padding: "16px",
            textAlign: "left",
            fontWeight: "bold",
            color: "#d1d5db",
            borderBottom: "1px solid #4b5563",
        } as React.CSSProperties,
        td: {
            padding: "16px",
            borderBottom: "1px solid #374151",
            color: "#d1d5db",
        } as React.CSSProperties,
        priceCell: {
            fontFamily: "monospace",
            fontWeight: "bold",
        } as React.CSSProperties,
        noData: {
            textAlign: "center",
            padding: "40px",
            color: "#9ca3af",
        } as React.CSSProperties,
        stats: {
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "24px",
            textAlign: "center",
            color: "#d1d5db",
        } as React.CSSProperties,
        helpText: {
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "24px",
            color: "#9ca3af",
            fontSize: "0.875rem",
        } as React.CSSProperties,
        filterBar: {
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "24px",
        } as React.CSSProperties,
        filterRow: {
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            alignItems: "flex-end",
        } as React.CSSProperties,
        filterGroup: {
            display: "flex",
            flexDirection: "column",
            minWidth: "150px",
        } as React.CSSProperties,
        filterLabel: {
            color: "#9ca3af",
            fontSize: "0.75rem",
            marginBottom: "4px",
            fontWeight: "bold",
        } as React.CSSProperties,
        filterSelect: {
            padding: "8px 12px",
            backgroundColor: "#374151",
            color: "#d1d5db",
            border: "1px solid #4b5563",
            borderRadius: "6px",
            fontSize: "0.875rem",
            cursor: "pointer",
        } as React.CSSProperties,
        filterInput: {
            padding: "8px 12px",
            backgroundColor: "#374151",
            color: "#d1d5db",
            border: "1px solid #4b5563",
            borderRadius: "6px",
            fontSize: "0.875rem",
        } as React.CSSProperties,
        clearButton: {
            padding: "8px 16px",
            backgroundColor: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontWeight: "bold",
            cursor: "pointer",
        } as React.CSSProperties,
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>Loading bookings...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <Link href="/dog-walking/admin" style={styles.backButton}>
                        ← Back to Admin Dashboard
                    </Link>
                    <h1 style={styles.title}>Manage Bookings</h1>
                </div>
                <div style={styles.error}>
                    {error}
                    <button
                        onClick={() => setError(null)}
                        style={{
                            marginLeft: "16px",
                            padding: "4px 8px",
                            backgroundColor: "transparent",
                            border: "1px solid #ef4444",
                            color: "#ef4444",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        Clear
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <Link href="/dog-walking/admin" style={styles.backButton}>
                    ← Back to Admin Dashboard
                </Link>
                <h1 style={styles.title}>Manage Bookings</h1>
                <p style={styles.subtitle}>Edit prices and update booking status</p>
            </div>

            {/* Error Display */}
            {error && (
                <div style={styles.error}>
                    {error}
                    <button
                        onClick={() => setError(null)}
                        style={{
                            marginLeft: "16px",
                            padding: "4px 8px",
                            backgroundColor: "transparent",
                            border: "1px solid #ef4444",
                            color: "#ef4444",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        Clear
                    </button>
                </div>
            )}

            {/* Help Text */}
            <div style={styles.helpText}>
                <strong>How to use:</strong> Click on any price to edit it. Use dropdown to change status.
                "No Show" status automatically sends an email to the customer.
            </div>

            {/* Filter Bar */}
            <div style={styles.filterBar}>
                <div style={styles.filterRow}>
                    {/* Client Filter */}
                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>Client</label>
                        <select
                            value={filterClient}
                            onChange={(e) => setFilterClient(e.target.value)}
                            style={styles.filterSelect}
                        >
                            <option value="">All Clients</option>
                            {uniqueClients.map(client => (
                                <option key={client} value={client}>{client}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date From Filter */}
                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>From Date</label>
                        <input
                            type="date"
                            value={filterDateFrom}
                            onChange={(e) => setFilterDateFrom(e.target.value)}
                            style={styles.filterInput}
                        />
                    </div>

                    {/* Date To Filter */}
                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>To Date</label>
                        <input
                            type="date"
                            value={filterDateTo}
                            onChange={(e) => setFilterDateTo(e.target.value)}
                            style={styles.filterInput}
                        />
                    </div>

                    {/* Service Filter */}
                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>Service</label>
                        <select
                            value={filterService}
                            onChange={(e) => setFilterService(e.target.value)}
                            style={styles.filterSelect}
                        >
                            <option value="">All Services</option>
                            {uniqueServices.map(service => (
                                <option key={service} value={service}>{service}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>Status</label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={styles.filterSelect}
                        >
                            <option value="">All Statuses</option>
                            {uniqueStatuses.map(status => (
                                <option key={status} value={status}>{getStatusDisplayName(status)}</option>
                            ))}
                        </select>
                    </div>

                    {/* Clear Filters Button */}
                    {hasActiveFilters && (
                        <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>&nbsp;</label>
                            <button
                                onClick={clearFilters}
                                style={styles.clearButton}
                            >
                                Clear Filters
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div style={styles.stats}>
                {hasActiveFilters ? (
                    <>
                        <strong>{filteredBookings.length}</strong> of <strong>{bookings.length}</strong> bookings shown
                        <span style={{ color: "#9ca3af", marginLeft: "16px" }}>
                            ({upcomingBookings.length} upcoming, {pastBookings.length} past)
                        </span>
                    </>
                ) : (
                    <>
                        <strong>{bookings.length}</strong> editable booking{bookings.length !== 1 ? 's' : ''} found
                        <span style={{ color: "#9ca3af", marginLeft: "16px" }}>
                            ({upcomingBookings.length} upcoming, {pastBookings.length} past)
                        </span>
                    </>
                )}
            </div>

            {filteredBookings.length > 0 ? (
                <div>
                    {/* Upcoming Bookings Section */}
                    {renderBookingSection("📅 Upcoming Bookings", upcomingBookings, "#3b82f6")}

                    {/* Past Bookings Section */}
                    {renderBookingSection("📋 Past Bookings", pastBookings, "#6b7280")}
                </div>
            ) : hasActiveFilters ? (
                <div style={styles.noData}>
                    No bookings match your filters. Try adjusting or clearing the filters.
                </div>
            ) : (
                <div style={styles.noData}>
                    No editable bookings found. All bookings are either completed & paid.
                </div>
            )}
        </div>
    );
}