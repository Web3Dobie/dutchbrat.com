"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addWeeks, format } from "date-fns";
import RecurringBookingForm from "@/app/components/RecurringBookingForm";
import RecurringAvailabilityGrid from "@/app/components/RecurringAvailabilityGrid";

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
}

interface AvailableDate {
    date: string;
    displayDate: string;
    time: string;
    status: 'available';
}

interface ConflictingDate {
    date: string;
    displayDate: string;
    requestedTime: string;
    status: 'conflict';
    reason: string;
    alternatives: Array<{ time: string; displayTime: string }>;
}

interface BlockedDate {
    date: string;
    displayDate: string;
    status: 'blocked';
    reason: string;
}

interface RecurrenceConfig {
    pattern: 'weekly' | 'biweekly' | 'custom';
    days_of_week: number[];
    preferred_time: string;
    weeks_ahead: number;
    start_date: string;
}

interface BookingConfig {
    dog_id_1: number;
    dog_id_2?: number;
    service_type: string;
    duration_minutes: number;
    recurrence: RecurrenceConfig;
}

type Step = 'config' | 'review' | 'success';

export default function BookRecurringPage() {
    const router = useRouter();

    // Auth state
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    // Booking flow state
    const [step, setStep] = useState<Step>('config');
    const [bookingConfig, setBookingConfig] = useState<BookingConfig | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Availability data
    const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
    const [conflictingDates, setConflictingDates] = useState<ConflictingDate[]>([]);
    const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);

    // Success data
    const [bookingResult, setBookingResult] = useState<{
        series_id: number;
        bookings_created: number;
        total_price: number | null;
    } | null>(null);

    // Check session on mount
    useEffect(() => {
        checkSession();
    }, []);

    async function checkSession() {
        try {
            const response = await fetch('/api/dog-walking/customer-session');
            const data = await response.json();

            if (data.authenticated && data.customer) {
                setCustomer(data.customer);
            } else {
                // Redirect to login
                router.push('/my-account');
            }
        } catch (err) {
            console.error('Session check failed:', err);
            router.push('/my-account');
        } finally {
            setIsCheckingSession(false);
        }
    }

    async function handleConfigSubmit(config: BookingConfig) {
        if (!customer) return;

        setIsLoading(true);
        setError(null);
        setBookingConfig(config);

        try {
            const response = await fetch('/api/dog-walking/recurring/check-availability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    owner_id: customer.owner_id,
                    service_type: config.service_type,
                    duration_minutes: config.duration_minutes,
                    recurrence_pattern: config.recurrence.pattern,
                    days_of_week: config.recurrence.days_of_week,
                    preferred_time: config.recurrence.preferred_time,
                    start_date: config.recurrence.start_date,
                    weeks_ahead: config.recurrence.weeks_ahead,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to check availability');
            }

            setAvailableDates(data.available_dates || []);
            setConflictingDates(data.conflicting_dates || []);
            setBlockedDates(data.blocked_dates || []);
            setStep('review');

        } catch (err: any) {
            setError(err.message || 'Failed to check availability');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleConfirmBookings(
        confirmed: Array<{ date: string; displayDate: string; time: string }>,
        skipped: Array<{ date: string; displayDate: string; reason: string }>
    ) {
        if (!customer || !bookingConfig) return;

        setIsLoading(true);
        setError(null);

        try {
            const endDate = addWeeks(
                new Date(bookingConfig.recurrence.start_date),
                bookingConfig.recurrence.weeks_ahead
            );

            const response = await fetch('/api/dog-walking/recurring/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    owner_id: customer.owner_id,
                    dog_id_1: bookingConfig.dog_id_1,
                    dog_id_2: bookingConfig.dog_id_2,
                    service_type: bookingConfig.service_type,
                    duration_minutes: bookingConfig.duration_minutes,
                    recurrence_pattern: bookingConfig.recurrence.pattern,
                    days_of_week: bookingConfig.recurrence.days_of_week,
                    preferred_time: bookingConfig.recurrence.preferred_time,
                    start_date: bookingConfig.recurrence.start_date,
                    end_date: format(endDate, 'yyyy-MM-dd'),
                    confirmed_dates: confirmed.map(c => ({ date: c.date, time: c.time })),
                    skipped_dates: skipped,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create bookings');
            }

            setBookingResult({
                series_id: data.series_id,
                bookings_created: data.bookings_created,
                total_price: data.total_price,
            });
            setStep('success');

        } catch (err: any) {
            setError(err.message || 'Failed to create bookings');
        } finally {
            setIsLoading(false);
        }
    }

    // Styles
    const styles = {
        container: {
            minHeight: "100vh",
            backgroundColor: "#0f172a",
            padding: "20px",
        } as React.CSSProperties,
        content: {
            maxWidth: "800px",
            margin: "0 auto",
        } as React.CSSProperties,
        header: {
            marginBottom: "24px",
            borderBottom: "1px solid #374151",
            paddingBottom: "16px",
        } as React.CSSProperties,
        backLink: {
            color: "#60a5fa",
            textDecoration: "none",
            fontSize: "0.875rem",
            display: "inline-block",
            marginBottom: "12px",
        } as React.CSSProperties,
        title: {
            color: "#fff",
            fontSize: "1.5rem",
            fontWeight: "bold",
            margin: "0 0 8px 0",
        } as React.CSSProperties,
        subtitle: {
            color: "#9ca3af",
            fontSize: "0.875rem",
            margin: 0,
        } as React.CSSProperties,
        errorBox: {
            backgroundColor: "#7f1d1d",
            border: "1px solid #dc2626",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "20px",
            color: "#fecaca",
        } as React.CSSProperties,
        successBox: {
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "32px",
            textAlign: "center",
        } as React.CSSProperties,
        successIcon: {
            fontSize: "4rem",
            marginBottom: "16px",
        } as React.CSSProperties,
        button: {
            display: "inline-block",
            padding: "12px 24px",
            backgroundColor: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: "600",
            textDecoration: "none",
            cursor: "pointer",
            marginTop: "20px",
        } as React.CSSProperties,
    };

    if (isCheckingSession) {
        return (
            <div style={styles.container}>
                <div style={styles.content}>
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                        Loading...
                    </div>
                </div>
            </div>
        );
    }

    if (!customer) {
        return null; // Will redirect
    }

    return (
        <div style={styles.container}>
            <div style={styles.content}>
                {/* Header */}
                <div style={styles.header}>
                    <a href="/my-account" style={styles.backLink}>
                        &larr; Back to Dashboard
                    </a>
                    <h1 style={styles.title}>Book Recurring Walks</h1>
                    <p style={styles.subtitle}>
                        Schedule regular dog walking appointments up to 12 weeks in advance
                    </p>
                </div>

                {/* Error Display */}
                {error && (
                    <div style={styles.errorBox}>
                        <strong>Error:</strong> {error}
                        <button
                            onClick={() => setError(null)}
                            style={{
                                float: 'right',
                                background: 'none',
                                border: 'none',
                                color: '#fecaca',
                                cursor: 'pointer',
                            }}
                        >
                            &times;
                        </button>
                    </div>
                )}

                {/* Step: Configuration */}
                {step === 'config' && (
                    <RecurringBookingForm
                        dogs={customer.dogs}
                        onSubmit={handleConfigSubmit}
                        isLoading={isLoading}
                    />
                )}

                {/* Step: Review Availability */}
                {step === 'review' && (
                    <RecurringAvailabilityGrid
                        availableDates={availableDates}
                        conflictingDates={conflictingDates}
                        blockedDates={blockedDates}
                        onConfirm={handleConfirmBookings}
                        onBack={() => setStep('config')}
                        isLoading={isLoading}
                    />
                )}

                {/* Step: Success */}
                {step === 'success' && bookingResult && (
                    <div style={styles.successBox}>
                        <div style={styles.successIcon}>&#10003;</div>
                        <h2 style={{ color: '#10b981', margin: '0 0 16px 0' }}>
                            Recurring Booking Created!
                        </h2>
                        <p style={{ color: '#d1d5db', margin: '0 0 12px 0' }}>
                            We've scheduled <strong>{bookingResult.bookings_created}</strong> walks for you.
                        </p>
                        {bookingResult.total_price && (
                            <p style={{ color: '#10b981', fontSize: '1.25rem', margin: '0 0 12px 0' }}>
                                Total: £{bookingResult.total_price.toFixed(2)}
                            </p>
                        )}
                        <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0 0 8px 0' }}>
                            Series Reference: #{bookingResult.series_id}
                        </p>
                        <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                            A confirmation email has been sent with all the details.
                        </p>
                        <a href="/my-account" style={styles.button}>
                            Return to Dashboard
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
