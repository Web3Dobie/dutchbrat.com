"use client";

import React, { useState } from "react";
import { format, addWeeks } from "date-fns";

interface Dog {
    id: number;
    dog_name: string;
    dog_breed: string;
}

interface RecurrenceConfig {
    pattern: 'weekly' | 'biweekly' | 'custom';
    days_of_week: number[]; // ISO weekday: 1=Mon, 7=Sun
    preferred_time: string;
    weeks_ahead: number;
    start_date: string;
}

interface RecurringBookingFormProps {
    dogs: Dog[];
    onSubmit: (config: {
        dog_id_1: number;
        dog_id_2?: number;
        service_type: string;
        duration_minutes: number;
        secondary_address_id?: number;
        recurrence: RecurrenceConfig;
    }) => void;
    isLoading?: boolean;
}

const DAYS_OF_WEEK = [
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
];

const TIME_SLOTS = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00',
];

const DURATION_OPTIONS = [
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '60 minutes' },
    { value: 90, label: '90 minutes' },
];

const WEEKS_OPTIONS = [
    { value: 4, label: '4 weeks' },
    { value: 6, label: '6 weeks' },
    { value: 8, label: '8 weeks' },
    { value: 10, label: '10 weeks' },
    { value: 12, label: '12 weeks' },
];

