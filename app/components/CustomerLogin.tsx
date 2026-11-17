"use client";

import React, { useState } from "react";

/**
 * The customer login, in two steps: email address, then the code emailed to it.
 *
 * This replaces four separate copies of the old one-step login — in
 * DashboardAuth, BookingForm, /book-now and the dashboard's book-new page —
 * each of which called /customer-lookup with an email address and then minted a
 * session from whatever came back. Knowing the address was the entire login,
 * and the lookup handed over the full record before any session existed, so
 * putting a code in front of only one of the four would have achieved nothing.
 *
 * One component now, so there is one login to reason about. The successful
 * login returns the customer record from /customer-session, which is why no
 * caller needs the lookup any more.
 */

export interface LoggedInCustomer {
    owner_id: number;
    owner_name: string;
    phone: string;
    email: string;
    address: string;
    partner_name?: string | null;
    partner_email?: string | null;
    partner_phone?: string | null;
    payment_preference?: string | null;
    has_had_meetgreet?: boolean;
    dogs: Array<{
        id: number;
        dog_name: string;
        dog_breed: string;
        dog_age?: number | null;
        dog_birthday?: string | null;
        image_filename?: string | null;
    }>;
}

interface CustomerLoginProps {
    onAuthSuccess: (customer: LoggedInCustomer) => void;
    /** Shown above the form when the customer was sent back here — an expired session. */
    notice?: string | null;
    /** Heading. Defaults to the dashboard wording. */
    title?: string;
    /** Line under the heading. */
    subtitle?: string;
    /**
     * Shown as a "new client?" link when supplied. The booking flow used to
     * drop people into registration automatically when their email wasn't
     * found, which is no longer possible: this login cannot say whether an
     * address is on file without telling strangers the same thing. An explicit
     * choice is both safer and kinder than a form that silently turns into a
     * registration.
     */
    onRegisterClick?: (typedEmail: string) => void;
}

/** Seconds before "send another code" becomes available, so the button can't be hammered. */
const RESEND_COOLDOWN = 30;

