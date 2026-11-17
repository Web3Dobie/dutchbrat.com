"use client";

import React from "react";
import CustomerLogin, { type LoggedInCustomer } from "./CustomerLogin";

/**
 * The dashboard's login.
 *
 * This used to hold the form itself: an email or phone number went to
 * /customer-lookup, and whatever came back was treated as proof of identity.
 * The form now lives in CustomerLogin, shared with the booking flows, and the
 * login is a code emailed to the address on file.
 *
 * Kept as a named component rather than swapping CustomerLogin into
 * CustomerDashboard directly, because the dashboard's own wording lives here
 * and CustomerDashboard has no business knowing how a login works.
 */

interface Customer {
    owner_id: number;
    owner_name: string;
    phone: string;
    email: string;
    address: string;
    dogs: Array<{
        id: number;
        dog_name: string;
        dog_breed: string;
        dog_age?: number | null;
        dog_birthday?: string | null;
    }>;
}

interface DashboardAuthProps {
    onAuthSuccess: (customer: Customer) => void;
    /**
     * Shown above the form when the customer was returned here rather than
     * arriving fresh — currently only an expired session. Styled as a notice,
     * not an error: nothing went wrong and nothing they did caused it.
     */
    notice?: string | null;
}

export default function DashboardAuth({ onAuthSuccess, notice }: DashboardAuthProps) {
    return (
        <CustomerLogin
            notice={notice}
            title="Access Your Bookings"
            subtitle="Enter the email address you booked with and we'll send you a code to sign in."
            onAuthSuccess={(customer: LoggedInCustomer) => onAuthSuccess(customer as Customer)}
        />
    );
}
