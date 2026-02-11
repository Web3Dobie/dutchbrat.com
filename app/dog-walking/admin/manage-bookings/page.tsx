"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getServiceDisplayName } from "@/lib/serviceTypes";

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
    owner_id: number;
    dog_id_1: number | null;
    dog_id_2: number | null;
    secondary_address_id: number | null;
    // Series fields
    series_id?: number | null;
    series_index?: number | null;
    recurrence_pattern?: string | null;
}

interface BookingsResponse {
    success: boolean;
    bookings: EditableBooking[];
    count: number;
}

interface OwnerDog {
    id: number;
    dog_name: string;
    dog_breed: string;
}

interface SecondaryAddress {
    id: number;
    address: string;
    address_label: string;
    is_active: boolean;
}

type ModalType = 'reschedule' | 'cancel' | 'modify-dogs' | 'modify-address' | 'mark-completed' | 'mark-confirmed' | 'mark-no-show' | null;

export default function ManageBookings() {
    // Core state
    const [bookings, setBookings] = useState<EditableBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingPrice, setEditingPrice] = useState<number | null>(null);
    const [priceValue, setPriceValue] = useState<string>('');
    const [updatingPrice, setUpdatingPrice] = useState<number | null>(null);

    // Modal state
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [actionBooking, setActionBooking] = useState<EditableBooking | null>(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Reschedule modal state
    const [rescheduleDate, setRescheduleDate] = useState<string>('');
    const [rescheduleTime, setRescheduleTime] = useState<string>('');

    // Modify Dogs modal state
    const [ownerDogs, setOwnerDogs] = useState<OwnerDog[]>([]);
    const [loadingDogs, setLoadingDogs] = useState(false);
    const [modifyDogId1, setModifyDogId1] = useState<string>('');
    const [modifyDogId2, setModifyDogId2] = useState<string>('');

    // Modify Address modal state
    const [ownerAddresses, setOwnerAddresses] = useState<SecondaryAddress[]>([]);
    const [loadingAddresses, setLoadingAddresses] = useState(false);
    const [modifyAddressId, setModifyAddressId] = useState<string>(''); // '' = primary

    // Mark Completed modal state
    const [walkSummary, setWalkSummary] = useState<string>('');

    // Filter state
    const [filterClient, setFilterClient] = useState<string>('');
    const [filterDateFrom, setFilterDateFrom] = useState<string>('');
    const [filterDateTo, setFilterDateTo] = useState<string>('');
    const [filterService, setFilterService] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterBookingType, setFilterBookingType] = useState<string>('');

    // Effects
    useEffect(() => {
        fetchBookings();
    }, []);

    // --- API Functions ---

    const fetchBookings = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/dog-walking/admin/bookings/editable', { credentials: 'include' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to fetch bookings");
            }
            const data: BookingsResponse = await response.json();
            setBookings(data.bookings || []);
        } catch (err: any) {
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
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ price: newPrice }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to update price");
            }
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, price_pounds: newPrice } : b));
            setEditingPrice(null);
            setPriceValue('');
        } catch (err: any) {
            setError(err.message || "Could not update price. Please try again.");
        } finally {
            setUpdatingPrice(null);
        }
    };

    // --- Modal Handlers ---

    const openModal = (booking: EditableBooking, modal: ModalType) => {
        setActionBooking(booking);
        setActiveModal(modal);
        setModalError(null);

        if (modal === 'reschedule') {
            const startDate = new Date(booking.start_time);
            setRescheduleDate(startDate.toISOString().split('T')[0]);
            setRescheduleTime(startDate.toTimeString().slice(0, 5));
        }

        if (modal === 'modify-dogs') {
            setModifyDogId1(booking.dog_id_1?.toString() || '');
            setModifyDogId2(booking.dog_id_2?.toString() || '');
            fetchOwnerDogs(booking.owner_id);
        }

        if (modal === 'modify-address') {
            setModifyAddressId(booking.secondary_address_id?.toString() || '');
            fetchOwnerAddresses(booking.owner_id);
        }

        if (modal === 'mark-completed') {
            setWalkSummary('');
        }
    };

    const closeModal = () => {
        setActiveModal(null);
        setActionBooking(null);
        setModalError(null);
        setModalLoading(false);
    };

    const handleActionSelect = (booking: EditableBooking, value: string) => {
        if (!value) return;
        openModal(booking, value as ModalType);
    };

    const fetchOwnerDogs = async (ownerId: number) => {
        setLoadingDogs(true);
        try {
            const response = await fetch(`/api/dog-walking/admin/clients/${ownerId}`, { credentials: 'include' });
            if (!response.ok) throw new Error("Failed to fetch owner dogs");
            const data = await response.json();
            setOwnerDogs(data.client?.dogs || []);
        } catch (err: any) {
            setModalError("Could not load dogs for this owner.");
        } finally {
            setLoadingDogs(false);
        }
    };

    const fetchOwnerAddresses = async (ownerId: number) => {
        setLoadingAddresses(true);
        try {
            const response = await fetch(`/api/dog-walking/secondary-addresses?owner_id=${ownerId}`, { credentials: 'include' });
            if (!response.ok) throw new Error("Failed to fetch addresses");
            const data = await response.json();
            setOwnerAddresses((data.addresses || []).filter((a: SecondaryAddress) => a.is_active));
        } catch (err: any) {
            setModalError("Could not load addresses for this owner.");
        } finally {
            setLoadingAddresses(false);
        }
    };

    // --- Modal Submit Handlers ---

    const handleRescheduleSubmit = async () => {
        if (!actionBooking || !rescheduleDate || !rescheduleTime) {
            setModalError("Please select both date and time");
            return;
        }
        try {
            setModalLoading(true);
            setModalError(null);
            const newStartDate = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
            const newEndDate = new Date(newStartDate.getTime() + actionBooking.duration_minutes * 60 * 1000);
            const response = await fetch('/api/dog-walking/reschedule-booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    booking_id: actionBooking.id,
                    new_start_time: newStartDate.toISOString(),
                    new_end_time: newEndDate.toISOString(),
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to reschedule booking");
            }
            const result = await response.json();
            await fetchBookings();
            closeModal();
            if (result.calendar_updated === false) {
                setError("Booking rescheduled but Google Calendar was not updated — please update manually.");
            }
        } catch (err: any) {
            setModalError(err.message || "Could not reschedule booking. Please try again.");
        } finally {
            setModalLoading(false);
        }
    };

    const handleCancelSubmit = async () => {
        if (!actionBooking) return;
        try {
            setModalLoading(true);
            setModalError(null);
            const response = await fetch('/api/dog-walking/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ bookingId: actionBooking.id }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to cancel booking");
            }
            setBookings(prev => prev.map(b => b.id === actionBooking.id ? { ...b, status: 'cancelled' } : b));
            closeModal();
        } catch (err: any) {
            setModalError(err.message || "Could not cancel booking. Please try again.");
        } finally {
            setModalLoading(false);
        }
    };

    const handleModifyDogsSubmit = async () => {
        if (!actionBooking || !modifyDogId1) {
            setModalError("Please select at least one dog");
            return;
        }
        try {
            setModalLoading(true);
            setModalError(null);
            const response = await fetch(`/api/dog-walking/admin/bookings/${actionBooking.id}/dogs`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    dog_id_1: parseInt(modifyDogId1),
                    dog_id_2: modifyDogId2 ? parseInt(modifyDogId2) : null,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to update dogs");
            }
            const result = await response.json();
            setBookings(prev => prev.map(b => b.id === actionBooking.id
                ? { ...b, dog_id_1: parseInt(modifyDogId1), dog_id_2: modifyDogId2 ? parseInt(modifyDogId2) : null, price_pounds: result.new_price, dog_names: result.dog_names ? result.dog_names.split(' & ') : b.dog_names }
                : b
            ));
            closeModal();
        } catch (err: any) {
            setModalError(err.message || "Could not update dogs. Please try again.");
        } finally {
            setModalLoading(false);
        }
    };

    const handleModifyAddressSubmit = async () => {
        if (!actionBooking) return;
        try {
            setModalLoading(true);
            setModalError(null);
            const response = await fetch(`/api/dog-walking/admin/bookings/${actionBooking.id}/address`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    secondary_address_id: modifyAddressId ? parseInt(modifyAddressId) : null,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to update address");
            }
            const result = await response.json();
            setBookings(prev => prev.map(b => b.id === actionBooking.id
                ? { ...b, secondary_address_id: result.secondary_address_id }
                : b
            ));
            closeModal();
        } catch (err: any) {
            setModalError(err.message || "Could not update address. Please try again.");
        } finally {
            setModalLoading(false);
        }
    };

    const handleMarkCompletedSubmit = async () => {
        if (!actionBooking) return;
        try {
            setModalLoading(true);
            setModalError(null);
            const response = await fetch('/api/dog-walking/admin/mark-completed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    booking_ids: [actionBooking.id],
                    walk_summary: walkSummary || undefined,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to mark as completed");
            }
            setBookings(prev => prev.map(b => b.id === actionBooking.id ? { ...b, status: 'completed' } : b));
            closeModal();
        } catch (err: any) {
            setModalError(err.message || "Could not mark as completed. Please try again.");
        } finally {
            setModalLoading(false);
        }
    };

    const handleStatusUpdate = async (status: string) => {
        if (!actionBooking) return;
        try {
            setModalLoading(true);
            setModalError(null);
            const response = await fetch(`/api/dog-walking/admin/bookings/${actionBooking.id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to update status");
            }
            setBookings(prev => prev.map(b => b.id === actionBooking.id ? { ...b, status } : b));
            closeModal();
        } catch (err: any) {
            setModalError(err.message || "Could not update status. Please try again.");
        } finally {
            setModalLoading(false);
        }
    };

    // --- Helper Functions ---

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
                return date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            }
        } catch {
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
        if (e.key === 'Enter') handlePriceSave(bookingId);
        else if (e.key === 'Escape') { setEditingPrice(null); setPriceValue(''); }
    };

    const handlePriceSave = (bookingId: number) => {
        const newPrice = priceValue === '' ? null : parseFloat(priceValue);
        if (priceValue !== '' && (isNaN(newPrice!) || newPrice! < 0)) {
            setError("Price must be a positive number or empty for no charge");
            return;
        }
        updatePrice(bookingId, newPrice);
    };

    // Filter helpers
    const uniqueClients = useMemo(() => Array.from(new Set(bookings.map(b => b.owner_name))).sort(), [bookings]);
    const uniqueServices = useMemo(() => Array.from(new Set(bookings.map(b => b.service_type))).sort(), [bookings]);
    const uniqueStatuses = useMemo(() => Array.from(new Set(bookings.map(b => b.status))), [bookings]);

    const filteredBookings = useMemo(() => {
        return bookings.filter(booking => {
            if (filterClient && booking.owner_name !== filterClient) return false;
            if (filterDateFrom) {
                const fromDate = new Date(filterDateFrom); fromDate.setHours(0, 0, 0, 0);
                if (new Date(booking.start_time) < fromDate) return false;
            }
            if (filterDateTo) {
                const toDate = new Date(filterDateTo); toDate.setHours(23, 59, 59, 999);
                if (new Date(booking.start_time) > toDate) return false;
            }
            if (filterService && booking.service_type !== filterService) return false;
            if (filterStatus && booking.status !== filterStatus) return false;
            if (filterBookingType === 'single' && booking.series_id) return false;
            if (filterBookingType === 'recurring' && !booking.series_id) return false;
            return true;
        });
    }, [bookings, filterClient, filterDateFrom, filterDateTo, filterService, filterStatus, filterBookingType]);

    const clearFilters = () => {
        setFilterClient(''); setFilterDateFrom(''); setFilterDateTo('');
        setFilterService(''); setFilterStatus(''); setFilterBookingType('');
    };

    const hasActiveFilters = filterClient || filterDateFrom || filterDateTo || filterService || filterStatus || filterBookingType;

    const now = new Date();
    const upcomingBookings = filteredBookings
        .filter(b => new Date(b.start_time) >= now)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    const pastBookings = filteredBookings
        .filter(b => new Date(b.start_time) < now)
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    // --- Render Cells ---

    const renderPriceCell = (booking: EditableBooking) => {
        if (updatingPrice === booking.id) {
            return <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Saving...</div>;
        }
        if (editingPrice === booking.id) {
            return (
                <input
                    type="number"
                    value={priceValue}
                    onChange={(e) => setPriceValue(e.target.value)}
                    onBlur={() => handlePriceSave(booking.id)}
                    onKeyDown={(e) => handlePriceKeyDown(e, booking.id)}
                    placeholder="Enter price"
                    autoFocus
                    style={{ width: "100px", padding: "4px 8px", backgroundColor: "#111827", color: "#fff", border: "1px solid #3b82f6", borderRadius: "4px", fontFamily: "monospace", fontSize: "0.875rem" }}
                />
            );
        }
        return (
            <span
                onClick={() => handlePriceClick(booking.id, booking.price_pounds)}
                style={{ cursor: "pointer", padding: "4px 8px", borderRadius: "4px", border: "1px solid transparent", fontFamily: "monospace", transition: "background-color 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#374151"; e.currentTarget.style.borderColor = "#6b7280"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
            >
                {formatPrice(booking.price_pounds)}
            </span>
        );
    };

    const renderStatusCell = (booking: EditableBooking) => (
        <span style={{
            padding: "4px 10px",
            backgroundColor: getStatusColor(booking.status),
            color: "#fff",
            borderRadius: "12px",
            fontSize: "0.8rem",
            fontWeight: "bold",
            whiteSpace: "nowrap",
        }}>
            {getStatusDisplayName(booking.status)}
        </span>
    );

    const renderActionsCell = (booking: EditableBooking) => (
        <select
            defaultValue=""
            onChange={(e) => { handleActionSelect(booking, e.target.value); e.target.value = ""; }}
            style={{
                padding: "6px 10px",
                backgroundColor: "#374151",
                color: "#d1d5db",
                border: "1px solid #4b5563",
                borderRadius: "6px",
                fontSize: "0.875rem",
                cursor: "pointer",
                minWidth: "130px",
            }}
        >
            <option value="" disabled>— Actions —</option>
            <option value="reschedule">Reschedule</option>
            <option value="modify-dogs">Modify Dogs</option>
            <option value="modify-address">Modify Pickup Address</option>
            <option disabled>──────────────</option>
            <option value="mark-completed">Mark as Completed</option>
            <option value="mark-confirmed">Mark as Confirmed</option>
            <option value="mark-no-show">Mark as No-Show</option>
            <option value="cancel">Cancel Booking</option>
        </select>
    );

    const renderBookingSection = (title: string, bookingList: EditableBooking[], sectionColor: string) => (
        <div style={{ marginBottom: "32px" }}>
            <h2 style={{ color: sectionColor, fontSize: "1.3rem", fontWeight: "bold", marginBottom: "16px", borderBottom: `2px solid ${sectionColor}`, paddingBottom: "8px" }}>
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
                                <th style={styles.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookingList.map((booking) => (
                                <tr key={booking.id}>
                                    <td style={styles.td}>{formatDate(booking.start_time)}</td>
                                    <td style={styles.td}>
                                        <div style={{ fontWeight: "bold" }}>{booking.owner_name}</div>
                                        <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>{booking.phone}</div>
                                    </td>
                                    <td style={styles.td}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {getServiceDisplayName(booking.service_type)}
                                            {booking.series_id && (
                                                <span style={{ backgroundColor: '#7c3aed', color: '#fff', fontSize: '0.6rem', fontWeight: '600', padding: '2px 4px', borderRadius: '3px', textTransform: 'uppercase' }}>
                                                    #{booking.series_id}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
                                            {booking.duration_minutes} min
                                            {booking.series_index && <span style={{ marginLeft: '8px', color: '#a78bfa' }}>({booking.series_index} of series)</span>}
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        {Array.isArray(booking.dog_names) ? booking.dog_names.join(", ") : "Unknown"}
                                    </td>
                                    <td style={{ ...styles.td, ...styles.priceCell }}>
                                        {renderPriceCell(booking)}
                                    </td>
                                    <td style={styles.td}>{renderStatusCell(booking)}</td>
                                    <td style={styles.td}>{renderActionsCell(booking)}</td>
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

    // Booking summary for modal headers
    const bookingSummary = (booking: EditableBooking) => (
        <div style={{ marginBottom: "20px", padding: "12px", backgroundColor: "#374151", borderRadius: "6px" }}>
            <div style={{ color: "#d1d5db", marginBottom: "4px" }}>
                <strong>{booking.owner_name}</strong> — {booking.dog_names.join(", ")}
            </div>
            <div style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
                {getServiceDisplayName(booking.service_type)} ({booking.duration_minutes} min)
            </div>
            <div style={{ color: "#9ca3af", fontSize: "0.875rem", marginTop: "4px" }}>
                {formatDate(booking.start_time)}
            </div>
        </div>
    );

    // Styles
    const styles = {
        container: { maxWidth: "1200px", margin: "0 auto" } as React.CSSProperties,
        header: { marginBottom: "32px" } as React.CSSProperties,
        title: { fontSize: "1.8rem", fontWeight: "bold", color: "#d1d5db", marginBottom: "8px" } as React.CSSProperties,
        subtitle: { color: "#9ca3af", fontSize: "1rem" } as React.CSSProperties,
        backButton: { display: "inline-block", padding: "12px 24px", backgroundColor: "#6b7280", color: "#fff", textDecoration: "none", borderRadius: "6px", fontWeight: "bold", marginBottom: "24px" } as React.CSSProperties,
        loading: { textAlign: "center", padding: "40px", color: "#9ca3af" } as React.CSSProperties,
        error: { color: "#ef4444", backgroundColor: "#1f2937", border: "1px solid #ef4444", borderRadius: "8px", padding: "16px", textAlign: "center", marginBottom: "24px" } as React.CSSProperties,
        tableContainer: { backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", overflow: "auto" } as React.CSSProperties,
        table: { width: "100%", borderCollapse: "collapse" } as React.CSSProperties,
        th: { backgroundColor: "#374151", padding: "16px", textAlign: "left", fontWeight: "bold", color: "#d1d5db", borderBottom: "1px solid #4b5563" } as React.CSSProperties,
        td: { padding: "16px", borderBottom: "1px solid #374151", color: "#d1d5db" } as React.CSSProperties,
        priceCell: { fontFamily: "monospace", fontWeight: "bold" } as React.CSSProperties,
        noData: { textAlign: "center", padding: "40px", color: "#9ca3af" } as React.CSSProperties,
        stats: { backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", padding: "16px", marginBottom: "24px", textAlign: "center", color: "#d1d5db" } as React.CSSProperties,
        helpText: { backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", padding: "16px", marginBottom: "24px", color: "#9ca3af", fontSize: "0.875rem" } as React.CSSProperties,
        filterBar: { backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", padding: "16px", marginBottom: "24px" } as React.CSSProperties,
        filterRow: { display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "flex-end" } as React.CSSProperties,
        filterGroup: { display: "flex", flexDirection: "column", minWidth: "150px" } as React.CSSProperties,
        filterLabel: { color: "#9ca3af", fontSize: "0.75rem", marginBottom: "4px", fontWeight: "bold" } as React.CSSProperties,
        filterSelect: { padding: "8px 12px", backgroundColor: "#374151", color: "#d1d5db", border: "1px solid #4b5563", borderRadius: "6px", fontSize: "0.875rem", cursor: "pointer" } as React.CSSProperties,
        filterInput: { padding: "8px 12px", backgroundColor: "#374151", color: "#d1d5db", border: "1px solid #4b5563", borderRadius: "6px", fontSize: "0.875rem" } as React.CSSProperties,
        clearButton: { padding: "8px 16px", backgroundColor: "#ef4444", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.875rem", fontWeight: "bold", cursor: "pointer" } as React.CSSProperties,
        modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 } as React.CSSProperties,
        modal: { backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", padding: "24px", maxWidth: "500px", width: "90%", maxHeight: "90vh", overflow: "auto" } as React.CSSProperties,
        modalTitle: { fontSize: "1.5rem", fontWeight: "bold", color: "#d1d5db", marginBottom: "20px" } as React.CSSProperties,
        modalLabel: { display: "block", color: "#d1d5db", fontSize: "0.875rem", fontWeight: "500", marginBottom: "6px" } as React.CSSProperties,
        modalInput: { width: "100%", padding: "10px", backgroundColor: "#111827", color: "#fff", border: "1px solid #374151", borderRadius: "6px", fontSize: "1rem" } as React.CSSProperties,
        modalSelect: { width: "100%", padding: "10px", backgroundColor: "#111827", color: "#fff", border: "1px solid #374151", borderRadius: "6px", fontSize: "1rem", cursor: "pointer" } as React.CSSProperties,
        modalButton: { padding: "10px 20px", border: "none", borderRadius: "6px", fontSize: "1rem", fontWeight: "600", cursor: "pointer", color: "#fff" } as React.CSSProperties,
    };

    if (loading) {
        return <div style={styles.container}><div style={styles.loading}>Loading bookings...</div></div>;
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <Link href="/dog-walking/admin" style={styles.backButton}>← Back to Admin Dashboard</Link>
                <h1 style={styles.title}>Manage Bookings</h1>
                <p style={styles.subtitle}>Edit prices and manage all booking actions</p>
            </div>

            {/* Error Display */}
            {error && (
                <div style={styles.error}>
                    {error}
                    <button onClick={() => setError(null)} style={{ marginLeft: "16px", padding: "4px 8px", backgroundColor: "transparent", border: "1px solid #ef4444", color: "#ef4444", borderRadius: "4px", cursor: "pointer" }}>
                        Clear
                    </button>
                </div>
            )}

            {/* Help Text */}
            <div style={styles.helpText}>
                <strong>How to use:</strong> Click a price to edit inline. Use the <strong>Actions</strong> dropdown for reschedule, modify dogs/address, status changes and cancellation. "No Show" automatically emails the customer.
            </div>

            {/* Filter Bar */}
            <div style={styles.filterBar}>
                <div style={styles.filterRow}>
                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>Client</label>
                        <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} style={styles.filterSelect}>
                            <option value="">All Clients</option>
                            {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>From Date</label>
                        <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} style={styles.filterInput} />
                    </div>
                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>To Date</label>
                        <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} style={styles.filterInput} />
                    </div>
                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>Service</label>
                        <select value={filterService} onChange={(e) => setFilterService(e.target.value)} style={styles.filterSelect}>
                            <option value="">All Services</option>
                            {uniqueServices.map(s => <option key={s} value={s}>{getServiceDisplayName(s)}</option>)}
                        </select>
                    </div>
                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>Status</label>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.filterSelect}>
                            <option value="">All Statuses</option>
                            {uniqueStatuses.map(s => <option key={s} value={s}>{getStatusDisplayName(s)}</option>)}
                        </select>
                    </div>
                    <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>Type</label>
                        <select value={filterBookingType} onChange={(e) => setFilterBookingType(e.target.value)} style={styles.filterSelect}>
                            <option value="">All Types</option>
                            <option value="single">Single</option>
                            <option value="recurring">Recurring</option>
                        </select>
                    </div>
                    {hasActiveFilters && (
                        <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>&nbsp;</label>
                            <button onClick={clearFilters} style={styles.clearButton}>Clear Filters</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div style={styles.stats}>
                {hasActiveFilters ? (
                    <><strong>{filteredBookings.length}</strong> of <strong>{bookings.length}</strong> bookings shown <span style={{ color: "#9ca3af", marginLeft: "16px" }}>({upcomingBookings.length} upcoming, {pastBookings.length} past)</span></>
                ) : (
                    <><strong>{bookings.length}</strong> editable booking{bookings.length !== 1 ? 's' : ''} found <span style={{ color: "#9ca3af", marginLeft: "16px" }}>({upcomingBookings.length} upcoming, {pastBookings.length} past)</span></>
                )}
            </div>

            {/* Booking Tables */}
            {filteredBookings.length > 0 ? (
                <div>
                    {renderBookingSection("📅 Upcoming Bookings", upcomingBookings, "#3b82f6")}
                    {renderBookingSection("📋 Past Bookings", pastBookings, "#6b7280")}
                </div>
            ) : hasActiveFilters ? (
                <div style={styles.noData}>No bookings match your filters. Try adjusting or clearing the filters.</div>
            ) : (
                <div style={styles.noData}>No editable bookings found. All bookings are completed & paid.</div>
            )}

            {/* ─── MODALS ─── */}

            {/* Reschedule Modal */}
            {activeModal === 'reschedule' && actionBooking && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <h2 style={styles.modalTitle}>Reschedule Booking</h2>
                        {bookingSummary(actionBooking)}
                        {modalError && <div style={{ color: "#ef4444", marginBottom: "16px", fontSize: "0.875rem" }}>{modalError}</div>}
                        <div style={{ marginBottom: "16px" }}>
                            <label style={styles.modalLabel}>New Date</label>
                            <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} style={styles.modalInput} />
                        </div>
                        <div style={{ marginBottom: "24px" }}>
                            <label style={styles.modalLabel}>New Time</label>
                            <input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} style={styles.modalInput} />
                        </div>
                        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                            <button onClick={closeModal} disabled={modalLoading} style={{ ...styles.modalButton, backgroundColor: "#6b7280", opacity: modalLoading ? 0.5 : 1 }}>Cancel</button>
                            <button onClick={handleRescheduleSubmit} disabled={modalLoading} style={{ ...styles.modalButton, backgroundColor: "#3b82f6", opacity: modalLoading ? 0.5 : 1 }}>
                                {modalLoading ? "Rescheduling..." : "Confirm Reschedule"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Modal */}
            {activeModal === 'cancel' && actionBooking && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <h2 style={styles.modalTitle}>Cancel Booking</h2>
                        {bookingSummary(actionBooking)}
                        <p style={{ color: "#fca5a5", marginBottom: "24px", fontSize: "0.9rem" }}>
                            This will cancel the booking, delete the calendar event, and send a cancellation email to the customer.
                        </p>
                        {modalError && <div style={{ color: "#ef4444", marginBottom: "16px", fontSize: "0.875rem" }}>{modalError}</div>}
                        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                            <button onClick={closeModal} disabled={modalLoading} style={{ ...styles.modalButton, backgroundColor: "#6b7280", opacity: modalLoading ? 0.5 : 1 }}>Keep Booking</button>
                            <button onClick={handleCancelSubmit} disabled={modalLoading} style={{ ...styles.modalButton, backgroundColor: "#dc2626", opacity: modalLoading ? 0.5 : 1 }}>
                                {modalLoading ? "Cancelling..." : "Confirm Cancel"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modify Dogs Modal */}
            {activeModal === 'modify-dogs' && actionBooking && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <h2 style={styles.modalTitle}>Modify Dogs</h2>
                        {bookingSummary(actionBooking)}
                        {modalError && <div style={{ color: "#ef4444", marginBottom: "16px", fontSize: "0.875rem" }}>{modalError}</div>}
                        {loadingDogs ? (
                            <div style={{ color: "#9ca3af", marginBottom: "16px" }}>Loading dogs...</div>
                        ) : (
                            <>
                                <div style={{ marginBottom: "16px" }}>
                                    <label style={styles.modalLabel}>Dog 1 (required)</label>
                                    <select value={modifyDogId1} onChange={(e) => setModifyDogId1(e.target.value)} style={styles.modalSelect}>
                                        <option value="">— Select dog —</option>
                                        {ownerDogs.map(d => <option key={d.id} value={d.id}>{d.dog_name}</option>)}
                                    </select>
                                </div>
                                <div style={{ marginBottom: "24px" }}>
                                    <label style={styles.modalLabel}>Dog 2 (optional)</label>
                                    <select value={modifyDogId2} onChange={(e) => setModifyDogId2(e.target.value)} style={styles.modalSelect}>
                                        <option value="">— None —</option>
                                        {ownerDogs.filter(d => d.id.toString() !== modifyDogId1).map(d => <option key={d.id} value={d.id}>{d.dog_name}</option>)}
                                    </select>
                                </div>
                            </>
                        )}
                        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                            <button onClick={closeModal} disabled={modalLoading} style={{ ...styles.modalButton, backgroundColor: "#6b7280", opacity: modalLoading ? 0.5 : 1 }}>Cancel</button>
                            <button onClick={handleModifyDogsSubmit} disabled={modalLoading || loadingDogs} style={{ ...styles.modalButton, backgroundColor: "#3b82f6", opacity: (modalLoading || loadingDogs) ? 0.5 : 1 }}>
                                {modalLoading ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modify Pickup Address Modal */}
            {activeModal === 'modify-address' && actionBooking && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <h2 style={styles.modalTitle}>Modify Pickup Address</h2>
                        {bookingSummary(actionBooking)}
                        {modalError && <div style={{ color: "#ef4444", marginBottom: "16px", fontSize: "0.875rem" }}>{modalError}</div>}
                        {loadingAddresses ? (
                            <div style={{ color: "#9ca3af", marginBottom: "16px" }}>Loading addresses...</div>
                        ) : (
                            <div style={{ marginBottom: "24px" }}>
                                <label style={styles.modalLabel}>Pickup Address</label>
                                <select value={modifyAddressId} onChange={(e) => setModifyAddressId(e.target.value)} style={styles.modalSelect}>
                                    <option value="">Primary Address (default)</option>
                                    {ownerAddresses.map(a => (
                                        <option key={a.id} value={a.id}>{a.address_label} — {a.address}</option>
                                    ))}
                                </select>
                                {ownerAddresses.length === 0 && (
                                    <p style={{ color: "#9ca3af", fontSize: "0.8rem", marginTop: "8px" }}>No secondary addresses on file for this owner.</p>
                                )}
                            </div>
                        )}
                        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                            <button onClick={closeModal} disabled={modalLoading} style={{ ...styles.modalButton, backgroundColor: "#6b7280", opacity: modalLoading ? 0.5 : 1 }}>Cancel</button>
                            <button onClick={handleModifyAddressSubmit} disabled={modalLoading || loadingAddresses} style={{ ...styles.modalButton, backgroundColor: "#3b82f6", opacity: (modalLoading || loadingAddresses) ? 0.5 : 1 }}>
                                {modalLoading ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mark as Completed Modal */}
            {activeModal === 'mark-completed' && actionBooking && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <h2 style={styles.modalTitle}>Mark as Completed</h2>
                        {bookingSummary(actionBooking)}
                        {modalError && <div style={{ color: "#ef4444", marginBottom: "16px", fontSize: "0.875rem" }}>{modalError}</div>}
                        <div style={{ marginBottom: "24px" }}>
                            <label style={styles.modalLabel}>Walk Summary (optional)</label>
                            <textarea
                                value={walkSummary}
                                onChange={(e) => setWalkSummary(e.target.value)}
                                placeholder="How did the walk go? (shown to customer in their dashboard)"
                                rows={3}
                                style={{ ...styles.modalInput, resize: "vertical" }}
                            />
                        </div>
                        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                            <button onClick={closeModal} disabled={modalLoading} style={{ ...styles.modalButton, backgroundColor: "#6b7280", opacity: modalLoading ? 0.5 : 1 }}>Cancel</button>
                            <button onClick={handleMarkCompletedSubmit} disabled={modalLoading} style={{ ...styles.modalButton, backgroundColor: "#059669", opacity: modalLoading ? 0.5 : 1 }}>
                                {modalLoading ? "Saving..." : "Mark Completed"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mark as Confirmed Modal */}
            {activeModal === 'mark-confirmed' && actionBooking && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <h2 style={styles.modalTitle}>Mark as Confirmed</h2>
                        {bookingSummary(actionBooking)}
                        <p style={{ color: "#d1d5db", marginBottom: "24px", fontSize: "0.9rem" }}>
                            Revert this booking back to confirmed status?
                        </p>
                        {modalError && <div style={{ color: "#ef4444", marginBottom: "16px", fontSize: "0.875rem" }}>{modalError}</div>}
                        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                            <button onClick={closeModal} disabled={modalLoading} style={{ ...styles.modalButton, backgroundColor: "#6b7280", opacity: modalLoading ? 0.5 : 1 }}>Cancel</button>
                            <button onClick={() => handleStatusUpdate('confirmed')} disabled={modalLoading} style={{ ...styles.modalButton, backgroundColor: "#3b82f6", opacity: modalLoading ? 0.5 : 1 }}>
                                {modalLoading ? "Saving..." : "Mark as Confirmed"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mark as No-Show Modal */}
            {activeModal === 'mark-no-show' && actionBooking && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <h2 style={styles.modalTitle}>Mark as No-Show</h2>
                        {bookingSummary(actionBooking)}
                        <p style={{ color: "#fcd34d", marginBottom: "24px", fontSize: "0.9rem" }}>
                            A missed appointment email will be sent to <strong>{actionBooking.owner_name}</strong>.
                        </p>
                        {modalError && <div style={{ color: "#ef4444", marginBottom: "16px", fontSize: "0.875rem" }}>{modalError}</div>}
                        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                            <button onClick={closeModal} disabled={modalLoading} style={{ ...styles.modalButton, backgroundColor: "#6b7280", opacity: modalLoading ? 0.5 : 1 }}>Cancel</button>
                            <button onClick={() => handleStatusUpdate('no_show')} disabled={modalLoading} style={{ ...styles.modalButton, backgroundColor: "#f59e0b", opacity: modalLoading ? 0.5 : 1 }}>
                                {modalLoading ? "Saving..." : "Mark as No-Show"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
