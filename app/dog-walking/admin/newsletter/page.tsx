"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";

interface NewPackMember {
    dog_id: number;
    dog_name: string;
    breed: string;
    image_filename: string | null;
    owner_id: number;
    owner_name: string;
    first_service_date: string;
    selected?: boolean;
}

interface NewsletterContent {
    title: string;
    month: string;
    welcomeMessage: string;
    newPackMembers: {
        dogId: number;
        dogName: string;
        breed: string;
        ownerName: string;
        imageFilename: string | null;
        firstServiceDate: string;
    }[];
    packFarewells: string;
    walkHighlights: {
        text: string;
        images: string[];
    };
    seasonalTips: string;
    newFeatures: string;
}

interface Newsletter {
    id: number;
    title: string;
    content: NewsletterContent;
    created_at: string;
    updated_at: string;
    sent_at: string | null;
    recipient_count: number;
    status: "draft" | "sent";
}

export default function NewsletterPage() {
    // State
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
    const [subscriberCount, setSubscriberCount] = useState(0);
    const [newPackMembers, setNewPackMembers] = useState<NewPackMember[]>([]);

    const [showPreview, setShowPreview] = useState(false);
    const [previewHtml, setPreviewHtml] = useState("");

    const [currentNewsletterId, setCurrentNewsletterId] = useState<number | null>(null);
    const [testEmail, setTestEmail] = useState("");

    // Form state
    const currentMonth = format(new Date(), "MMMM yyyy");
    const [title, setTitle] = useState(`${currentMonth} - Hunter's Pack News`);
    const [welcomeMessage, setWelcomeMessage] = useState("");
    const [packFarewells, setPackFarewells] = useState("");
    const [walkHighlightsText, setWalkHighlightsText] = useState("");
    const [walkHighlightImages, setWalkHighlightImages] = useState<string[]>(["", "", "", ""]);
    const [seasonalTips, setSeasonalTips] = useState("");
    const [newFeatures, setNewFeatures] = useState("");

    // Fetch initial data
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch newsletters and subscriber count
            const newsletterRes = await fetch("/api/dog-walking/admin/newsletter", {
                credentials: "include"
            });
            if (newsletterRes.ok) {
                const data = await newsletterRes.json();
                setNewsletters(data.newsletters || []);
                setSubscriberCount(data.subscriber_count || 0);
            }

            // Fetch new pack members for current month
            const year = new Date().getFullYear();
            const month = new Date().getMonth() + 1;
            const newDogsRes = await fetch(
                `/api/dog-walking/admin/newsletter/new-dogs?year=${year}&month=${month}`,
                { credentials: "include" }
            );
            if (newDogsRes.ok) {
                const data = await newDogsRes.json();
                setNewPackMembers(
                    (data.new_pack_members || []).map((dog: NewPackMember) => ({
                        ...dog,
                        selected: true
                    }))
                );
            }
        } catch (err) {
            console.error("Failed to fetch data:", err);
            setError("Failed to load data");
        } finally {
            setIsLoading(false);
        }
    };

    // Build content object from form state
    const buildContent = (): NewsletterContent => {
        const selectedMembers = newPackMembers
            .filter(m => m.selected)
            .map(m => ({
                dogId: m.dog_id,
                dogName: m.dog_name,
                breed: m.breed,
                ownerName: m.owner_name,
                imageFilename: m.image_filename,
                firstServiceDate: m.first_service_date
            }));

        return {
            title,
            month: currentMonth,
            welcomeMessage,
            newPackMembers: selectedMembers,
            packFarewells,
            walkHighlights: {
                text: walkHighlightsText,
                images: walkHighlightImages.filter(url => url.trim() !== "")
            },
            seasonalTips,
            newFeatures
        };
    };

    // Save draft
    const handleSaveDraft = async () => {
        setIsSaving(true);
        setError(null);

        try {
            const res = await fetch("/api/dog-walking/admin/newsletter", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    id: currentNewsletterId,
                    title,
                    content: buildContent()
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to save draft");
            }

            setCurrentNewsletterId(data.newsletter.id);
            setSuccessMessage("Draft saved successfully!");
            fetchData(); // Refresh list

            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Generate preview
    const handlePreview = async () => {
        // Build preview HTML client-side (simplified version)
        const content = buildContent();

        // For a proper preview, we'd call an API to generate the HTML
        // For now, create a simplified preview
        const previewContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; padding: 20px;">
                <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0;">🐕 Hunter's Hounds</h1>
                    <p style="margin: 5px 0 0;">${content.month} Newsletter</p>
                </div>
                <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
                    <div style="margin-bottom: 20px;">
                        <p style="white-space: pre-line;">${content.welcomeMessage || '<em>No welcome message</em>'}</p>
                    </div>
                    ${content.newPackMembers.length > 0 ? `
                        <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <h3 style="color: #1e40af; margin-top: 0;">🐕 Welcome to the Pack!</h3>
                            <p>New members: ${content.newPackMembers.map(m => m.dogName).join(', ')}</p>
                        </div>
                    ` : ''}
                    ${content.packFarewells ? `
                        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <h3 style="color: #92400e; margin-top: 0;">👋 Pack Farewells</h3>
                            <p style="white-space: pre-line;">${content.packFarewells}</p>
                        </div>
                    ` : ''}
                    ${content.walkHighlights.text ? `
                        <div style="margin: 15px 0;">
                            <h3>📸 Walk Highlights</h3>
                            <p style="white-space: pre-line;">${content.walkHighlights.text}</p>
                        </div>
                    ` : ''}
                    ${content.seasonalTips ? `
                        <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <h3 style="color: #065f46; margin-top: 0;">🌿 Seasonal Tips</h3>
                            <p style="white-space: pre-line;">${content.seasonalTips}</p>
                        </div>
                    ` : ''}
                    ${content.newFeatures ? `
                        <div style="background: #f5f3ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <h3 style="color: #5b21b6; margin-top: 0;">✨ What's New</h3>
                            <p style="white-space: pre-line;">${content.newFeatures}</p>
                        </div>
                    ` : ''}
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <p>Until next time,<br><strong>Ernesto</strong><br>Hunter's Hounds</p>
                    </div>
                </div>
                <div style="background: #f9fafb; padding: 15px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                        <a href="#" style="color: #9ca3af;">Unsubscribe from Hunter's Pack newsletter</a>
                    </p>
                </div>
            </div>
        `;

        setPreviewHtml(previewContent);
        setShowPreview(true);
    };

    // Send test email
    const handleSendTest = async () => {
        if (!testEmail) {
            setError("Please enter a test email address");
            return;
        }

        // First save the draft if not saved
        if (!currentNewsletterId) {
            await handleSaveDraft();
        }

        if (!currentNewsletterId) {
            setError("Please save the newsletter first");
            return;
        }

        setIsSending(true);
        setError(null);

        try {
            const res = await fetch("/api/dog-walking/admin/newsletter/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    newsletter_id: currentNewsletterId,
                    test_email: testEmail
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to send test email");
            }

            setSuccessMessage(`Test email sent to ${testEmail}!`);
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSending(false);
        }
    };

    // Send to all subscribers
    const handleSendToAll = async () => {
        if (!currentNewsletterId) {
            setError("Please save the newsletter first");
            return;
        }

        if (!confirm(`Are you sure you want to send this newsletter to ${subscriberCount} subscribers?`)) {
            return;
        }

        setIsSending(true);
        setError(null);

        try {
            const res = await fetch("/api/dog-walking/admin/newsletter/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    newsletter_id: currentNewsletterId
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to send newsletter");
            }

            setSuccessMessage(`Newsletter sent to ${data.sent_count} subscribers!`);
            fetchData(); // Refresh list
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSending(false);
        }
    };

    // Load a previous newsletter
    const handleLoadNewsletter = (newsletter: Newsletter) => {
        setCurrentNewsletterId(newsletter.id);
        setTitle(newsletter.content.title || newsletter.title);
        setWelcomeMessage(newsletter.content.welcomeMessage || "");
        setPackFarewells(newsletter.content.packFarewells || "");
        setWalkHighlightsText(newsletter.content.walkHighlights?.text || "");
        setWalkHighlightImages([
            ...(newsletter.content.walkHighlights?.images || []),
            "", "", "", ""
        ].slice(0, 4));
        setSeasonalTips(newsletter.content.seasonalTips || "");
        setNewFeatures(newsletter.content.newFeatures || "");
    };

    // Clear form for new newsletter
    const handleNewNewsletter = () => {
        setCurrentNewsletterId(null);
        setTitle(`${currentMonth} - Hunter's Pack News`);
        setWelcomeMessage("");
        setPackFarewells("");
        setWalkHighlightsText("");
        setWalkHighlightImages(["", "", "", ""]);
        setSeasonalTips("");
        setNewFeatures("");
        setNewPackMembers(prev => prev.map(m => ({ ...m, selected: true })));
    };

    // Styles
    const styles = {
        container: {
            minHeight: "100vh",
            backgroundColor: "#0f172a",
            padding: "20px",
        } as React.CSSProperties,
        header: {
            maxWidth: "1200px",
            margin: "0 auto 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
        } as React.CSSProperties,
        title: {
            color: "#fff",
            fontSize: "24px",
            fontWeight: "bold",
        } as React.CSSProperties,
        content: {
            maxWidth: "1200px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 300px",
            gap: "20px",
        } as React.CSSProperties,
        card: {
            backgroundColor: "#1e293b",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "20px",
            border: "1px solid #334155",
        } as React.CSSProperties,
        sectionTitle: {
            color: "#fff",
            fontSize: "16px",
            fontWeight: "600",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
        } as React.CSSProperties,
        input: {
            width: "100%",
            padding: "12px",
            borderRadius: "6px",
            border: "1px solid #475569",
            backgroundColor: "#0f172a",
            color: "#fff",
            fontSize: "14px",
        } as React.CSSProperties,
        textarea: {
            width: "100%",
            padding: "12px",
            borderRadius: "6px",
            border: "1px solid #475569",
            backgroundColor: "#0f172a",
            color: "#fff",
            fontSize: "14px",
            minHeight: "120px",
            resize: "vertical" as const,
        } as React.CSSProperties,
        button: {
            padding: "10px 20px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
        } as React.CSSProperties,
        primaryButton: {
            backgroundColor: "#3b82f6",
            color: "#fff",
        } as React.CSSProperties,
        secondaryButton: {
            backgroundColor: "#475569",
            color: "#fff",
        } as React.CSSProperties,
        successButton: {
            backgroundColor: "#059669",
            color: "#fff",
        } as React.CSSProperties,
        sidebar: {
            position: "sticky" as const,
            top: "20px",
        } as React.CSSProperties,
        error: {
            backgroundColor: "#7f1d1d",
            color: "#fecaca",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "20px",
        } as React.CSSProperties,
        success: {
            backgroundColor: "#065f46",
            color: "#a7f3d0",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "20px",
        } as React.CSSProperties,
    };

    if (isLoading) {
        return (
            <div style={styles.container}>
                <div style={{ textAlign: "center", padding: "60px", color: "#94a3b8" }}>
                    Loading...
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.title}>📰 Newsletter Composer</h1>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button
                        onClick={handleNewNewsletter}
                        style={{ ...styles.button, ...styles.secondaryButton }}
                    >
                        New Newsletter
                    </button>
                    <button
                        onClick={handlePreview}
                        style={{ ...styles.button, ...styles.secondaryButton }}
                    >
                        Preview
                    </button>
                    <button
                        onClick={handleSaveDraft}
                        disabled={isSaving}
                        style={{ ...styles.button, ...styles.primaryButton }}
                    >
                        {isSaving ? "Saving..." : "Save Draft"}
                    </button>
                </div>
            </div>

            {/* Messages */}
            {error && <div style={{ ...styles.error, maxWidth: "1200px", margin: "0 auto 20px" }}>{error}</div>}
            {successMessage && <div style={{ ...styles.success, maxWidth: "1200px", margin: "0 auto 20px" }}>{successMessage}</div>}

            <div style={styles.content}>
                {/* Main Editor */}
                <div>
                    {/* Title */}
                    <div style={styles.card}>
                        <label style={styles.sectionTitle}>Newsletter Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            style={styles.input}
                            placeholder="January 2025 - Hunter's Pack News"
                        />
                    </div>

                    {/* Welcome Message */}
                    <div style={styles.card}>
                        <label style={styles.sectionTitle}>👋 Welcome Message</label>
                        <textarea
                            value={welcomeMessage}
                            onChange={e => setWelcomeMessage(e.target.value)}
                            style={styles.textarea}
                            placeholder="Happy New Year to all our wonderful pack members!&#10;&#10;January has been a fantastic month with lots of adventures..."
                        />
                    </div>

                    {/* New Pack Members */}
                    <div style={styles.card}>
                        <label style={styles.sectionTitle}>
                            🐕 New Pack Members
                            <span style={{ color: "#64748b", fontWeight: "normal", fontSize: "12px", marginLeft: "8px" }}>
                                (First service this month)
                            </span>
                        </label>
                        {newPackMembers.length === 0 ? (
                            <p style={{ color: "#64748b", fontSize: "14px" }}>No new dogs this month</p>
                        ) : (
                            <div>
                                {newPackMembers.map(dog => (
                                    <label
                                        key={dog.dog_id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "12px",
                                            padding: "10px",
                                            backgroundColor: dog.selected ? "#1e3a5f" : "#0f172a",
                                            borderRadius: "6px",
                                            marginBottom: "8px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={dog.selected}
                                            onChange={e => {
                                                setNewPackMembers(prev =>
                                                    prev.map(m =>
                                                        m.dog_id === dog.dog_id
                                                            ? { ...m, selected: e.target.checked }
                                                            : m
                                                    )
                                                );
                                            }}
                                        />
                                        {dog.image_filename && (
                                            <img
                                                src={`/api/dog-images/${dog.image_filename}`}
                                                alt={dog.dog_name}
                                                style={{
                                                    width: "40px",
                                                    height: "40px",
                                                    borderRadius: "50%",
                                                    objectFit: "cover",
                                                }}
                                            />
                                        )}
                                        <div>
                                            <div style={{ color: "#fff", fontWeight: "600" }}>{dog.dog_name}</div>
                                            <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                                                {dog.breed} • First walk: {format(new Date(dog.first_service_date), "MMM d")}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pack Farewells */}
                    <div style={styles.card}>
                        <label style={styles.sectionTitle}>👋 Pack Farewells</label>
                        <textarea
                            value={packFarewells}
                            onChange={e => setPackFarewells(e.target.value)}
                            style={styles.textarea}
                            placeholder="We say goodbye to Buster who moved to Scotland with his family. We'll miss his energetic spirit on our morning walks!"
                        />
                    </div>

                    {/* Walk Highlights */}
                    <div style={styles.card}>
                        <label style={styles.sectionTitle}>📸 Walk Highlights</label>
                        <textarea
                            value={walkHighlightsText}
                            onChange={e => setWalkHighlightsText(e.target.value)}
                            style={{ ...styles.textarea, marginBottom: "12px" }}
                            placeholder="This month we explored Hampstead Heath and discovered some beautiful new trails..."
                        />
                        <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "8px" }}>
                            Image URLs (up to 4)
                        </label>
                        {walkHighlightImages.map((url, idx) => (
                            <input
                                key={idx}
                                type="text"
                                value={url}
                                onChange={e => {
                                    const newImages = [...walkHighlightImages];
                                    newImages[idx] = e.target.value;
                                    setWalkHighlightImages(newImages);
                                }}
                                style={{ ...styles.input, marginBottom: "8px" }}
                                placeholder={`Image URL ${idx + 1}`}
                            />
                        ))}
                    </div>

                    {/* Seasonal Tips */}
                    <div style={styles.card}>
                        <label style={styles.sectionTitle}>🌿 Seasonal Tips</label>
                        <textarea
                            value={seasonalTips}
                            onChange={e => setSeasonalTips(e.target.value)}
                            style={styles.textarea}
                            placeholder="With the cold weather, remember to check your dog's paws for ice and salt after walks..."
                        />
                    </div>

                    {/* New Features */}
                    <div style={styles.card}>
                        <label style={styles.sectionTitle}>✨ What's New</label>
                        <textarea
                            value={newFeatures}
                            onChange={e => setNewFeatures(e.target.value)}
                            style={styles.textarea}
                            placeholder="We've added new features to your customer dashboard..."
                        />
                    </div>
                </div>

                {/* Sidebar */}
                <div style={styles.sidebar}>
                    {/* Send Section */}
                    <div style={styles.card}>
                        <label style={styles.sectionTitle}>📬 Send Newsletter</label>
                        <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "15px" }}>
                            <strong>{subscriberCount}</strong> subscribers
                        </p>

                        <div style={{ marginBottom: "15px" }}>
                            <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "6px" }}>
                                Send test to:
                            </label>
                            <input
                                type="email"
                                value={testEmail}
                                onChange={e => setTestEmail(e.target.value)}
                                style={{ ...styles.input, marginBottom: "8px" }}
                                placeholder="test@email.com"
                            />
                            <button
                                onClick={handleSendTest}
                                disabled={isSending || !testEmail}
                                style={{
                                    ...styles.button,
                                    ...styles.secondaryButton,
                                    width: "100%",
                                    opacity: isSending || !testEmail ? 0.5 : 1,
                                }}
                            >
                                {isSending ? "Sending..." : "Send Test"}
                            </button>
                        </div>

                        <button
                            onClick={handleSendToAll}
                            disabled={isSending || !currentNewsletterId}
                            style={{
                                ...styles.button,
                                ...styles.successButton,
                                width: "100%",
                                opacity: isSending || !currentNewsletterId ? 0.5 : 1,
                            }}
                        >
                            {isSending ? "Sending..." : `Send to ${subscriberCount} Subscribers`}
                        </button>

                        {!currentNewsletterId && (
                            <p style={{ color: "#f59e0b", fontSize: "12px", marginTop: "10px" }}>
                                Save the newsletter first before sending
                            </p>
                        )}
                    </div>

                    {/* Previous Newsletters */}
                    <div style={styles.card}>
                        <label style={styles.sectionTitle}>📋 Previous Newsletters</label>
                        {newsletters.length === 0 ? (
                            <p style={{ color: "#64748b", fontSize: "14px" }}>No newsletters yet</p>
                        ) : (
                            <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                                {newsletters.map(nl => (
                                    <div
                                        key={nl.id}
                                        onClick={() => handleLoadNewsletter(nl)}
                                        style={{
                                            padding: "10px",
                                            backgroundColor: currentNewsletterId === nl.id ? "#1e3a5f" : "#0f172a",
                                            borderRadius: "6px",
                                            marginBottom: "8px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <div style={{ color: "#fff", fontSize: "13px", fontWeight: "500" }}>
                                            {nl.title}
                                        </div>
                                        <div style={{ color: "#64748b", fontSize: "11px", marginTop: "4px" }}>
                                            {nl.status === "sent" ? (
                                                <span style={{ color: "#10b981" }}>
                                                    Sent {format(new Date(nl.sent_at!), "MMM d")} to {nl.recipient_count}
                                                </span>
                                            ) : (
                                                <span style={{ color: "#f59e0b" }}>Draft</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {showPreview && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0,0,0,0.8)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                        padding: "20px",
                    }}
                    onClick={() => setShowPreview(false)}
                >
                    <div
                        style={{
                            backgroundColor: "#f3f4f6",
                            borderRadius: "12px",
                            maxWidth: "700px",
                            maxHeight: "90vh",
                            width: "100%",
                            overflow: "auto",
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{
                            padding: "15px 20px",
                            borderBottom: "1px solid #e5e7eb",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            position: "sticky",
                            top: 0,
                            backgroundColor: "#fff",
                        }}>
                            <h3 style={{ margin: 0 }}>Email Preview</h3>
                            <button
                                onClick={() => setShowPreview(false)}
                                style={{
                                    ...styles.button,
                                    ...styles.secondaryButton,
                                    padding: "6px 12px",
                                }}
                            >
                                Close
                            </button>
                        </div>
                        <div
                            style={{ padding: "20px" }}
                            dangerouslySetInnerHTML={{ __html: previewHtml }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
