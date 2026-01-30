"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";

interface Client {
    id: number;
    owner_name: string;
}

interface PendingFile {
    filename: string;
    filePath: string;
    mediaType: "image" | "video";
    fileSize: number;
    takenAt: string | null;
}

interface AssignedMedia {
    id: number;
    owner_id: number;
    filename: string;
    file_path: string;
    media_type: "image" | "video";
    file_size: number;
    taken_at: string | null;
    uploaded_at: string;
    description: string | null;
    thumbnail_path: string | null;
    owner_name: string;
}

export default function ClientMediaPage() {
    // State
    const [activeSection, setActiveSection] = useState<"pending" | "assigned">("pending");
    const [clients, setClients] = useState<Client[]>([]);
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
    const [assignedMedia, setAssignedMedia] = useState<AssignedMedia[]>([]);
    const [selectedClient, setSelectedClient] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // For assigning files
    const [assigningFile, setAssigningFile] = useState<string | null>(null);
    const [assignClientId, setAssignClientId] = useState<number | null>(null);
    const [assignDate, setAssignDate] = useState<string>("");

    // Styles
    const styles = {
        container: {
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "20px",
            backgroundColor: "#0f172a",
            minHeight: "100vh",
        } as React.CSSProperties,
        header: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            borderBottom: "1px solid #374151",
            paddingBottom: "16px",
        } as React.CSSProperties,
        title: {
            color: "#fff",
            fontSize: "1.8rem",
            fontWeight: "bold",
            margin: 0,
        } as React.CSSProperties,
        backLink: {
            color: "#3b82f6",
            textDecoration: "none",
        } as React.CSSProperties,
        tabContainer: {
            display: "flex",
            borderBottom: "2px solid #374151",
            marginBottom: "24px",
        } as React.CSSProperties,
        tab: {
            padding: "12px 24px",
            fontSize: "1rem",
            fontWeight: "600",
            border: "none",
            background: "none",
            cursor: "pointer",
            color: "#9ca3af",
            borderBottom: "2px solid transparent",
            marginBottom: "-2px",
        } as React.CSSProperties,
        activeTab: {
            color: "#3b82f6",
            borderBottomColor: "#3b82f6",
        } as React.CSSProperties,
        card: {
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "16px",
        } as React.CSSProperties,
        button: {
            padding: "8px 16px",
            borderRadius: "6px",
            fontWeight: "600",
            fontSize: "14px",
            border: "none",
            cursor: "pointer",
        } as React.CSSProperties,
        primaryButton: {
            backgroundColor: "#3b82f6",
            color: "#fff",
        } as React.CSSProperties,
        successButton: {
            backgroundColor: "#10b981",
            color: "#fff",
        } as React.CSSProperties,
        dangerButton: {
            backgroundColor: "#ef4444",
            color: "#fff",
        } as React.CSSProperties,
        secondaryButton: {
            backgroundColor: "#374151",
            color: "#fff",
        } as React.CSSProperties,
        grid: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "16px",
        } as React.CSSProperties,
        fileCard: {
            backgroundColor: "#111827",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "16px",
        } as React.CSSProperties,
        select: {
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #374151",
            backgroundColor: "#111827",
            color: "#fff",
            fontSize: "14px",
            width: "100%",
        } as React.CSSProperties,
        input: {
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #374151",
            backgroundColor: "#111827",
            color: "#fff",
            fontSize: "14px",
            width: "100%",
        } as React.CSSProperties,
    };

    // Fetch clients on mount
    useEffect(() => {
        fetchClients();
    }, []);

    // Fetch data when section changes
    useEffect(() => {
        if (activeSection === "pending") {
            handleScan();
        } else {
            fetchAssignedMedia();
        }
    }, [activeSection, selectedClient]);

    const fetchClients = async () => {
        try {
            const response = await fetch("/api/dog-walking/admin/clients");
            const data = await response.json();
            if (data.success) {
                setClients(data.clients.map((c: any) => ({
                    id: c.id,
                    owner_name: c.owner_name
                })));
            }
        } catch (err) {
            console.error("Failed to fetch clients:", err);
        }
    };

    const handleScan = async () => {
        setIsScanning(true);
        setError(null);

        try {
            const response = await fetch("/api/dog-walking/admin/client-media/scan", {
                method: "POST",
            });
            const data = await response.json();

            if (data.success) {
                setPendingFiles(data.pending || []);
                if (data.total === 0) {
                    setSuccessMessage("No new files to assign");
                    setTimeout(() => setSuccessMessage(null), 3000);
                } else if (data.videosOptimized > 0) {
                    setSuccessMessage(`Found ${data.total} files (${data.videosOptimized} videos optimized for streaming)`);
                    setTimeout(() => setSuccessMessage(null), 5000);
                }
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            setError(err.message || "Failed to scan for files");
        } finally {
            setIsScanning(false);
        }
    };

    const fetchAssignedMedia = async () => {
        setIsLoading(true);
        setError(null);

        try {
            let url = "/api/dog-walking/admin/client-media";
            if (selectedClient) {
                url += `?owner_id=${selectedClient}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                setAssignedMedia(data.media || []);
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            setError(err.message || "Failed to fetch media");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAssign = async (filename: string) => {
        if (!assignClientId) {
            setError("Please select a client");
            return;
        }

        setAssigningFile(filename);
        setError(null);

        try {
            const response = await fetch("/api/dog-walking/admin/client-media", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filename,
                    owner_id: assignClientId,
                    taken_at: assignDate || null,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccessMessage(`Assigned ${filename} successfully`);
                setTimeout(() => setSuccessMessage(null), 3000);
                // Remove from pending list
                setPendingFiles(prev => prev.filter(f => f.filename !== filename));
                // Reset assignment form
                setAssignClientId(null);
                setAssignDate("");
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            setError(err.message || "Failed to assign file");
        } finally {
            setAssigningFile(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Remove this media assignment? (The file will remain on disk)")) {
            return;
        }

        try {
            const response = await fetch(`/api/dog-walking/admin/client-media/${id}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (data.success) {
                setSuccessMessage("Media unassigned successfully");
                setTimeout(() => setSuccessMessage(null), 3000);
                setAssignedMedia(prev => prev.filter(m => m.id !== id));
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            setError(err.message || "Failed to delete media");
        }
    };

    const handleGenerateThumbnails = async () => {
        setIsGeneratingThumbnails(true);
        setError(null);

        try {
            const response = await fetch("/api/dog-walking/admin/client-media/thumbnails", {
                method: "POST",
            });

            const data = await response.json();

            if (data.success) {
                let msg = `Generated ${data.generated} thumbnails`;
                if (data.failed > 0) {
                    msg += ` (${data.failed} failed)`;
                    if (data.errors && data.errors.length > 0) {
                        msg += `: ${data.errors.join(", ")}`;
                    }
                }
                setSuccessMessage(msg);
                setTimeout(() => setSuccessMessage(null), 8000);
                // Refresh media list
                if (activeSection === "assigned") {
                    fetchAssignedMedia();
                }
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            setError(err.message || "Failed to generate thumbnails");
        } finally {
            setIsGeneratingThumbnails(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.title}>Client Media Management</h1>
                <Link href="/dog-walking/admin" style={styles.backLink}>
                    ← Back to Admin
                </Link>
            </div>

            {/* Success/Error Messages */}
            {successMessage && (
                <div style={{
                    ...styles.card,
                    backgroundColor: "#064e3b",
                    borderColor: "#10b981",
                    marginBottom: "16px"
                }}>
                    <p style={{ color: "#6ee7b7", margin: 0 }}>{successMessage}</p>
                </div>
            )}

            {error && (
                <div style={{
                    ...styles.card,
                    backgroundColor: "#7f1d1d",
                    borderColor: "#ef4444",
                    marginBottom: "16px"
                }}>
                    <p style={{ color: "#fca5a5", margin: 0 }}>{error}</p>
                </div>
            )}

            {/* Action Buttons */}
            <div style={styles.card}>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <button
                        style={{ ...styles.button, ...styles.primaryButton }}
                        onClick={handleScan}
                        disabled={isScanning}
                    >
                        {isScanning ? "Scanning..." : "🔍 Scan for New Files"}
                    </button>
                    <button
                        style={{ ...styles.button, ...styles.secondaryButton }}
                        onClick={handleGenerateThumbnails}
                        disabled={isGeneratingThumbnails}
                    >
                        {isGeneratingThumbnails ? "Generating..." : "🖼️ Generate Thumbnails"}
                    </button>
                </div>
                <p style={{ color: "#9ca3af", marginTop: "12px", marginBottom: 0, fontSize: "14px" }}>
                    Upload photos via FTP to <code>/client-media/originals/</code>, then scan to assign them to clients.
                </p>
            </div>

            {/* Tabs */}
            <div style={styles.tabContainer}>
                <button
                    style={{
                        ...styles.tab,
                        ...(activeSection === "pending" ? styles.activeTab : {}),
                    }}
                    onClick={() => setActiveSection("pending")}
                >
                    📁 Pending Files ({pendingFiles.length})
                </button>
                <button
                    style={{
                        ...styles.tab,
                        ...(activeSection === "assigned" ? styles.activeTab : {}),
                    }}
                    onClick={() => setActiveSection("assigned")}
                >
                    ✅ Assigned Media ({assignedMedia.length})
                </button>
            </div>

            {/* Pending Files Section */}
            {activeSection === "pending" && (
                <>
                    {pendingFiles.length === 0 ? (
                        <div style={styles.card}>
                            <p style={{ color: "#9ca3af", textAlign: "center", margin: 0 }}>
                                No pending files. Upload photos via FTP and click "Scan for New Files".
                            </p>
                        </div>
                    ) : (
                        <div style={styles.grid}>
                            {pendingFiles.map((file) => (
                                <div key={file.filename} style={styles.fileCard}>
                                    {/* Preview */}
                                    <div style={{
                                        height: "120px",
                                        backgroundColor: "#1f2937",
                                        borderRadius: "4px",
                                        marginBottom: "12px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        overflow: "hidden"
                                    }}>
                                        {file.mediaType === "image" ? (
                                            <img
                                                src={`/client-media/${file.filePath}?v=2`}
                                                alt=""
                                                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: "48px" }}>🎥</span>
                                        )}
                                    </div>

                                    {/* File Info */}
                                    <p style={{ color: "#fff", fontSize: "13px", margin: "0 0 4px 0", wordBreak: "break-all" }}>
                                        {file.filename}
                                    </p>
                                    <p style={{ color: "#9ca3af", fontSize: "12px", margin: "0 0 8px 0" }}>
                                        {file.mediaType} • {formatFileSize(file.fileSize)}
                                        {file.takenAt && ` • ${format(new Date(file.takenAt), "MMM d, yyyy")}`}
                                    </p>

                                    {/* Assignment Form */}
                                    <div style={{ marginTop: "12px" }}>
                                        <select
                                            style={{ ...styles.select, marginBottom: "8px" }}
                                            value={assignClientId || ""}
                                            onChange={(e) => setAssignClientId(parseInt(e.target.value) || null)}
                                        >
                                            <option value="">Select client...</option>
                                            {clients.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.owner_name}
                                                </option>
                                            ))}
                                        </select>

                                        <input
                                            type="date"
                                            style={{ ...styles.input, marginBottom: "8px" }}
                                            value={assignDate}
                                            onChange={(e) => setAssignDate(e.target.value)}
                                            placeholder="Date taken (optional)"
                                        />

                                        <button
                                            style={{ ...styles.button, ...styles.successButton, width: "100%" }}
                                            onClick={() => handleAssign(file.filename)}
                                            disabled={assigningFile === file.filename || !assignClientId}
                                        >
                                            {assigningFile === file.filename ? "Assigning..." : "Assign to Client"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Assigned Media Section */}
            {activeSection === "assigned" && (
                <>
                    {/* Filter by Client */}
                    <div style={{ marginBottom: "16px" }}>
                        <select
                            style={{ ...styles.select, maxWidth: "300px" }}
                            value={selectedClient || ""}
                            onChange={(e) => setSelectedClient(parseInt(e.target.value) || null)}
                        >
                            <option value="">All clients</option>
                            {clients.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.owner_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {isLoading ? (
                        <div style={styles.card}>
                            <p style={{ color: "#9ca3af", textAlign: "center", margin: 0 }}>
                                Loading media...
                            </p>
                        </div>
                    ) : assignedMedia.length === 0 ? (
                        <div style={styles.card}>
                            <p style={{ color: "#9ca3af", textAlign: "center", margin: 0 }}>
                                No media assigned yet.
                            </p>
                        </div>
                    ) : (
                        <div style={styles.grid}>
                            {assignedMedia.map((media) => (
                                <div key={media.id} style={styles.fileCard}>
                                    {/* Preview */}
                                    <div style={{
                                        height: "120px",
                                        backgroundColor: "#1f2937",
                                        borderRadius: "4px",
                                        marginBottom: "12px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        overflow: "hidden"
                                    }}>
                                        {media.thumbnail_path ? (
                                            <img
                                                src={`/client-media/${media.thumbnail_path}?v=2`}
                                                alt=""
                                                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                                            />
                                        ) : media.media_type === "image" ? (
                                            <img
                                                src={`/client-media/${media.file_path}?v=2`}
                                                alt=""
                                                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: "48px" }}>🎥</span>
                                        )}
                                    </div>

                                    {/* Media Info */}
                                    <p style={{ color: "#3b82f6", fontSize: "14px", fontWeight: "600", margin: "0 0 4px 0" }}>
                                        {media.owner_name}
                                    </p>
                                    <p style={{ color: "#fff", fontSize: "13px", margin: "0 0 4px 0", wordBreak: "break-all" }}>
                                        {media.filename}
                                    </p>
                                    <p style={{ color: "#9ca3af", fontSize: "12px", margin: "0 0 8px 0" }}>
                                        {media.media_type}
                                        {media.taken_at && ` • ${format(new Date(media.taken_at), "MMM d, yyyy")}`}
                                    </p>

                                    {/* Actions */}
                                    <button
                                        style={{ ...styles.button, ...styles.dangerButton, width: "100%" }}
                                        onClick={() => handleDelete(media.id)}
                                    >
                                        Remove Assignment
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
