"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";

interface WelcomeBlock {
    type: "text" | "image";
    content: string;
    caption?: string;
}

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
    welcomeMessage?: string; // Legacy support
    welcomeBlocks?: WelcomeBlock[];
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
    // Notion fields
    source?: "editor" | "notion";
    notionPageId?: string;
    notionBlocks?: any[];
    notionHtml?: string;
    includeNewPackMembers?: boolean;
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

interface NotionPage {
    id: string;
    title: string;
    status: string;
    month: string | null;
    last_edited: string;
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
    const [welcomeBlocks, setWelcomeBlocks] = useState<WelcomeBlock[]>([
        { type: "text", content: "" }
    ]);
    const [packFarewells, setPackFarewells] = useState("");
    const [walkHighlightsText, setWalkHighlightsText] = useState("");
    const [walkHighlightImages, setWalkHighlightImages] = useState<string[]>(["", "", "", ""]);
    const [seasonalTips, setSeasonalTips] = useState("");
    const [newFeatures, setNewFeatures] = useState("");

    // New Pack Members month selector
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

    // Notion state
    const [importMode, setImportMode] = useState<"editor" | "notion">("editor");
    const [showNotionImport, setShowNotionImport] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [notionPages, setNotionPages] = useState<NotionPage[]>([]);
    const [isLoadingNotionPages, setIsLoadingNotionPages] = useState(false);
    const [notionHtml, setNotionHtml] = useState("");
    const [notionBlocks, setNotionBlocks] = useState<any[]>([]);
    const [notionPageId, setNotionPageId] = useState("");
    const [includeNewPackMembers, setIncludeNewPackMembers] = useState(true);
    const [notionImageCount, setNotionImageCount] = useState(0);

    // Fetch initial data
    useEffect(() => {
        fetchData();
    }, []);

    // Re-fetch new dogs when month changes
    useEffect(() => {
        fetchNewDogs(selectedYear, selectedMonth);
    }, [selectedYear, selectedMonth]);

    const fetchNewDogs = async (year: number, month: number) => {
        try {
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
            console.error("Failed to fetch new dogs:", err);
        }
    };

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