export default function CustomerLogin({
    onAuthSuccess,
    notice,
    title = "Access Your Bookings",
    subtitle = "Enter the email address you booked with and we'll send you a code to sign in.",
    onRegisterClick,
}: CustomerLoginProps) {
    const [step, setStep] = useState<"email" | "code">("email");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);

    // --- Styles (matching DashboardAuth.tsx / BookingForm.tsx) ---
    const styles = {
        container: {
            maxWidth: "500px",
            margin: "0 auto",
            padding: "24px",
        } as React.CSSProperties,
        form: {
            padding: "24px",
            border: "1px solid #333",
            borderRadius: "8px",
            backgroundColor: "#111827",
        } as React.CSSProperties,
        label: {
            display: "block",
            marginBottom: "4px",
            fontSize: "0.9rem",
            color: "#d1d5db",
        } as React.CSSProperties,
        input: {
            width: "100%",
            padding: "12px",
            marginBottom: "16px",
            borderRadius: "4px",
            border: "1px solid #444",
            backgroundColor: "#1f2937",
            color: "#fff",
            fontSize: "1rem",
        } as React.CSSProperties,
        codeInput: {
            width: "100%",
            padding: "14px",
            marginBottom: "16px",
            borderRadius: "4px",
            border: "1px solid #444",
            backgroundColor: "#1f2937",
            color: "#fff",
            fontSize: "1.6rem",
            letterSpacing: "0.5rem",
            textAlign: "center",
            fontFamily: "'Courier New', Courier, monospace",
        } as React.CSSProperties,
        button: {
            width: "100%",
            padding: "12px",
            fontSize: "1rem",
            fontWeight: "bold",
            color: "#fff",
            backgroundColor: "#3b82f6",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
        } as React.CSSProperties,
        buttonDisabled: {
            backgroundColor: "#374151",
            cursor: "not-allowed",
        } as React.CSSProperties,
        linkButton: {
            background: "none",
            border: "none",
            color: "#3b82f6",
            textDecoration: "underline",
            cursor: "pointer",
            fontSize: "0.85rem",
            padding: "4px 0",
        } as React.CSSProperties,
        linkButtonDisabled: {
            color: "#6b7280",
            cursor: "not-allowed",
            textDecoration: "none",
        } as React.CSSProperties,
        error: {
            color: "#ef4444",
            fontSize: "0.9rem",
            marginBottom: "16px",
            padding: "8px",
            backgroundColor: "#7f1d1d",
            border: "1px solid #dc2626",
            borderRadius: "4px",
        } as React.CSSProperties,
        info: {
            color: "#a7f3d0",
            fontSize: "0.9rem",
            marginBottom: "16px",
            padding: "12px",
            backgroundColor: "#064e3b",
            border: "1px solid #059669",
            borderRadius: "4px",
            lineHeight: "1.4",
        } as React.CSSProperties,
        hint: {
            fontSize: "0.85rem",
            color: "#9ca3af",
            marginBottom: "16px",
            lineHeight: "1.4",
        } as React.CSSProperties,
        notice: {
            color: "#fcd34d",
            fontSize: "0.9rem",
            marginBottom: "16px",
            padding: "12px",
            backgroundColor: "#422006",
            border: "1px solid #b45309",
            borderRadius: "4px",
            lineHeight: "1.4",
        } as React.CSSProperties,
    };

    const startCooldown = () => {
        setCooldown(RESEND_COOLDOWN);
        const timer = setInterval(() => {
            setCooldown((seconds) => {
                if (seconds <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return seconds - 1;
            });
        }, 1000);
    };

    /** Step one: ask for a code. */
    const requestCode = async (isResend = false) => {
        if (!email.trim() || !email.includes("@")) {
            setError("Please enter the email address you booked with.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setInfo(null);

        try {
            const response = await fetch("/api/dog-walking/customer-session/request-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim() }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Could not send your code. Please try again.");
            }

            setStep("code");
            setInfo(
                isResend
                    ? `A new code is on its way to ${email.trim()}.`
                    : `${data.message} Check ${email.trim()} — it may take a moment.`
            );
            startCooldown();
        } catch (err: any) {
            console.error("[CustomerLogin] Code request failed:", err);
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    /** Step two: redeem the code for a session. */
    const submitCode = async () => {
        const trimmed = code.trim();
        if (trimmed.length !== 6) {
            setError("Please enter the 6-digit code from the email.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setInfo(null);

        try {
            const response = await fetch("/api/dog-walking/customer-session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), code: trimmed }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "That code was not accepted.");
            }

            if (!data.customer) {
                // Should not happen: the route returns the record with the
                // session. Treat it as a failure rather than calling back with
                // nothing, which would leave the caller with an empty dashboard.
                throw new Error("Signed in, but your details could not be loaded. Please reload the page.");
            }

            onAuthSuccess(data.customer as LoggedInCustomer);
        } catch (err: any) {
            console.error("[CustomerLogin] Code verification failed:", err);
            setError(err.message || "Something went wrong. Please try again.");
            setCode("");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (step === "email") {
            void requestCode(false);
        } else {
            void submitCode();
        }
    };

    const startOver = () => {
        setStep("email");
        setCode("");
        setError(null);
        setInfo(null);
    };

    return (
        <div style={styles.container}>
            <div style={styles.form}>
                {/* Header */}
                <div style={{ marginBottom: "24px", textAlign: "center" }}>
                    <h2
                        style={{
                            color: "#fff",
                            fontSize: "1.5rem",
                            fontWeight: "bold",
                            marginBottom: "8px",
                        }}
                    >
                        {title}
                    </h2>
                    <p style={styles.hint}>
                        {step === "email"
                            ? subtitle
                            : "Enter the 6-digit code from the email. It's valid for 10 minutes."}
                    </p>
                </div>

                {/* Session expiry notice — shown instead of leaving the
                    customer staring at a raw "Not authenticated" error. */}
                {notice && <div style={styles.notice}>{notice}</div>}

                {info && <div style={styles.info}>{info}</div>}

                <form onSubmit={handleSubmit}>
                    {step === "email" ? (
                        <>
                            <label style={styles.label} htmlFor="loginEmail">
                                Email Address
                            </label>
                            <input
                                style={styles.input}
                                type="email"
                                id="loginEmail"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                disabled={isLoading}
                                autoComplete="email"
                                autoFocus
                            />
                        </>
                    ) : (
                        <>
                            <label style={styles.label} htmlFor="loginCode">
                                Your 6-digit code
                            </label>
                            <input
                                style={styles.codeInput}
                                type="text"
                                id="loginCode"
                                value={code}
                                // Strip anything that isn't a digit so a pasted
                                // "123 456" or a stray space still works.
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="000000"
                                disabled={isLoading}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                autoFocus
                            />
                        </>
                    )}

                    {error && <div style={styles.error}>{error}</div>}

                    <button
                        style={{
                            ...styles.button,
                            ...(isLoading ? styles.buttonDisabled : {}),
                        }}
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading
                            ? step === "email"
                                ? "Sending..."
                                : "Checking..."
                            : step === "email"
                            ? "Email me a code"
                            : "Sign in"}
                    </button>
                </form>

                {step === "code" && (
                    <div style={{ textAlign: "center", marginTop: "16px" }}>
                        <button
                            type="button"
                            onClick={() => void requestCode(true)}
                            disabled={isLoading || cooldown > 0}
                            style={{
                                ...styles.linkButton,
                                ...(isLoading || cooldown > 0 ? styles.linkButtonDisabled : {}),
                            }}
                        >
                            {cooldown > 0 ? `Send another code (${cooldown}s)` : "Send another code"}
                        </button>
                        <span style={{ color: "#4b5563", margin: "0 8px" }}>·</span>
                        <button
                            type="button"
                            onClick={startOver}
                            disabled={isLoading}
                            style={styles.linkButton}
                        >
                            Use a different email
                        </button>
                    </div>
                )}

                {/* Help text */}
                <div
                    style={{
                        ...styles.hint,
                        textAlign: "center",
                        marginTop: "24px",
                        paddingTop: "16px",
                        borderTop: "1px solid #374151",
                    }}
                >
                    {onRegisterClick && (
                        <p style={{ marginBottom: "12px" }}>
                            New to Hunter's Hounds?{" "}
                            <button
                                type="button"
                                onClick={() => onRegisterClick(email.trim())}
                                style={{ ...styles.linkButton, fontSize: "0.85rem" }}
                            >
                                Register here
                            </button>
                        </p>
                    )}
                    <p>No code arriving, or not sure which email you used?</p>
                    <p style={{ marginTop: "4px" }}>
                        <a
                            href="mailto:ernesto@hunters-hounds.london"
                            style={{ color: "#3b82f6", textDecoration: "underline" }}
                        >
                            Contact us
                        </a>{" "}
                        or call{" "}
                        <a
                            href="tel:07932749772"
                            style={{ color: "#3b82f6", textDecoration: "underline" }}
                        >
                            07932749772
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
