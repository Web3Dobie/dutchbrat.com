"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import ClientEditor from "./components/ClientEditor";

// Types
interface Dog {
    id: number;
    dog_name: string;
    dog_breed: string;
    dog_age: number;
    image_filename: string | null;
}

interface Client {
    id: number;
    owner_name: string;
    phone: string;
    email: string;
    address: string;
    created_at: string;
    // Vet & Insurance fields
    vet_info?: string | null;
    pet_insurance?: string | null;
    // Photo sharing consent
    photo_sharing_consent?: boolean;
    // Extended travel time (30 min instead of 15 min)
    extended_travel_time?: boolean;
    // Payment preference
    payment_preference?: string | null;
    dogs: Dog[];
}

interface ClientsResponse {
    clients: Client[];
    total: number;
    page: number;
    totalPages: number;
}

interface ErrorResponse {
    error: string;
}

export default function ClientManagement() {
    // State
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalClients, setTotalClients] = useState(0);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    // Pagination settings
    const ITEMS_PER_PAGE = 25;

    // Effects
    useEffect(() => {
        fetchClients();
    }, [currentPage, searchTerm]);

    // API Functions
    const fetchClients = async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: ITEMS_PER_PAGE.toString(),
                sort: 'id_desc',
                ...(searchTerm && { search: searchTerm })
            });

            const response = await fetch(`/api/dog-walking/admin/clients?${params}`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                const errorData: ErrorResponse = await response.json();
                throw new Error(errorData.error || "Failed to fetch clients");
            }

            const data: ClientsResponse = await response.json();

            setClients(data.clients || []);
            setTotalPages(data.totalPages || 1);
            setTotalClients(data.total || 0);

        } catch (err: any) {
            console.error("Failed to fetch clients:", err);
            setError(err.message || "Could not load clients. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Helper Functions
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1); // Reset to first page when searching
        fetchClients();
    };

    const clearSearch = () => {
        setSearchTerm("");
        setCurrentPage(1);
    };

    const formatDogsList = (dogs: Dog[]) => {
        if (!dogs || dogs.length === 0) return "No dogs";
        
        return dogs.map(dog => {
            const hasPhoto = dog.image_filename ? "📷" : "❌";
            return `${dog.dog_name} (${dog.dog_breed}, ${dog.dog_age}) ${hasPhoto}`;
        }).join(", ");
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    // Styles
    const styles = {
        container: {
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "24px",
            backgroundColor: "#0f172a",
            minHeight: "100vh",
            color: "#fff"
        } as React.CSSProperties,
        header: {
            marginBottom: "32px",
            textAlign: "center",
        } as React.CSSProperties,
        title: {
            fontSize: "2.5rem",
            fontWeight: "bold",
            color: "#3b82f6",
            marginBottom: "8px",
        } as React.CSSProperties,
        subtitle: {
            color: "#9ca3af",
            fontSize: "1.1rem",
        } as React.CSSProperties,
        searchSection: {
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "24px",
        } as React.CSSProperties,
        searchForm: {
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
        } as React.CSSProperties,
        searchInput: {
            flex: "1",
            minWidth: "300px",
            padding: "12px",
            backgroundColor: "#374151",
            border: "1px solid #4b5563",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "16px",
        } as React.CSSProperties,
        button: {
            padding: "12px 24px",
            backgroundColor: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "background-color 0.2s",
        } as React.CSSProperties,
        clearButton: {
            backgroundColor: "#6b7280",
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
        editButton: {
            padding: "8px 16px",
            backgroundColor: "#7c3aed",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "14px",
        } as React.CSSProperties,
        pagination: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            marginTop: "24px",
            flexWrap: "wrap",
        } as React.CSSProperties,
        pageButton: {
            padding: "8px 12px",
            backgroundColor: "#374151",
            color: "#d1d5db",
            border: "1px solid #4b5563",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
        } as React.CSSProperties,
        activePageButton: {
            backgroundColor: "#3b82f6",
            color: "#fff",
        } as React.CSSProperties,
        stats: {
            textAlign: "center",
            color: "#9ca3af",
            marginBottom: "16px",
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
    };

    // Responsive styles
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>Loading clients...</div>
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
                <h1 style={styles.title}>Client Management</h1>
                <p style={styles.subtitle}>Manage client details, dogs, and photos</p>
            </div>

            {/* Error Display */}
            {error && (
                <div style={styles.error}>
                    {error}
                </div>
            )}

            {/* Search Section */}
            <div style={styles.searchSection}>
                <form onSubmit={handleSearch} style={styles.searchForm}>
                    <input
                        type="text"
                        placeholder="Search by name, phone, or dog name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={styles.searchInput}
                    />
                    <button type="submit" style={styles.button}>
                        🔍 Search
                    </button>
                    {searchTerm && (
                        <button 
                            type="button" 
                            onClick={clearSearch}
                            style={{ ...styles.button, ...styles.clearButton }}
                        >
                            Clear
                        </button>
                    )}
                </form>
            </div>

            {/* Stats */}
            <div style={styles.stats}>
                Showing {clients.length} of {totalClients} clients 
                {searchTerm && ` (filtered by "${searchTerm}")`}
            </div>

            {/* Desktop Table */}
            {!isMobile && (
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>ID</th>
                                <th style={styles.th}>Owner Name</th>
                                <th style={styles.th}>Phone</th>
                                <th style={styles.th}>Email</th>
                                <th style={styles.th}>Address</th>
                                <th style={styles.th}>Registered</th>
                                <th style={styles.th}>Dogs</th>
                                <th style={styles.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map((client) => (
                                <tr key={client.id}>
                                    <td style={styles.td}>{client.id}</td>
                                    <td style={styles.td}>{client.owner_name}</td>
                                    <td style={styles.td}>{client.phone}</td>
                                    <td style={styles.td}>{client.email}</td>
                                    <td style={styles.td}>{client.address}</td>
                                    <td style={styles.td}>{formatDate(client.created_at)}</td>
                                    <td style={styles.td}>
                                        <div style={{ fontSize: "14px" }}>
                                            {formatDogsList(client.dogs)}
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        <button 
                                            style={styles.editButton}
                                            onClick={() => setEditingClient(client)}
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Mobile Cards - Coming next */}
            {isMobile && (
                <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
                    Mobile view coming soon...
                </div>
            )}

            {/* Pagination */}
            <div style={styles.pagination}>
                <button
                    style={{
                        ...styles.pageButton,
                        opacity: currentPage === 1 ? 0.5 : 1,
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    }}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                >
                    ← Previous
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                        <button
                            key={page}
                            style={{
                                ...styles.pageButton,
                                ...(currentPage === page ? styles.activePageButton : {})
                            }}
                            onClick={() => setCurrentPage(page)}
                        >
                            {page}
                        </button>
                    );
                })}

                <button
                    style={{
                        ...styles.pageButton,
                        opacity: currentPage === totalPages ? 0.5 : 1,
                        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    }}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                >
                    Next →
                </button>
            </div>

            {/* Stats Footer */}
            <div style={{ ...styles.stats, marginTop: "24px" }}>
                Page {currentPage} of {totalPages} • Total: {totalClients} clients
            </div>

            {/* Client Editor Modal */}
            {editingClient && (
                <ClientEditor
                    client={editingClient}
                    onSave={(updatedClient) => {
                        // Update the client in the local list
                        setClients(prev => 
                            prev.map(c => c.id === updatedClient.id ? updatedClient : c)
                        );
                        setEditingClient(null);
                        // Optionally refresh the entire list
                        // fetchClients();
                    }}
                    onCancel={() => setEditingClient(null)}
                />
            )}
        </div>
    );
}