            // Fetch new pack members for selected month
            await fetchNewDogs(selectedYear, selectedMonth);
        } catch (err) {
            console.error("Failed to fetch data:", err);
            setError("Failed to load data");
        } finally {
            setIsLoading(false);
        }
    };

    // Notion import functions
    const fetchNotionPages = async () => {
        setIsLoadingNotionPages(true);
        try {
            const res = await fetch("/api/dog-walking/admin/newsletter/notion-pages", {
                credentials: "include"
            });
            if (res.ok) {
                const data = await res.json();
                setNotionPages(data.pages || []);
            } else {
                const data = await res.json();
                setError(data.error || "Failed to load Notion pages");
            }
        } catch (err) {
            console.error("Failed to fetch Notion pages:", err);
            setError("Failed to load Notion pages");
        } finally {
            setIsLoadingNotionPages(false);
        }
    };

    const handleOpenNotionImport = () => {
        setShowNotionImport(true);
        fetchNotionPages();
    };

    const handleImportNotionPage = async (pageId: string) => {
        setIsImporting(true);
        setError(null);
        setShowNotionImport(false);

        try {
            const res = await fetch("/api/dog-walking/admin/newsletter/import-notion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ notion_page_id: pageId })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to import from Notion");
            }

            setImportMode("notion");
            setTitle(data.title || title);
            setNotionHtml(data.notionHtml);
            setNotionBlocks(data.blocks);
            setNotionPageId(data.notion_page_id);
            setNotionImageCount(data.image_count || 0);
            setSuccessMessage(`Imported "${data.title}" from Notion (${data.blocks.length} blocks, ${data.image_count} images)`);
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsImporting(false);
        }
    };

    const handleReimport = async () => {
        if (notionPageId) {
            await handleImportNotionPage(notionPageId);
        }
    };

    const handleSwitchToEditor = () => {
        setImportMode("editor");
        setNotionHtml("");
        setNotionBlocks([]);
        setNotionPageId("");
    };

    // Welcome block management
    const addTextBlock = () => {
        setWelcomeBlocks([...welcomeBlocks, { type: "text", content: "" }]);
    };

    const addImageBlock = () => {
        setWelcomeBlocks([...welcomeBlocks, { type: "image", content: "", caption: "" }]);
    };

    const updateBlock = (index: number, updates: Partial<WelcomeBlock>) => {
        const newBlocks = [...welcomeBlocks];
        newBlocks[index] = { ...newBlocks[index], ...updates };
        setWelcomeBlocks(newBlocks);
    };

    const removeBlock = (index: number) => {
        if (welcomeBlocks.length === 1) {
            setWelcomeBlocks([{ type: "text", content: "" }]);
            return;
        }
        setWelcomeBlocks(welcomeBlocks.filter((_, i) => i !== index));
    };

    const moveBlock = (index: number, direction: "up" | "down") => {
        if (
            (direction === "up" && index === 0) ||
            (direction === "down" && index === welcomeBlocks.length - 1)
        ) {
            return;
        }
        const newBlocks = [...welcomeBlocks];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
        setWelcomeBlocks(newBlocks);
    };

    // Build content object from form state
    const buildContent = (): NewsletterContent => {
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const contentMonth = `${monthNames[selectedMonth - 1]} ${selectedYear}`;

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

        if (importMode === "notion") {
            return {
                title,
                month: contentMonth,
                source: "notion",
                notionPageId,
                notionBlocks,
                notionHtml,
                includeNewPackMembers,
                newPackMembers: includeNewPackMembers ? selectedMembers : [],
                // These fields are required by the interface but unused in Notion mode
                packFarewells: "",
                walkHighlights: { text: "", images: [] },
                seasonalTips: "",
                newFeatures: "",
            };
        }

        return {
            title,
            month: contentMonth,
            welcomeBlocks: welcomeBlocks.filter(b => b.content.trim() !== ""),
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
        const content = buildContent();

        if (importMode === "notion" && notionHtml) {
            // Notion mode preview
            const selectedMembers = newPackMembers
                .filter(m => m.selected)
                .map(m => ({
                    dogName: m.dog_name,
                    breed: m.breed,
                    imageFilename: m.image_filename,
                }));

            let newMembersPreview = "";
            if (includeNewPackMembers && selectedMembers.length > 0) {
                newMembersPreview = `
                    <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #1e40af; margin-top: 0;">🐕 Welcome to the Pack!</h3>
                        <div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: center;">
                            ${selectedMembers.map(m => `
                                <div style="text-align: center;">
                                    ${m.imageFilename ? `
                                        <img src="/api/dog-images/${m.imageFilename}"
                                             style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; border: 3px solid #3b82f6;">
                                    ` : `
                                        <div style="width: 150px; height: 150px; border-radius: 50%; background: #dbeafe; display: flex; align-items: center; justify-content: center; font-size: 48px;">
                                            🐕
                                        </div>
                                    `}
                                    <p style="margin: 8px 0 2px; font-weight: bold;">${m.dogName}</p>
                                    <p style="margin: 0; color: #6b7280; font-size: 13px;">${m.breed}</p>
                                </div>
                            `).join("")}
                        </div>
                    </div>
                `;
            }

            const previewContent = `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
                    <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0;">🐕 Hunter's Hounds</h1>
                        <p style="margin: 5px 0 0;">${content.month} Newsletter</p>
                    </div>
                    <div style="padding: 20px 30px; border: 1px solid #e5e7eb; border-top: none;">
                        ${notionHtml}
                        ${newMembersPreview}
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
            return;
        }

        // Editor mode preview (existing logic)
        const welcomeHtml = (content.welcomeBlocks || []).map(block => {
            if (block.type === "text") {
                return `<p style="white-space: pre-line; margin: 0 0 15px;">${block.content}</p>`;
            } else {
                return `
                    <div style="text-align: center; margin: 20px 0;">
                        <img src="/api/newsletter-images/${block.content}"
                             alt="${block.caption || ''}"
                             style="max-width: 100%; border-radius: 8px; border: 2px solid #e5e7eb;">
                        ${block.caption ? `<p style="color: #6b7280; font-size: 14px; margin: 8px 0 0; font-style: italic;">${block.caption}</p>` : ''}
                    </div>
                `;
            }
        }).join("");

        const previewContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; padding: 20px;">
                <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0;">🐕 Hunter's Hounds</h1>
                    <p style="margin: 5px 0 0;">${content.month} Newsletter</p>
                </div>
                <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
                    <div style="margin-bottom: 20px;">
                        ${welcomeHtml || '<em style="color: #9ca3af;">No welcome message</em>'}
                    </div>
                    ${content.newPackMembers.length > 0 ? `
                        <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <h3 style="color: #1e40af; margin-top: 0;">🐕 Welcome to the Pack!</h3>
                            <div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: center;">
                                ${content.newPackMembers.map((m: any) => `
                                    <div style="text-align: center;">
                                        ${(m.imageFilename || m.image_filename) ? `
                                            <img src="/api/dog-images/${m.imageFilename || m.image_filename}"
                                                 style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; border: 3px solid #3b82f6;">
                                        ` : `
                                            <div style="width: 150px; height: 150px; border-radius: 50%; background: #dbeafe; display: flex; align-items: center; justify-content: center; font-size: 48px;">
                                                🐕
                                            </div>
                                        `}
                                        <p style="margin: 8px 0 2px; font-weight: bold;">${m.dogName || m.dog_name}</p>
                                        <p style="margin: 0; color: #6b7280; font-size: 13px;">${m.breed || m.dog_breed}</p>
                                    </div>
                                `).join("")}
                            </div>
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
                            ${content.walkHighlights.images.length > 0 ? `
                                <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;">
                                    ${content.walkHighlights.images.map(img => `
                                        <img src="/api/newsletter-images/${img}"
                                             style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px;">
                                    `).join("")}
                                </div>
                            ` : ''}
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

    // Convert legacy welcomeMessage to welcomeBlocks
    const convertLegacyContent = (content: NewsletterContent): WelcomeBlock[] => {
        if (content.welcomeBlocks && content.welcomeBlocks.length > 0) {
            return content.welcomeBlocks;
        }
        if (content.welcomeMessage) {
            return [{ type: "text", content: content.welcomeMessage }];
        }
        return [{ type: "text", content: "" }];
    };

    // Load a previous newsletter
    const handleLoadNewsletter = (newsletter: Newsletter) => {
        setCurrentNewsletterId(newsletter.id);
        setTitle(newsletter.content.title || newsletter.title);

        if (newsletter.content.source === "notion") {
            // Restore Notion mode
            setImportMode("notion");
            setNotionHtml(newsletter.content.notionHtml || "");
            setNotionBlocks(newsletter.content.notionBlocks || []);
            setNotionPageId(newsletter.content.notionPageId || "");
            setIncludeNewPackMembers(newsletter.content.includeNewPackMembers !== false);
        } else {
            // Restore editor mode
            setImportMode("editor");
            setNotionHtml("");
            setNotionBlocks([]);
            setNotionPageId("");
            setWelcomeBlocks(convertLegacyContent(newsletter.content));
            setPackFarewells(newsletter.content.packFarewells || "");
            setWalkHighlightsText(newsletter.content.walkHighlights?.text || "");
            setWalkHighlightImages([
                ...(newsletter.content.walkHighlights?.images || []),
                "", "", "", ""
            ].slice(0, 4));
            setSeasonalTips(newsletter.content.seasonalTips || "");
            setNewFeatures(newsletter.content.newFeatures || "");
        }
    };

    // Clear form for new newsletter
    const handleNewNewsletter = () => {
        setCurrentNewsletterId(null);
        setImportMode("editor");
        setTitle(`${currentMonth} - Hunter's Pack News`);
        setWelcomeBlocks([{ type: "text", content: "" }]);
        setPackFarewells("");
        setWalkHighlightsText("");
        setWalkHighlightImages(["", "", "", ""]);
        setSeasonalTips("");
        setNewFeatures("");
        setNotionHtml("");
        setNotionBlocks([]);
        setNotionPageId("");
        setIncludeNewPackMembers(true);
        setSelectedYear(new Date().getFullYear());
        setSelectedMonth(new Date().getMonth() + 1);
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
        notionButton: {
            backgroundColor: "#7c3aed",
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
        blockContainer: {
            backgroundColor: "#0f172a",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "12px",
            border: "1px solid #334155",
        } as React.CSSProperties,
        blockHeader: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
        } as React.CSSProperties,
        blockType: {
            color: "#94a3b8",
            fontSize: "12px",
            fontWeight: "600",
            textTransform: "uppercase" as const,
            display: "flex",
            alignItems: "center",
            gap: "6px",
        } as React.CSSProperties,
        blockControls: {
            display: "flex",
            gap: "4px",
        } as React.CSSProperties,
        iconButton: {
            padding: "4px 8px",
            borderRadius: "4px",
            border: "none",
            backgroundColor: "#334155",
            color: "#94a3b8",
            cursor: "pointer",
            fontSize: "12px",
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
                        onClick={handleOpenNotionImport}
                        disabled={isImporting}
                        style={{ ...styles.button, ...styles.notionButton }}
                    >
                        {isImporting ? "Importing..." : "Import from Notion"}
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

                    {importMode === "notion" ? (
                        <>
                            {/* Notion Content Preview */}
                            <div style={styles.card}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                                    <label style={{ ...styles.sectionTitle, marginBottom: 0 }}>
                                        <span style={{
                                            display: "inline-block",
                                            width: "8px",
                                            height: "8px",
                                            borderRadius: "50%",
                                            backgroundColor: "#7c3aed",
                                            marginRight: "8px",
                                        }} />
                                        Imported from Notion
                                    </label>
                                    <div style={{ display: "flex", gap: "8px" }}>
                                        <button
                                            onClick={handleReimport}
                                            disabled={isImporting}
                                            style={{
                                                ...styles.button,
                                                ...styles.notionButton,
                                                padding: "6px 14px",
                                                fontSize: "13px",
                                                opacity: isImporting ? 0.5 : 1,
                                            }}
                                        >
                                            {isImporting ? "Importing..." : "Re-import"}
                                        </button>
                                        <button
                                            onClick={handleSwitchToEditor}
                                            style={{
                                                ...styles.button,
                                                ...styles.secondaryButton,
                                                padding: "6px 14px",
                                                fontSize: "13px",
                                            }}
                                        >
                                            Use Editor
                                        </button>
                                    </div>
                                </div>
                                <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "15px" }}>
                                    {notionBlocks.length} blocks, {notionImageCount} images imported
                                </p>
                                <div
                                    style={{
                                        backgroundColor: "#fff",
                                        borderRadius: "8px",
                                        padding: "20px 24px",
                                        maxHeight: "600px",
                                        overflowY: "auto",
                                    }}
                                    dangerouslySetInnerHTML={{ __html: notionHtml }}
                                />
                            </div>

                            {/* New Pack Members Toggle */}
                            <div style={styles.card}>
                                <label style={{
                                    ...styles.sectionTitle,
                                    cursor: "pointer",
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={includeNewPackMembers}
                                        onChange={e => setIncludeNewPackMembers(e.target.checked)}
                                        style={{ marginRight: "4px" }}
                                    />
                                    🐕 Include New Pack Members
                                    <span style={{ color: "#64748b", fontWeight: "normal", fontSize: "12px", marginLeft: "8px" }}>
                                        (auto-generated from bookings)
                                    </span>
                                </label>
                                {includeNewPackMembers && (
                                    <>
                                        <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                                            <select
                                                value={selectedMonth}
                                                onChange={e => setSelectedMonth(parseInt(e.target.value))}
                                                style={{ ...styles.input, width: "auto", flex: 1 }}
                                            >
                                                {[
                                                    "January", "February", "March", "April", "May", "June",
                                                    "July", "August", "September", "October", "November", "December"
                                                ].map((name, i) => (
                                                    <option key={i + 1} value={i + 1}>{name}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={selectedYear}
                                                onChange={e => setSelectedYear(parseInt(e.target.value))}
                                                style={{ ...styles.input, width: "auto" }}
                                            >
                                                {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
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
                                    </>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Editor Mode - Welcome Message */}
                            <div style={styles.card}>
                                <label style={styles.sectionTitle}>👋 Welcome Message</label>
                                <p style={{ color: "#64748b", fontSize: "13px", marginBottom: "15px" }}>
                                    Add text and images to create your welcome section. Images should be placed in /home/hunter-dev/newsletter-images/
                                </p>

                                {welcomeBlocks.map((block, index) => (
                                    <div key={index} style={styles.blockContainer}>
                                        <div style={styles.blockHeader}>
                                            <span style={styles.blockType}>
                                                {block.type === "text" ? "📝 Text Block" : "🖼️ Image Block"}
                                            </span>
                                            <div style={styles.blockControls}>
                                                <button
                                                    onClick={() => moveBlock(index, "up")}
                                                    disabled={index === 0}
                                                    style={{
                                                        ...styles.iconButton,
                                                        opacity: index === 0 ? 0.5 : 1
                                                    }}
                                                    title="Move up"
                                                >
                                                    ↑
                                                </button>
                                                <button
                                                    onClick={() => moveBlock(index, "down")}
                                                    disabled={index === welcomeBlocks.length - 1}
                                                    style={{
                                                        ...styles.iconButton,
                                                        opacity: index === welcomeBlocks.length - 1 ? 0.5 : 1
                                                    }}
                                                    title="Move down"
                                                >
                                                    ↓
                                                </button>
                                                <button
                                                    onClick={() => removeBlock(index)}
                                                    style={{
                                                        ...styles.iconButton,
                                                        backgroundColor: "#7f1d1d",
                                                        color: "#fecaca"
                                                    }}
                                                    title="Remove block"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>

                                        {block.type === "text" ? (
                                            <textarea
                                                value={block.content}
                                                onChange={e => updateBlock(index, { content: e.target.value })}
                                                style={{ ...styles.textarea, minHeight: "80px" }}
                                                placeholder="Write your text here..."
                                            />
                                        ) : (
                                            <>
                                                <div style={{ marginBottom: "8px" }}>
                                                    <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "4px" }}>
                                                        Image filename (e.g., hunter_snow_jan2025.jpg)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={block.content}
                                                        onChange={e => updateBlock(index, { content: e.target.value })}
                                                        style={styles.input}
                                                        placeholder="filename.jpg"
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginBottom: "4px" }}>
                                                        Caption (optional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={block.caption || ""}
                                                        onChange={e => updateBlock(index, { caption: e.target.value })}
                                                        style={styles.input}
                                                        placeholder="Hunter enjoying the first snow of the year!"
                                                    />
                                                </div>
                                                {block.content && (
                                                    <div style={{ marginTop: "10px", textAlign: "center" }}>
                                                        <img
                                                            src={`/api/newsletter-images/${block.content}`}
                                                            alt={block.caption || "Preview"}
                                                            style={{
                                                                maxWidth: "100%",
                                                                maxHeight: "150px",
                                                                borderRadius: "6px",
                                                                border: "1px solid #334155"
                                                            }}
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = "none";
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))}

                                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                                    <button
                                        onClick={addTextBlock}
                                        style={{
                                            ...styles.button,
                                            ...styles.secondaryButton,
                                            flex: 1,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "6px"
                                        }}
                                    >
                                        📝 Add Text Block
                                    </button>
                                    <button
                                        onClick={addImageBlock}
                                        style={{
                                            ...styles.button,
                                            ...styles.secondaryButton,
                                            flex: 1,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "6px"
                                        }}
                                    >
                                        🖼️ Add Image Block
                                    </button>
                                </div>
                            </div>

                            {/* New Pack Members */}
                            <div style={styles.card}>
                                <label style={styles.sectionTitle}>
                                    🐕 New Pack Members
                                    <span style={{ color: "#64748b", fontWeight: "normal", fontSize: "12px", marginLeft: "8px" }}>
                                        (First service this month - photos will display at 150px)
                                    </span>
                                </label>
                                <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                                    <select
                                        value={selectedMonth}
                                        onChange={e => setSelectedMonth(parseInt(e.target.value))}
                                        style={{ ...styles.input, width: "auto", flex: 1 }}
                                    >
                                        {[
                                            "January", "February", "March", "April", "May", "June",
                                            "July", "August", "September", "October", "November", "December"
                                        ].map((name, i) => (
                                            <option key={i + 1} value={i + 1}>{name}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={selectedYear}
                                        onChange={e => setSelectedYear(parseInt(e.target.value))}
                                        style={{ ...styles.input, width: "auto" }}
                                    >
                                        {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
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
                                    Image filenames from /newsletter-images/ (up to 4)
                                </label>
                                {walkHighlightImages.map((filename, idx) => (
                                    <input
                                        key={idx}
                                        type="text"
                                        value={filename}
                                        onChange={e => {
                                            const newImages = [...walkHighlightImages];
                                            newImages[idx] = e.target.value;
                                            setWalkHighlightImages(newImages);
                                        }}
                                        style={{ ...styles.input, marginBottom: "8px" }}
                                        placeholder={`Image filename ${idx + 1} (e.g., walk_highlight_${idx + 1}.jpg)`}
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
                        </>
                    )}
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
                                        <div style={{ color: "#fff", fontSize: "13px", fontWeight: "500", display: "flex", alignItems: "center", gap: "6px" }}>
                                            {nl.content.source === "notion" && (
                                                <span style={{
                                                    display: "inline-block",
                                                    width: "6px",
                                                    height: "6px",
                                                    borderRadius: "50%",
                                                    backgroundColor: "#7c3aed",
                                                }} />
                                            )}
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

            {/* Notion Import Modal */}
            {showNotionImport && (
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
                    onClick={() => setShowNotionImport(false)}
                >
                    <div
                        style={{
                            backgroundColor: "#1e293b",
                            borderRadius: "12px",
                            maxWidth: "500px",
                            maxHeight: "70vh",
                            width: "100%",
                            overflow: "hidden",
                            border: "1px solid #334155",
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{
                            padding: "20px",
                            borderBottom: "1px solid #334155",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}>
                            <h3 style={{ margin: 0, color: "#fff", fontSize: "18px" }}>Import from Notion</h3>
                            <button
                                onClick={() => setShowNotionImport(false)}
                                style={{
                                    ...styles.button,
                                    ...styles.secondaryButton,
                                    padding: "6px 12px",
                                }}
                            >
                                Close
                            </button>
                        </div>
                        <div style={{ padding: "20px", overflowY: "auto", maxHeight: "calc(70vh - 70px)" }}>
                            {isLoadingNotionPages ? (
                                <p style={{ color: "#94a3b8", textAlign: "center", padding: "30px 0" }}>
                                    Loading Notion pages...
                                </p>
                            ) : notionPages.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "30px 0" }}>
                                    <p style={{ color: "#94a3b8", marginBottom: "10px" }}>No newsletter pages found.</p>
                                    <p style={{ color: "#64748b", fontSize: "13px" }}>
                                        Create a page in your Notion newsletter database and share it with your integration.
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "15px" }}>
                                        Select a page to import as your newsletter content:
                                    </p>
                                    {notionPages.map(page => (
                                        <div
                                            key={page.id}
                                            onClick={() => handleImportNotionPage(page.id)}
                                            style={{
                                                padding: "14px",
                                                backgroundColor: "#0f172a",
                                                borderRadius: "8px",
                                                marginBottom: "10px",
                                                cursor: "pointer",
                                                border: "1px solid #334155",
                                                transition: "border-color 0.2s",
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.borderColor = "#7c3aed")}
                                            onMouseLeave={e => (e.currentTarget.style.borderColor = "#334155")}
                                        >
                                            <div style={{ color: "#fff", fontSize: "15px", fontWeight: "500", marginBottom: "6px" }}>
                                                {page.title}
                                            </div>
                                            <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
                                                <span style={{
                                                    color: page.status === "Ready" ? "#10b981" : page.status === "Sent" ? "#6b7280" : "#f59e0b",
                                                }}>
                                                    {page.status}
                                                </span>
                                                {page.month && (
                                                    <span style={{ color: "#64748b" }}>
                                                        {page.month}
                                                    </span>
                                                )}
                                                <span style={{ color: "#64748b" }}>
                                                    Edited {format(new Date(page.last_edited), "MMM d, HH:mm")}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
