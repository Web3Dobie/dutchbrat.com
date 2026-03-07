import { ImapFlow } from 'imapflow';

export interface RawEmail {
    uid: number;
    subject: string;
    body: string;
    from: string;
}

export async function fetchUnreadRevolutEmails(): Promise<RawEmail[]> {
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
        throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD environment variables are required');
    }

    const client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: {
            user: gmailUser,
            pass: gmailAppPassword,
        },
        logger: false,
    });

    const emails: RawEmail[] = [];

    await client.connect();

    try {
        await client.mailboxOpen('INBOX');

        // Search for unread emails from Revolut
        const messages = await client.search({
            unseen: true,
            from: 'revolut.com',
        });

        if (messages.length === 0) {
            return emails;
        }

        for await (const message of client.fetch(messages, {
            uid: true,
            envelope: true,
            bodyStructure: true,
            source: true,
        })) {
            const uid = message.uid;
            const subject = message.envelope?.subject || '';
            const from = message.envelope?.from?.[0]?.address || '';

            // Extract plain text from raw source
            let body = '';
            if (message.source) {
                body = message.source.toString('utf8');
            }

            emails.push({ uid, subject, body, from });

            // Mark as read (SEEN flag) immediately after fetching
            await client.messageFlagsAdd({ uid }, ['\\Seen'], { uid: true });
        }
    } finally {
        await client.logout();
    }

    return emails;
}
