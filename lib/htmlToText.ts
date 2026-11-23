/**
 * Turn an HTML email into a readable plain-text version.
 *
 * Mail providers trust an email more when it carries both. This is not a
 * general converter: it handles what our own email templates produce.
 */
export function htmlToText(html: string): string {
    const decode = (s: string) =>
        s
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&quot;/gi, '"')
            .replace(/&#0?39;|&apos;/gi, "'")
            .replace(/&pound;/gi, '£')
            .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
            .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

    let text = html
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<(head|style|script|title)\b[\s\S]*?<\/\1>/gi, '')
        // Links: keep the words and put the address after them.
        .replace(/<a\b[^>]*?href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => {
            const words = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            const url = decode(href.trim());
            if (!url || url === '#') return words;
            if (!words) return url;
            return words === url ? url : `${words} (${url})`;
        })
        .replace(/<li\b[^>]*>/gi, '\n- ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|h[1-6]|tr|table|ul|ol|li|blockquote)>/gi, '\n\n')
        .replace(/<[^>]+>/g, '');

    text = decode(text);

    return text
        .split('\n')
        .map(line => line.replace(/[ \t ]+/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
