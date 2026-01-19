"use client";

import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";

// Revenue-specific currency formatter (always shows £, unlike formatCurrency which shows "FREE" for £0)
const formatCurrency = (amount: number): string => `£${amount.toFixed(2)}`;

interface Client {
    id: number;
    owner_name: string;
    phone: string;
}

interface RevenueSummary {
    all_time_revenue: number;
    all_time_bookings: number;
    year_to_date_revenue: number;
    year_to_date_bookings: number;
    monthly_revenue: number;
    monthly_bookings: number;
    outstanding_balance: number;
    outstanding_bookings: number;
}

interface YearData {
    year: number;
    total_revenue: number;
    booking_count: number;
}

interface MonthData {
    year: number;
    month: number;
    month_name: string;
    total_revenue: number;
    booking_count: number;
}

interface CustomerData {
    owner_id: number;
    owner_name: string;
    total_revenue: number;
    booking_count: number;
}

interface BookingData {
    booking_id: number;
    start_time: string;
    service_type: string;
    duration_minutes: number | null;
    price_pounds: number;
    dog_names: string[];
}

interface RevenueData {
    summary: RevenueSummary;
    by_year: YearData[];
    by_month: MonthData[];
    by_customer: CustomerData[];
    bookings: BookingData[];
    available_years: number[];
}

