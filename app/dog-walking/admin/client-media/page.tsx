"use client";

import React, { useState, useEffect, useMemo } from "react";
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
    const [isReoptimizing, setIsReoptimizing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [optimizationInProgress, setOptimizationInProgress] = useState(false);
    const [videosQueued, setVideosQueued] = useState(0);

    // For assigning files
    const [assigningFile, setAssigningFile] = useState<string | null>(null);
    const [pendingSelections, setPendingSelections] = useState<Record<string, number[]>>({});
    const [pendingDates, setPendingDates] = useState<Record<string, string>>({});

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
            const response = await fetch("/api/dog-walking/admin/clients?limit=100");
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
                setOptimizationInProgress(data.optimizationInProgress ?? false);
                setVideosQueued(data.videosQueued ?? 0);
                if (data.total === 0 && !data.optimizationInProgress) {
                    setSuccessMessage("No new files to assign");
                    setTimeout(() => setSuccessMessage(null), 3000);
                } else if (data.total > 0) {
                    setSuccessMessage(`Found ${data.total} file${data.total !== 1 ? 's' : ''} to assign`);
                    setTimeout(() => setSuccessMessage(null), 4000);
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

    const handleAssign = async (filename: string, extractedDate: string | null) => {
        const selectedIds = pendingSelections[filename] ?? [];
        if (selectedIds.length === 0) {
            setError("Please select at least one client");
            return;
        }

        setAssigningFile(filename);
        setError(null);

        const dateToUse = pendingDates?.[filename] || extractedDate || null;

        try {
            for (const ownerId of selectedIds) {
                const response = await fetch("/api/dog-walking/admin/client-media", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ filename, owner_id: ownerId, taken_at: dateToUse }),
                });
                const data = await response.json();
                if (!data.success) throw new Error(data.error);
            }
            setSuccessMessage(`Assigned ${filename} to ${selectedIds.length} client${selectedIds.length > 1 ? 's' : ''}`);
            setTimeout(() => setSuccessMessage(null), 3000);
            setPendingFiles(prev => prev.filter(f => f.filename !== filename));
            setPendingSelections(prev => { const n = { ...prev }; delete n[filename]; return n; });
            setPendingDates(prev => { const n = { ...prev }; delete n[filename]; return n; });
        } catch (err: any) {
            setError(err.message || "Failed to assign file");
        } finally {
            setAssigningFile(null);
        }
    };

    const handleAlsoAssign = async (filename: string, ownerId: number, takenAt: string | null) => {
        try {
            const response = await fetch("/api/dog-walking/admin/client-media", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filename, owner_id: ownerId, taken_at: takenAt }),
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);
            setSuccessMessage(`Added assignment successfully`);
            setTimeout(() => setSuccessMessage(null), 3000);
            fetchAssignedMedia();
        } catch (err: any) {
            setError(err.message || "Failed to add assignment");
        }
    };

    // Group assigned media by filename for the "all clients" view
    const groupedMedia = useMemo(() => {
        if (selectedClient) return assignedMedia.map(m => ({ ...m, allAssignments: [m] }));
        const map = new Map<string, AssignedMedia[]>();
        assignedMedia.forEach(m => {
            if (!map.has(m.filename)) map.set(m.filename, []);
            map.get(m.filename)!.push(m);
        });
        return Array.from(map.values()).map(group => ({ ...group[0], allAssignments: group }));
    }, [assignedMedia, selectedClient]);

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

    const handleReoptimizeVideos = async () => {
        setIsReoptimizing(true);
        setError(null);

        try {
            const response = await fetch("/api/dog-walking/admin/client-media/reoptimize", {
                method: "POST",
            });

            const data = await response.json();

            if (data.success) {
                let msg = `Optimised ${data.optimized} video${data.optimized !== 1 ? "s" : ""} for streaming`;
                if (data.transcoded > 0 || data.remuxed > 0) {
                    const parts: string[] = [];
                    if (data.transcoded > 0) parts.push(`${data.transcoded} re-encoded`);
                    if (data.remuxed > 0) parts.push(`${data.remuxed} already playable, container only`);
                    msg += ` (${parts.join(", ")})`;
                }
                if (data.bytesBefore > 0 && data.bytesAfter > 0) {
                    const mb = (b: number) => Math.round(b / 1048576);
                    msg += ` — ${mb(data.bytesBefore)} MB to ${mb(data.bytesAfter)} MB`;
                }
                if (data.alreadyOptimized > 0) {
                    msg += `. ${data.alreadyOptimized} already done`;
                }
                if (data.failed > 0) {
                    msg += `. ${data.failed} failed`;
                    if (data.errors && data.errors.length > 0) {
                        console.error("Video optimization errors:", data.errors);
                    }
                }
                // Re-encoding is far slower than the old remux, so each call does
                // a bounded batch. Say plainly that the button needs pressing again.
                if (data.remaining > 0) {
                    msg += `. ${data.remaining} still to do — press again to continue`;
                }
                setSuccessMessage(msg);
                setTimeout(() => setSuccessMessage(null), 12000);
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            setError(err.message || "Failed to re-optimize videos");
        } finally {
            setIsReoptimizing(false);
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

            {/* Background optimisation banner */}
            {optimizationInProgress && (
                <div style={{
                    ...styles.card,
                    backgroundColor: "#1e3a5f",
                    borderColor: "#3b82f6",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                }}>
                    <span style={{ fontSize: "1.2rem" }}>⚙️</span>
                    <p style={{ color: "#93c5fd", margin: 0 }}>
                        Optimising {videosQueued} video{videosQueued !== 1 ? 's' : ''} for streaming in the background. The page is fully usable — scan again to check progress.
                    </p>
                </div>
            )}

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
                    <button
                        style={{ ...styles.button, ...styles.secondaryButton }}
                        onClick={handleReoptimizeVideos}
                        disabled={isReoptimizing}
                    >
                        {isReoptimizing ? "Optimizing..." : "🎬 Re-optimize Videos"}
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
                                                src={`/api/dog-walking/client-media/${file.filePath}?v=4`}
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
                                    <p style={{ color: "#9ca3af", fontSize: "12px", margin: "0 0 4px 0" }}>
                                        {file.mediaType} • {formatFileSize(file.fileSize)}
                                    </p>
                                    <p style={{
                                        fontSize: "12px",
                                        margin: "0 0 8px 0",
                                        color: file.takenAt ? "#10b981" : "#f59e0b"
                                    }}>
                                        📅 {file.takenAt
                                            ? format(new Date(file.takenAt), "dd/MM/yyyy")
                                            : "dd/mm/yyyy (enter manually)"}
                                    </p>

                                    {/* Assignment Form */}
                                    <div style={{ marginTop: "12px" }}>
                                        <p style={{ color: "#9ca3af", fontSize: "11px", margin: "0 0 6px 0" }}>Select clients:</p>
                                        <div style={{ maxHeight: "120px", overflowY: "auto", marginBottom: "8px", padding: "4px", background: "#111827", borderRadius: "4px" }}>
                                            {clients.map((c) => (
                                                <label key={c.id} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", cursor: "pointer" }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={(pendingSelections[file.filename] ?? []).includes(c.id)}
                                                        onChange={(e) => {
                                                            setPendingSelections(prev => {
                                                                const cur = prev[file.filename] ?? [];
                                                                return { ...prev, [file.filename]: e.target.checked ? [...cur, c.id] : cur.filter(id => id !== c.id) };
                                                            });
                                                        }}
                                                    />
                                                    <span style={{ color: "#e5e7eb", fontSize: "0.8rem" }}>{c.owner_name}</span>
                                                </label>
                                            ))}
                                        </div>

                                        <input
                                            type="date"
                                            style={{ ...styles.input, marginBottom: "8px" }}
                                            value={pendingDates?.[file.filename] ?? ""}
                                            onChange={(e) => setPendingDates(prev => ({ ...prev, [file.filename]: e.target.value }))}
                                            placeholder="Date taken (optional)"
                                        />

                                        <button
                                            style={{ ...styles.button, ...styles.successButton, width: "100%" }}
                                            onClick={() => handleAssign(file.filename, file.takenAt)}
                                            disabled={assigningFile === file.filename || !(pendingSelections[file.filename]?.length)}
                                        >
                                            {assigningFile === file.filename ? "Assigning..." :
                                                (pendingSelections[file.filename]?.length ?? 0) > 0
                                                    ? `Assign to ${pendingSelections[file.filename].length} client${pendingSelections[file.filename].length > 1 ? 's' : ''}`
                                                    : "Select clients above"}
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
                            {groupedMedia.map((media) => (
                                <div key={media.filename} style={styles.fileCard}>
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
                                                src={`/api/dog-walking/client-media/${media.thumbnail_path}?v=4`}
                                                alt=""
                                                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                                            />
                                        ) : media.media_type === "image" ? (
                                            <img
                                                src={`/api/dog-walking/client-media/${media.file_path}?v=4`}
                                                alt=""
                                                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: "48px" }}>🎥</span>
                                        )}
                                    </div>

                                    {/* Owner tags */}
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "6px" }}>
                                        {media.allAssignments.map(a => (
                                            <span key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#1e3a5f", color: "#93c5fd", borderRadius: "4px", padding: "2px 6px", fontSize: "0.75rem" }}>
                                                {a.owner_name}
                                                <button
                                                    onClick={() => handleDelete(a.id)}
                                                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 0, fontSize: "0.85rem", lineHeight: 1 }}
                                                    title="Remove this assignment"
                                                >×</button>
                                            </span>
                                        ))}
                                    </div>

                                    {/* File info */}
                                    <p style={{ color: "#fff", fontSize: "13px", margin: "0 0 4px 0", wordBreak: "break-all" }}>
                                        {media.filename}
                                    </p>
                                    <p style={{ color: "#9ca3af", fontSize: "12px", margin: "0 0 8px 0" }}>
                                        {media.media_type}
                                        {media.taken_at && ` • ${format(new Date(media.taken_at), "MMM d, yyyy")}`}
                                    </p>

                                    {/* Also assign to another client */}
                                    {!selectedClient && clients.filter(c => !media.allAssignments.some(a => a.owner_id === c.id)).length > 0 && (
                                        <select
                                            defaultValue=""
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleAlsoAssign(media.filename, parseInt(e.target.value), media.taken_at);
                                                    e.target.value = "";
                                                }
                                            }}
                                            style={{ ...styles.select, fontSize: "0.8rem", marginTop: "4px" }}
                                        >
                                            <option value="" disabled>Also assign to…</option>
                                            {clients
                                                .filter(c => !media.allAssignments.some(a => a.owner_id === c.id))
                                                .map(c => <option key={c.id} value={c.id}>{c.owner_name}</option>)
                                            }
                                        </select>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
