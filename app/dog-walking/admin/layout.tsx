import React from "react";
import Link from "next/link";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const styles = {
        container: {
            backgroundColor: "#111827",
            color: "#fff",
            minHeight: "100vh",
        } as React.CSSProperties,
        nav: {
            backgroundColor: "#1f2937",
            borderBottom: "1px solid #333",
            padding: "16px 0",
        } as React.CSSProperties,
        navContainer: {
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
        } as React.CSSProperties,
        navTitle: {
            fontSize: "1.5rem",
            fontWeight: "bold",
            color: "#3b82f6",
        } as React.CSSProperties,
        navLinks: {
            display: "flex",
            gap: "24px",
        } as React.CSSProperties,
        navLink: {
            color: "#d1d5db",
            textDecoration: "none",
            padding: "8px 16px",
            borderRadius: "4px",
            transition: "background-color 0.2s",
        } as React.CSSProperties,
        content: {
            padding: "24px",
        } as React.CSSProperties,
    };

    return (
        <div style={styles.container}>
            <nav style={styles.nav}>
                <div style={styles.navContainer}>
                    <div style={styles.navTitle}>Hunter's Hounds Admin</div>
                    <div style={styles.navLinks}>
                        <Link href="/dog-walking/admin" style={styles.navLink}>
                            Dashboard
                        </Link>
                        <Link href="/dog-walking/admin/register-client" style={styles.navLink}>
                            Register Client
                        </Link>
                        <Link href="/dog-walking/admin/create-booking" style={styles.navLink}>
                            Create Booking
                        </Link>
                        <Link href="/dog-walking/admin/payments" style={styles.navLink}>
                            Payment Management
                        </Link>
                    </div>
                </div>
            </nav>
            <div style={styles.content}>
                {children}
            </div>
        </div>
    );
}