export default function RecurringBookingForm({ dogs, onSubmit, isLoading }: RecurringBookingFormProps) {
    // Form state
    const [selectedDog1, setSelectedDog1] = useState<number>(dogs[0]?.id || 0);
    const [selectedDog2, setSelectedDog2] = useState<number | null>(null);
    const [serviceType, setServiceType] = useState<string>('Solo Walk');
    const [duration, setDuration] = useState<number>(60);
    const [pattern, setPattern] = useState<'weekly' | 'biweekly' | 'custom'>('weekly');
    const [customDays, setCustomDays] = useState<number[]>([1]); // Default Monday
    const [preferredTime, setPreferredTime] = useState<string>('10:00');
    const [weeksAhead, setWeeksAhead] = useState<number>(12);
    const [startDate, setStartDate] = useState<string>(getNextWeekday());

    // Styles
    const styles = {
        container: {
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "24px",
        } as React.CSSProperties,
        section: {
            marginBottom: "24px",
        } as React.CSSProperties,
        label: {
            display: "block",
            color: "#9ca3af",
            fontSize: "0.875rem",
            fontWeight: "600",
            marginBottom: "8px",
        } as React.CSSProperties,
        select: {
            width: "100%",
            padding: "12px",
            backgroundColor: "#1f2937",
            color: "#fff",
            border: "1px solid #374151",
            borderRadius: "6px",
            fontSize: "1rem",
            cursor: "pointer",
        } as React.CSSProperties,
        radioGroup: {
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
        } as React.CSSProperties,
        radioButton: {
            flex: "1",
            minWidth: "120px",
            padding: "12px 16px",
            backgroundColor: "#1f2937",
            border: "2px solid #374151",
            borderRadius: "8px",
            cursor: "pointer",
            textAlign: "center",
            transition: "all 0.2s",
        } as React.CSSProperties,
        radioButtonActive: {
            backgroundColor: "#1e3a8a",
            borderColor: "#3b82f6",
        } as React.CSSProperties,
        dayButton: {
            padding: "10px 16px",
            backgroundColor: "#1f2937",
            border: "2px solid #374151",
            borderRadius: "6px",
            cursor: "pointer",
            color: "#9ca3af",
            fontWeight: "600",
            transition: "all 0.2s",
        } as React.CSSProperties,
        dayButtonActive: {
            backgroundColor: "#1e3a8a",
            borderColor: "#3b82f6",
            color: "#fff",
        } as React.CSSProperties,
        grid: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
        } as React.CSSProperties,
        button: {
            width: "100%",
            padding: "14px 24px",
            backgroundColor: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s",
        } as React.CSSProperties,
        buttonDisabled: {
            backgroundColor: "#4b5563",
            cursor: "not-allowed",
        } as React.CSSProperties,
        summary: {
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "20px",
        } as React.CSSProperties,
    };

    function getNextWeekday(): string {
        const today = new Date();
        const dayOfWeek = today.getDay();

        // If today is Saturday (6) or Sunday (0), get next Monday
        if (dayOfWeek === 0) {
            today.setDate(today.getDate() + 1);
        } else if (dayOfWeek === 6) {
            today.setDate(today.getDate() + 2);
        } else {
            // Otherwise, start from tomorrow
            today.setDate(today.getDate() + 1);
            // Skip to next weekday if tomorrow is weekend
            const tomorrowDay = today.getDay();
            if (tomorrowDay === 0) today.setDate(today.getDate() + 1);
            else if (tomorrowDay === 6) today.setDate(today.getDate() + 2);
        }

        return format(today, 'yyyy-MM-dd');
    }

    function toggleCustomDay(day: number) {
        setCustomDays(prev => {
            if (prev.includes(day)) {
                // Don't allow removing the last day
                if (prev.length === 1) return prev;
                return prev.filter(d => d !== day);
            }
            return [...prev, day].sort((a, b) => a - b);
        });
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const config = {
            dog_id_1: selectedDog1,
            dog_id_2: selectedDog2 || undefined,
            service_type: serviceType,
            duration_minutes: duration,
            recurrence: {
                pattern,
                days_of_week: pattern === 'custom' ? customDays : [],
                preferred_time: preferredTime,
                weeks_ahead: weeksAhead,
                start_date: startDate,
            },
        };

        onSubmit(config);
    }

    // Calculate end date for summary
    const endDate = addWeeks(new Date(startDate), weeksAhead);

    // Get pattern description
    const getPatternDescription = () => {
        if (pattern === 'weekly') return 'Every week';
        if (pattern === 'biweekly') return 'Every 2 weeks';
        return `Custom: ${customDays.map(d => DAYS_OF_WEEK.find(dw => dw.value === d)?.label).join(', ')}`;
    };

    return (
        <form onSubmit={handleSubmit}>
            <div style={styles.container}>
                {/* Dog Selection */}
                <div style={styles.section}>
                    <label style={styles.label}>Select Dog(s)</label>
                    <div style={styles.grid}>
                        <select
                            value={selectedDog1}
                            onChange={(e) => setSelectedDog1(parseInt(e.target.value))}
                            style={styles.select}
                        >
                            {dogs.map(dog => (
                                <option key={dog.id} value={dog.id}>
                                    {dog.dog_name} ({dog.dog_breed})
                                </option>
                            ))}
                        </select>
                        <select
                            value={selectedDog2 || ''}
                            onChange={(e) => setSelectedDog2(e.target.value ? parseInt(e.target.value) : null)}
                            style={styles.select}
                        >
                            <option value="">No second dog</option>
                            {dogs.filter(d => d.id !== selectedDog1).map(dog => (
                                <option key={dog.id} value={dog.id}>
                                    {dog.dog_name} ({dog.dog_breed})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Service Type */}
                <div style={styles.section}>
                    <label style={styles.label}>Service Type</label>
                    <select
                        value={serviceType}
                        onChange={(e) => setServiceType(e.target.value)}
                        style={styles.select}
                    >
                        <option value="Solo Walk">Solo Walk</option>
                        <option value="Quick Walk (30 min)">Quick Walk</option>
                    </select>
                </div>

                {/* Duration */}
                <div style={styles.section}>
                    <label style={styles.label}>Walk Duration</label>
                    <div style={styles.radioGroup}>
                        {DURATION_OPTIONS.map(opt => (
                            <div
                                key={opt.value}
                                onClick={() => setDuration(opt.value)}
                                style={{
                                    ...styles.radioButton,
                                    ...(duration === opt.value ? styles.radioButtonActive : {}),
                                }}
                            >
                                <span style={{ color: duration === opt.value ? '#fff' : '#9ca3af' }}>
                                    {opt.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recurrence Pattern */}
                <div style={styles.section}>
                    <label style={styles.label}>Recurrence Pattern</label>
                    <div style={styles.radioGroup}>
                        <div
                            onClick={() => setPattern('weekly')}
                            style={{
                                ...styles.radioButton,
                                ...(pattern === 'weekly' ? styles.radioButtonActive : {}),
                            }}
                        >
                            <span style={{ color: pattern === 'weekly' ? '#fff' : '#9ca3af' }}>
                                Weekly
                            </span>
                        </div>
                        <div
                            onClick={() => setPattern('biweekly')}
                            style={{
                                ...styles.radioButton,
                                ...(pattern === 'biweekly' ? styles.radioButtonActive : {}),
                            }}
                        >
                            <span style={{ color: pattern === 'biweekly' ? '#fff' : '#9ca3af' }}>
                                Every 2 Weeks
                            </span>
                        </div>
                        <div
                            onClick={() => setPattern('custom')}
                            style={{
                                ...styles.radioButton,
                                ...(pattern === 'custom' ? styles.radioButtonActive : {}),
                            }}
                        >
                            <span style={{ color: pattern === 'custom' ? '#fff' : '#9ca3af' }}>
                                Custom Days
                            </span>
                        </div>
                    </div>
                </div>

                {/* Custom Days Selection */}
                {pattern === 'custom' && (
                    <div style={styles.section}>
                        <label style={styles.label}>Select Days of Week</label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {DAYS_OF_WEEK.map(day => (
                                <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => toggleCustomDay(day.value)}
                                    style={{
                                        ...styles.dayButton,
                                        ...(customDays.includes(day.value) ? styles.dayButtonActive : {}),
                                    }}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Time and Duration */}
                <div style={styles.section}>
                    <div style={styles.grid}>
                        <div>
                            <label style={styles.label}>Preferred Time</label>
                            <select
                                value={preferredTime}
                                onChange={(e) => setPreferredTime(e.target.value)}
                                style={styles.select}
                            >
                                {TIME_SLOTS.map(time => (
                                    <option key={time} value={time}>{time}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={styles.label}>Duration</label>
                            <select
                                value={weeksAhead}
                                onChange={(e) => setWeeksAhead(parseInt(e.target.value))}
                                style={styles.select}
                            >
                                {WEEKS_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Start Date */}
                <div style={styles.section}>
                    <label style={styles.label}>Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        min={getNextWeekday()}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={styles.select}
                    />
                </div>

                {/* Summary */}
                <div style={styles.summary}>
                    <h3 style={{ color: '#fff', margin: '0 0 12px 0', fontSize: '1rem' }}>
                        Booking Summary
                    </h3>
                    <div style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: '1.6' }}>
                        <p style={{ margin: '0 0 4px 0' }}>
                            <strong style={{ color: '#d1d5db' }}>Pattern:</strong> {getPatternDescription()} at {preferredTime}
                        </p>
                        <p style={{ margin: '0 0 4px 0' }}>
                            <strong style={{ color: '#d1d5db' }}>Period:</strong> {format(new Date(startDate), 'd MMM yyyy')} to {format(endDate, 'd MMM yyyy')}
                        </p>
                        <p style={{ margin: '0' }}>
                            <strong style={{ color: '#d1d5db' }}>Walk Duration:</strong> {duration} minutes
                        </p>
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                        ...styles.button,
                        ...(isLoading ? styles.buttonDisabled : {}),
                    }}
                >
                    {isLoading ? 'Checking Availability...' : 'Check Availability'}
                </button>
            </div>
        </form>
    );
}
