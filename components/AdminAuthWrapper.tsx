"use client";

import React, { useEffect, useState, FormEvent } from "react";

interface AdminAuthWrapperProps {
    children: React.ReactNode;
}

export default function AdminAuthWrapper({ children }: AdminAuthWrapperProps) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const response = await fetch("/api/dog-walking/admin/auth/check");
            const data = await response.json();
            setIsAuthenticated(data.authenticated);
        } catch {
            setIsAuthenticated(false);
        }
    };

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/dog-walking/admin/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                setIsAuthenticated(true);
                setUsername("");
                setPassword("");
            } else {
                const data = await response.json();
                setError(data.error || "Invalid credentials");
            }
        } catch {
            setError("Login failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch("/api/dog-walking/admin/auth/logout", { method: "POST" });
            setIsAuthenticated(false);
        } catch {
            console.error("Logout failed");
        }
    };

    // Loading state
    if (isAuthenticated === null) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingBox}>
                    <p>Checking authentication...</p>
                </div>
            </div>
        );
    }

    // Login form
    if (!isAuthenticated) {
        return (
            <div style={styles.container}>
                <div style={styles.loginBox}>
                    <h1 style={styles.title}>Admin Login</h1>
                    <p style={styles.subtitle}>Hunter's Hounds Management</p>

                    <form onSubmit={handleLogin} style={styles.form}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                style={styles.input}
                                placeholder="Enter username"
                                required
                                autoFocus
                            />
                        </div>

                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={styles.input}
                                placeholder="Enter password"
                                required
                            />
                        </div>

                        {error && <div style={styles.error}>{error}</div>}

                        <button
                            type="submit"
                            style={styles.button}
                            disabled={isLoading}
                        >
                            {isLoading ? "Logging in..." : "Login"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Authenticated - render children with logout button
    return (
        <div>
            <div style={styles.logoutBar}>
                <button onClick={handleLogout} style={styles.logoutButton}>
                    Logout
                </button>
            </div>
            {children}
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#111827",
        padding: "20px",
    },
    loadingBox: {
        backgroundColor: "#1f2937",
        padding: "40px",
        borderRadius: "8px",
        color: "#9ca3af",
        textAlign: "center",
    },
    loginBox: {
        backgroundColor: "#1f2937",
        padding: "40px",
        borderRadius: "8px",
        width: "100%",
        maxWidth: "400px",
        border: "1px solid #333",
    },
    title: {
        fontSize: "1.8rem",
        fontWeight: "bold",
        color: "#3b82f6",
        marginBottom: "8px",
        textAlign: "center",
    },
    subtitle: {
        color: "#9ca3af",
        textAlign: "center",
        marginBottom: "32px",
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "20px",
    },
    inputGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
    },
    label: {
        color: "#d1d5db",
        fontSize: "0.9rem",
        fontWeight: "500",
    },
    input: {
        padding: "12px 16px",
        backgroundColor: "#374151",
        border: "1px solid #4b5563",
        borderRadius: "6px",
        color: "#fff",
        fontSize: "1rem",
        outline: "none",
    },
    button: {
        padding: "14px",
        backgroundColor: "#3b82f6",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        fontSize: "1rem",
        fontWeight: "bold",
        cursor: "pointer",
        marginTop: "8px",
    },
    error: {
        backgroundColor: "#7f1d1d",
        color: "#fca5a5",
        padding: "12px",
        borderRadius: "6px",
        fontSize: "0.9rem",
        textAlign: "center",
    },
    logoutBar: {
        position: "fixed",
        top: "16px",
        right: "16px",
        zIndex: 1000,
    },
    logoutButton: {
        padding: "8px 16px",
        backgroundColor: "#374151",
        color: "#d1d5db",
        border: "1px solid #4b5563",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "0.9rem",
    },
};
