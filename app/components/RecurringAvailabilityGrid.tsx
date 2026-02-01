"use client";

import React, { useState } from "react";

interface AvailableDate {
    date: string;
    displayDate: string;
    time: string;
    status: 'available';
}

interface Alternative {
    time: string;
    displayTime: string;
}

interface ConflictingDate {
    date: string;
    displayDate: string;
    requestedTime: string;
    status: 'conflict';
    reason: string;
    alternatives: Alternative[];
}

interface BlockedDate {
    date: string;
    displayDate: string;
    status: 'blocked';
    reason: string;
}

interface ConfirmedBooking {
    date: string;
    displayDate: string;
    time: string;
}

interface SkippedBooking {
    date: string;
    displayDate: string;
    reason: string;
}

interface RecurringAvailabilityGridProps {
    availableDates: AvailableDate[];
    conflictingDates: ConflictingDate[];
    blockedDates: BlockedDate[];
    onConfirm: (confirmed: ConfirmedBooking[], skipped: SkippedBooking[]) => void;
    onBack: () => void;
    isLoading?: boolean;
}

export default function RecurringAvailabilityGrid({
    availableDates,
    conflictingDates,
    blockedDates,
    onConfirm,
    onBack,
    isLoading,
}: RecurringAvailabilityGridProps) {
    // Track user choices for conflicting dates
    const [conflictChoices, setConflictChoices] = useState<Record<string, { action: 'alternative' | 'skip'; time?: string }>>({});

    const styles = {
        container: {
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "24px",
        } as React.CSSProperties,
        header: {
            marginBottom: "24px",
        } as React.CSSProperties,
        summary: {
            display: "flex",
            gap: "16px",
            marginBottom: "20px",
            flexWrap: "wrap",
        } as React.CSSProperties,
        summaryCard: {
            flex: "1",
            minWidth: "100px",
            padding: "12px 16px",
            borderRadius: "8px",
            textAlign: "center",
        } as React.CSSProperties,
        section: {
            marginBottom: "24px",
        } as React.CSSProperties,
        sectionTitle: {
            color: "#d1d5db",
            fontSize: "1rem",
            fontWeight: "600",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
        } as React.CSSProperties,
        dateCard: {
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
        } as React.CSSProperties,
        availableCard: {
            borderLeft: "4px solid #10b981",
        } as React.CSSProperties,
        conflictCard: {
            borderLeft: "4px solid #f59e0b",
        } as React.CSSProperties,
        blockedCard: {
            borderLeft: "4px solid #ef4444",
            opacity: 0.7,
        } as React.CSSProperties,
        button: {
            padding: "8px 16px",
            fontSize: "0.875rem",
            fontWeight: "600",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s",
        } as React.CSSProperties,
        primaryButton: {
            backgroundColor: "#3b82f6",
            color: "#fff",
        } as React.CSSProperties,
        secondaryButton: {
            backgroundColor: "#4b5563",
            color: "#fff",
        } as React.CSSProperties,
        skipButton: {
            backgroundColor: "#6b7280",
            color: "#fff",
        } as React.CSSProperties,
        alternativeButton: {
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            color: "#d1d5db",
            marginRight: "8px",
            marginBottom: "4px",
        } as React.CSSProperties,
        selectedAlternative: {
            backgroundColor: "#1e3a8a",
            borderColor: "#3b82f6",
            color: "#fff",
        } as React.CSSProperties,
        buttonGroup: {
            display: "flex",
            gap: "12px",
            marginTop: "24px",
        } as React.CSSProperties,
    };

    function handleAlternativeSelect(date: string, time: string) {
        setConflictChoices(prev => ({
            ...prev,
            [date]: { action: 'alternative', time },
        }));
    }

    function handleSkip(date: string) {
        setConflictChoices(prev => ({
            ...prev,
            [date]: { action: 'skip' },
        }));
    }

    function handleConfirmBookings() {
        const confirmed: ConfirmedBooking[] = [];
        const skipped: SkippedBooking[] = [];

        // Add all available dates
        for (const available of availableDates) {
            confirmed.push({
                date: available.date,
                displayDate: available.displayDate,
                time: available.time,
            });
        }

        // Process conflicting dates based on user choices
        for (const conflict of conflictingDates) {
            const choice = conflictChoices[conflict.date];
            if (choice?.action === 'alternative' && choice.time) {
                confirmed.push({
                    date: conflict.date,
                    displayDate: conflict.displayDate,
                    time: choice.time,
                });
            } else {
                skipped.push({
                    date: conflict.date,
                    displayDate: conflict.displayDate,
                    reason: choice?.action === 'skip' ? 'Skipped by user' : conflict.reason,
                });
            }
        }

        // Add blocked dates to skipped
        for (const blocked of blockedDates) {
            skipped.push({
                date: blocked.date,
                displayDate: blocked.displayDate,
                reason: blocked.reason,
            });
        }

        // Sort by date
        confirmed.sort((a, b) => a.date.localeCompare(b.date));
        skipped.sort((a, b) => a.date.localeCompare(b.date));

        onConfirm(confirmed, skipped);
    }

    // Calculate totals
    const totalAvailable = availableDates.length;
    const totalConflicts = conflictingDates.length;
    const totalBlocked = blockedDates.length;
    const totalRequested = totalAvailable + totalConflicts + totalBlocked;

    // Count resolved conflicts
    const resolvedAlternatives = Object.values(conflictChoices).filter(c => c.action === 'alternative').length;
    const skippedConflicts = Object.values(conflictChoices).filter(c => c.action === 'skip').length;
    const pendingConflicts = totalConflicts - resolvedAlternatives - skippedConflicts;

    const totalToBook = totalAvailable + resolvedAlternatives;

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h2 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: '1.25rem' }}>
                    Availability Review
                </h2>
                <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.875rem' }}>
                    Review the availability for your recurring booking request
                </p>
            </div>

            {/* Summary Cards */}
            <div style={styles.summary}>
                <div style={{ ...styles.summaryCard, backgroundColor: '#065f46' }}>
                    <div style={{ color: '#a7f3d0', fontSize: '1.5rem', fontWeight: 'bold' }}>
                        {totalAvailable}
                    </div>
                    <div style={{ color: '#6ee7b7', fontSize: '0.75rem' }}>Available</div>
                </div>
                {totalConflicts > 0 && (
                    <div style={{ ...styles.summaryCard, backgroundColor: '#78350f' }}>
                        <div style={{ color: '#fcd34d', fontSize: '1.5rem', fontWeight: 'bold' }}>
                            {totalConflicts}
                        </div>
                        <div style={{ color: '#fbbf24', fontSize: '0.75rem' }}>Conflicts</div>
                    </div>
                )}
                {totalBlocked > 0 && (
                    <div style={{ ...styles.summaryCard, backgroundColor: '#7f1d1d' }}>
                        <div style={{ color: '#fca5a5', fontSize: '1.5rem', fontWeight: 'bold' }}>
                            {totalBlocked}
                        </div>
                        <div style={{ color: '#f87171', fontSize: '0.75rem' }}>Blocked</div>
                    </div>
                )}
                <div style={{ ...styles.summaryCard, backgroundColor: '#1e3a8a' }}>
                    <div style={{ color: '#93c5fd', fontSize: '1.5rem', fontWeight: 'bold' }}>
                        {totalToBook}
                    </div>
                    <div style={{ color: '#60a5fa', fontSize: '0.75rem' }}>To Book</div>
                </div>
            </div>

            {/* Available Dates */}
            {availableDates.length > 0 && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>
                        <span style={{ color: '#10b981' }}>&#10003;</span>
                        Available ({availableDates.length})
                    </h3>
                    {availableDates.map(date => (
                        <div key={date.date} style={{ ...styles.dateCard, ...styles.availableCard }}>
                            <div>
                                <span style={{ color: '#fff', fontWeight: '500' }}>{date.displayDate}</span>
                                <span style={{ color: '#9ca3af', marginLeft: '12px' }}>{date.time}</span>
                            </div>
                            <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: '600' }}>
                                CONFIRMED
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Conflicting Dates */}
            {conflictingDates.length > 0 && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>
                        <span style={{ color: '#f59e0b' }}>&#9888;</span>
                        Conflicts - Choose Alternatives ({conflictingDates.length})
                    </h3>
                    {conflictingDates.map(conflict => {
                        const choice = conflictChoices[conflict.date];
                        const isResolved = choice?.action === 'alternative' || choice?.action === 'skip';

                        return (
                            <div key={conflict.date} style={{ ...styles.dateCard, ...styles.conflictCard, flexDirection: 'column', alignItems: 'stretch' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <div>
                                        <span style={{ color: '#fff', fontWeight: '500' }}>{conflict.displayDate}</span>
                                        <span style={{ color: '#9ca3af', marginLeft: '12px', textDecoration: 'line-through' }}>
                                            {conflict.requestedTime}
                                        </span>
                                    </div>
                                    {isResolved && (
                                        <span style={{ color: choice.action === 'alternative' ? '#10b981' : '#6b7280', fontSize: '0.75rem', fontWeight: '600' }}>
                                            {choice.action === 'alternative' ? `USING ${choice.time}` : 'SKIPPED'}
                                        </span>
                                    )}
                                </div>

                                <div style={{ color: '#fbbf24', fontSize: '0.75rem', marginBottom: '8px' }}>
                                    {conflict.reason}
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                                    <span style={{ color: '#9ca3af', fontSize: '0.75rem', marginRight: '8px' }}>Alternatives:</span>
                                    {conflict.alternatives.map(alt => (
                                        <button
                                            key={alt.time}
                                            type="button"
                                            onClick={() => handleAlternativeSelect(conflict.date, alt.time)}
                                            style={{
                                                ...styles.button,
                                                ...styles.alternativeButton,
                                                ...(choice?.time === alt.time ? styles.selectedAlternative : {}),
                                            }}
                                        >
                                            {alt.displayTime}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => handleSkip(conflict.date)}
                                        style={{
                                            ...styles.button,
                                            ...styles.skipButton,
                                            ...(choice?.action === 'skip' ? { backgroundColor: '#374151' } : {}),
                                        }}
                                    >
                                        Skip
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Blocked Dates */}
            {blockedDates.length > 0 && (
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>
                        <span style={{ color: '#ef4444' }}>&#10005;</span>
                        Blocked ({blockedDates.length})
                    </h3>
                    {blockedDates.map(date => (
                        <div key={date.date} style={{ ...styles.dateCard, ...styles.blockedCard }}>
                            <div>
                                <span style={{ color: '#d1d5db', fontWeight: '500' }}>{date.displayDate}</span>
                            </div>
                            <span style={{ color: '#f87171', fontSize: '0.75rem' }}>
                                {date.reason}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Action Buttons */}
            <div style={styles.buttonGroup}>
                <button
                    type="button"
                    onClick={onBack}
                    style={{ ...styles.button, ...styles.secondaryButton, flex: 1 }}
                >
                    Back
                </button>
                <button
                    type="button"
                    onClick={handleConfirmBookings}
                    disabled={isLoading || totalToBook === 0}
                    style={{
                        ...styles.button,
                        ...styles.primaryButton,
                        flex: 2,
                        ...(isLoading || totalToBook === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                    }}
                >
                    {isLoading ? 'Creating Bookings...' : `Confirm & Book ${totalToBook} Dates`}
                </button>
            </div>

            {/* Pending conflicts warning */}
            {pendingConflicts > 0 && (
                <p style={{ color: '#fbbf24', fontSize: '0.75rem', textAlign: 'center', marginTop: '12px' }}>
                    {pendingConflicts} conflict{pendingConflicts > 1 ? 's' : ''} still need a decision (alternative or skip)
                </p>
            )}
        </div>
    );
}