export default function RevenueDashboard() {
    const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingClients, setIsLoadingClients] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter states
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

    // Get available years from data (unfiltered list for dropdown)
    const availableYears = revenueData?.available_years || [];

    useEffect(() => {
        fetchClients();
    }, []);

    useEffect(() => {
        fetchRevenueData();
    }, [selectedCustomerId, selectedYear, selectedMonth]);

    const fetchClients = async () => {
        setIsLoadingClients(true);
        try {
            const response = await fetch("/api/dog-walking/admin/clients", {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error("Failed to fetch clients");
            }

            const data = await response.json();
            setClients(data.clients || []);
        } catch (err: any) {
            console.error("Failed to fetch clients:", err.message);
        } finally {
            setIsLoadingClients(false);
        }
    };

    const fetchRevenueData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (selectedCustomerId) params.append("customer_id", selectedCustomerId.toString());
            if (selectedYear) params.append("year", selectedYear.toString());
            if (selectedMonth) params.append("month", selectedMonth.toString());

            const response = await fetch(`/api/dog-walking/admin/revenue?${params.toString()}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error("Failed to fetch revenue data");
            }

            const data = await response.json();
            setRevenueData(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCustomerChange = (value: string) => {
        setSelectedCustomerId(value ? parseInt(value) : null);
    };

    const handleYearChange = (value: string) => {
        setSelectedYear(value ? parseInt(value) : null);
        // Reset month when year changes if "All Years" is selected
        if (!value) {
            setSelectedMonth(null);
        }
    };

    const handleMonthChange = (value: string) => {
        setSelectedMonth(value ? parseInt(value) : null);
    };

    const months = [
        { value: 1, name: "January" },
        { value: 2, name: "February" },
        { value: 3, name: "March" },
        { value: 4, name: "April" },
        { value: 5, name: "May" },
        { value: 6, name: "June" },
        { value: 7, name: "July" },
        { value: 8, name: "August" },
        { value: 9, name: "September" },
        { value: 10, name: "October" },
        { value: 11, name: "November" },
        { value: 12, name: "December" },
    ];

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
        subtitle: {
            color: "#9ca3af",
        } as React.CSSProperties,
        filterSection: {
            backgroundColor: "#1f2937",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #374151",
            marginBottom: "24px",
        } as React.CSSProperties,
        filterGrid: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
        } as React.CSSProperties,
        filterGroup: {
            display: "flex",
            flexDirection: "column",
            gap: "8px",
        } as React.CSSProperties,
        label: {
            color: "#d1d5db",
            fontWeight: "600",
            fontSize: "0.9rem",
        } as React.CSSProperties,
        select: {
            padding: "10px 12px",
            borderRadius: "6px",
            border: "1px solid #374151",
            backgroundColor: "#111827",
            color: "#fff",
            fontSize: "1rem",
            cursor: "pointer",
        } as React.CSSProperties,
        statsGrid: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "16px",
            marginBottom: "32px",
        } as React.CSSProperties,
        statCard: {
            backgroundColor: "#1f2937",
            padding: "24px",
            borderRadius: "8px",
            border: "1px solid #374151",
        } as React.CSSProperties,
        statValue: {
            fontSize: "2rem",
            fontWeight: "bold",
            color: "#10b981",
            marginBottom: "4px",
        } as React.CSSProperties,
        statLabel: {
            color: "#9ca3af",
            fontSize: "1rem",
        } as React.CSSProperties,
        statBookings: {
            color: "#6b7280",
            fontSize: "0.85rem",
            marginTop: "4px",
        } as React.CSSProperties,
        section: {
            backgroundColor: "#1f2937",
            borderRadius: "8px",
            border: "1px solid #374151",
            marginBottom: "24px",
            overflow: "hidden",
        } as React.CSSProperties,
        sectionTitle: {
            padding: "16px 20px",
            borderBottom: "1px solid #374151",
            fontWeight: "bold",
            fontSize: "1.1rem",
            color: "#d1d5db",
        } as React.CSSProperties,
        table: {
            width: "100%",
            borderCollapse: "collapse",
        } as React.CSSProperties,
        th: {
            backgroundColor: "#374151",
            padding: "12px 16px",
            textAlign: "left",
            fontWeight: "bold",
            borderBottom: "1px solid #4b5563",
            color: "#d1d5db",
        } as React.CSSProperties,
        td: {
            padding: "12px 16px",
            borderBottom: "1px solid #374151",
        } as React.CSSProperties,
        revenueValue: {
            fontWeight: "bold",
            color: "#10b981",
        } as React.CSSProperties,
        error: {
            color: "#ef4444",
            backgroundColor: "#1f2937",
            border: "1px solid #ef4444",
            borderRadius: "4px",
            padding: "12px",
            marginBottom: "16px",
        } as React.CSSProperties,
        loading: {
            textAlign: "center",
            padding: "40px",
            color: "#9ca3af",
        } as React.CSSProperties,
        emptyState: {
            textAlign: "center",
            padding: "24px",
            color: "#9ca3af",
        } as React.CSSProperties,
    };

    if (isLoading && !revenueData) {
        return (
            <div style={styles.container}>
                <div style={styles.loading as React.CSSProperties}>
                    Loading revenue data...
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header as React.CSSProperties}>
                <h1 style={styles.title}>Revenue Dashboard</h1>
                <p style={styles.subtitle}>View revenue statistics and trends</p>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            {/* Filter Section */}
            <div style={styles.filterSection}>
                <div style={styles.filterGrid}>
                    <div style={styles.filterGroup as React.CSSProperties}>
                        <label style={styles.label}>Customer</label>
                        {isLoadingClients ? (
                            <div style={{ color: "#9ca3af", padding: "10px" }}>Loading clients...</div>
                        ) : (
                            <select
                                value={selectedCustomerId || ""}
                                onChange={(e) => handleCustomerChange(e.target.value)}
                                style={styles.select}
                            >
                                <option value="">All Customers</option>
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>
                                        {client.owner_name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div style={styles.filterGroup as React.CSSProperties}>
                        <label style={styles.label}>Year</label>
                        <select
                            value={selectedYear || ""}
                            onChange={(e) => handleYearChange(e.target.value)}
                            style={styles.select}
                        >
                            <option value="">All Years</option>
                            {availableYears.map((year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.filterGroup as React.CSSProperties}>
                        <label style={styles.label}>Month</label>
                        <select
                            value={selectedMonth || ""}
                            onChange={(e) => handleMonthChange(e.target.value)}
                            style={styles.select}
                        >
                            <option value="">All Months</option>
                            {months.map((month) => (
                                <option key={month.value} value={month.value}>
                                    {month.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Stats Cards */}
            {revenueData && (
                <div style={styles.statsGrid}>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>
                            {formatCurrency(revenueData.summary.all_time_revenue)}
                        </div>
                        <div style={styles.statLabel}>All-Time Revenue</div>
                        <div style={styles.statBookings}>
                            {revenueData.summary.all_time_bookings} bookings
                        </div>
                    </div>

                    <div style={styles.statCard}>
                        <div style={styles.statValue}>
                            {formatCurrency(revenueData.summary.year_to_date_revenue)}
                        </div>
                        <div style={styles.statLabel}>Year to Date Revenue</div>
                        <div style={styles.statBookings}>
                            {revenueData.summary.year_to_date_bookings} bookings
                        </div>
                    </div>

                    <div style={styles.statCard}>
                        <div style={styles.statValue}>
                            {formatCurrency(revenueData.summary.monthly_revenue)}
                        </div>
                        <div style={styles.statLabel}>This Month Revenue</div>
                        <div style={styles.statBookings}>
                            {revenueData.summary.monthly_bookings} bookings
                        </div>
                    </div>

                    <div style={styles.statCard}>
                        <div style={{ ...styles.statValue, color: "#ef4444" }}>
                            {formatCurrency(revenueData.summary.outstanding_balance)}
                        </div>
                        <div style={styles.statLabel}>Outstanding Balance</div>
                        <div style={styles.statBookings}>
                            {revenueData.summary.outstanding_bookings} awaiting payment
                        </div>
                    </div>
                </div>
            )}

            {/* Revenue by Year Table */}
            {revenueData && revenueData.by_year.length > 0 && (
                <div style={styles.section}>
                    <div style={styles.sectionTitle}>Revenue by Year</div>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Year</th>
                                <th style={styles.th}>Revenue</th>
                                <th style={styles.th}>Bookings</th>
                            </tr>
                        </thead>
                        <tbody>
                            {revenueData.by_year.map((row) => (
                                <tr key={row.year}>
                                    <td style={styles.td}>{row.year}</td>
                                    <td style={{ ...styles.td, ...styles.revenueValue }}>
                                        {formatCurrency(row.total_revenue)}
                                    </td>
                                    <td style={styles.td}>{row.booking_count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Monthly Breakdown Table */}
            {revenueData && revenueData.by_month.length > 0 && (
                <div style={styles.section}>
                    <div style={styles.sectionTitle}>Monthly Breakdown</div>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Year</th>
                                <th style={styles.th}>Month</th>
                                <th style={styles.th}>Revenue</th>
                                <th style={styles.th}>Bookings</th>
                            </tr>
                        </thead>
                        <tbody>
                            {revenueData.by_month.map((row) => (
                                <tr key={`${row.year}-${row.month}`}>
                                    <td style={styles.td}>{row.year}</td>
                                    <td style={styles.td}>{row.month_name}</td>
                                    <td style={{ ...styles.td, ...styles.revenueValue }}>
                                        {formatCurrency(row.total_revenue)}
                                    </td>
                                    <td style={styles.td}>{row.booking_count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Individual Bookings Table (only when a customer is selected) */}
            {revenueData && selectedCustomerId && revenueData.bookings && revenueData.bookings.length > 0 && (
                <div style={styles.section}>
                    <div style={styles.sectionTitle}>Booking Details</div>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Booking ID</th>
                                <th style={styles.th}>Date</th>
                                <th style={styles.th}>Service</th>
                                <th style={styles.th}>Duration</th>
                                <th style={styles.th}>Dogs</th>
                                <th style={styles.th}>Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {revenueData.bookings.map((booking) => (
                                <tr key={booking.booking_id}>
                                    <td style={styles.td}>#{booking.booking_id}</td>
                                    <td style={styles.td}>
                                        {format(parseISO(booking.start_time), "MMM d, yyyy")}
                                        <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                                            {format(parseISO(booking.start_time), "h:mm a")}
                                        </div>
                                    </td>
                                    <td style={styles.td}>{booking.service_type}</td>
                                    <td style={styles.td}>
                                        {booking.duration_minutes ? `${booking.duration_minutes} min` : "-"}
                                    </td>
                                    <td style={styles.td}>{booking.dog_names.join(", ") || "-"}</td>
                                    <td style={{ ...styles.td, ...styles.revenueValue }}>
                                        {formatCurrency(booking.price_pounds)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Revenue by Customer Table (only when "All Customers" is selected) */}
            {revenueData && !selectedCustomerId && revenueData.by_customer.length > 0 && (
                <div style={styles.section}>
                    <div style={styles.sectionTitle}>Revenue by Customer</div>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Customer</th>
                                <th style={styles.th}>Revenue</th>
                                <th style={styles.th}>Bookings</th>
                            </tr>
                        </thead>
                        <tbody>
                            {revenueData.by_customer.map((row) => (
                                <tr key={row.owner_id}>
                                    <td style={styles.td}>{row.owner_name}</td>
                                    <td style={{ ...styles.td, ...styles.revenueValue }}>
                                        {formatCurrency(row.total_revenue)}
                                    </td>
                                    <td style={styles.td}>{row.booking_count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Empty state */}
            {revenueData &&
             revenueData.by_year.length === 0 &&
             revenueData.by_month.length === 0 &&
             revenueData.by_customer.length === 0 &&
             (!revenueData.bookings || revenueData.bookings.length === 0) && (
                <div style={styles.emptyState as React.CSSProperties}>
                    No revenue data found for the selected filters.
                </div>
            )}
        </div>
    );
}
