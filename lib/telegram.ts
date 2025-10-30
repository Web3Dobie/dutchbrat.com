// lib/telegram.ts
export async function sendTelegramNotification(message: string): Promise<void> {
    // Ensure environment variables are set
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.warn("Telegram environment variables (TOKEN or CHAT_ID) are missing. Skipping notification.");
        return;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: "HTML", // Allows bold tags and links
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Failed to send Telegram message:", errorData);
        }
    } catch (error) {
        console.error("Error sending Telegram message:", error);
    }
}