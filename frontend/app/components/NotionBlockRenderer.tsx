// frontend/app/components/NotionBlockRenderer.tsx
import React from 'react';
import EconomicCalendarWidget from './EconomicCalendarWidget';

interface RichText {
    type: 'text';
    text: string;
    annotations: {
        bold: boolean;
        italic: boolean;
        strikethrough: boolean;
        underline: boolean;
        code: boolean;
        color: string;
    };
    href?: string;
}

interface NotionBlock {
    id: string;
    type: string;
    hasChildren: boolean;
    content: any;
    children?: NotionBlock[];
}

interface NotionBlockRendererProps {
    blocks: NotionBlock[];
    className?: string;
}

// Render rich text with formatting
function renderRichText(richText: RichText[]): JSX.Element | null {
    return (
        <>
            {richText.map((text, index) => {
                let element = <span key={index}>{text.text}</span>;

                // Apply formatting
                if (text.annotations.bold) {
                    element = <strong key={index}>{element}</strong>;
                }
                if (text.annotations.italic) {
                    element = <em key={index}>{element}</em>;
                }
                if (text.annotations.strikethrough) {
                    element = <s key={index}>{element}</s>;
                }
                if (text.annotations.underline) {
                    element = <u key={index}>{element}</u>;
                }
                if (text.annotations.code) {
                    element = <code key={index} className="bg-gray-800 text-gray-300 px-1 py-0.5 rounded text-sm">{element}</code>;
                }

                // Apply color
                if (text.annotations.color !== 'default') {
                    const colorClass = getColorClass(text.annotations.color);
                    element = <span key={index} className={colorClass}>{element}</span>;
                }

                // Apply link
                if (text.href) {
                    element = (
                        <a
                            key={index}
                            href={text.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                        >
                            {element}
                        </a>
                    );
                }

                return element;
            })}
        </>
    );
}

// Get Tailwind color class for Notion colors
function getColorClass(color: string): string {
    const colorMap: { [key: string]: string } = {
        gray: 'text-gray-500',
        brown: 'text-orange-800',
        orange: 'text-orange-500',
        yellow: 'text-yellow-500',
        green: 'text-green-500',
        blue: 'text-blue-500',
        purple: 'text-purple-500',
        pink: 'text-pink-500',
        red: 'text-red-500',
        gray_background: 'bg-gray-700 text-white px-1 rounded',
        brown_background: 'bg-orange-800 text-white px-1 rounded',
        orange_background: 'bg-orange-500 text-white px-1 rounded',
        yellow_background: 'bg-yellow-500 text-black px-1 rounded',
        green_background: 'bg-green-500 text-white px-1 rounded',
        blue_background: 'bg-blue-500 text-white px-1 rounded',
        purple_background: 'bg-purple-500 text-white px-1 rounded',
        pink_background: 'bg-pink-500 text-white px-1 rounded',
        red_background: 'bg-red-500 text-white px-1 rounded',
    };
    return colorMap[color] || '';
}

// Render individual block
function renderBlock(block: NotionBlock): JSX.Element | null {
    const { type, content, id } = block;

    switch (type) {
        case 'paragraph':
            return (
                <p key={id} className="mb-4 text-gray-300 leading-relaxed">
                    {renderRichText(content.richText || [])}
                </p>
            );

        case 'heading_1':
            return (
                <h1 key={id} className="text-3xl font-bold mb-6 text-white">
                    {renderRichText(content.richText || [])}
                </h1>
            );

        case 'heading_2':
            return (
                <h2 key={id} className="text-2xl font-semibold mb-4 text-white">
                    {renderRichText(content.richText || [])}
                </h2>
            );

        case 'heading_3':
            return (
                <h3 key={id} className="text-xl font-semibold mb-3 text-white">
                    {renderRichText(content.richText || [])}
                </h3>
            );

        case 'bulleted_list_item':
        case 'numbered_list_item':
            // These are now fully handled by the grouping logic.
            return null;

        case 'embed':
            // We'll assume any 'embed' is our economic calendar for now
            // and render our reliable custom component instead of the broken URL.
            return <EconomicCalendarWidget key={id} />;

        case 'to_do':
            return (
                <div key={id} className="flex items-start gap-2 mb-2">
                    <input
                        type="checkbox"
                        checked={content.checked}
                        readOnly
                        className="mt-1 accent-blue-500"
                    />
                    <span className={`text-gray-300 leading-relaxed ${content.checked ? 'line-through opacity-60' : ''}`}>
                        {renderRichText(content.richText || [])}
                    </span>
                </div>
            );

        case 'toggle':
            return (
                <details key={id} className="mb-4 bg-gray-800 border border-gray-600 rounded-lg p-3">
                    <summary className="cursor-pointer text-gray-300 font-medium">
                        {renderRichText(content.richText || [])}
                    </summary>
                    <div className="mt-2 pl-4 pt-2 border-t border-gray-700">
                        {block.children?.map(child => renderBlock(child))}
                    </div>
                </details>
            );

        case 'code':
            return (
                <div key={id} className="mb-4">
                    <pre className="bg-gray-900 border border-gray-600 rounded-lg p-4 overflow-x-auto">
                        <code className={`text-sm text-gray-300 language-${content.language || 'text'}`}>
                            {renderRichText(content.richText || [])}
                        </code>
                    </pre>
                </div>
            );

        case 'quote':
            return (
                <blockquote key={id} className="border-l-4 border-blue-500 pl-4 mb-4 bg-gray-800 p-3 rounded-r-lg">
                    <div className="text-gray-300 italic">
                        {renderRichText(content.richText || [])}
                    </div>
                </blockquote>
            );

        case 'callout': {
            const richText = content.richText || [];
            const triggerText = richText.map((t: RichText) => t.text).join('');

            // Using .trim() to make the check more robust
            if (triggerText.trim() === 'ECONOMIC_CALENDAR_WIDGET') {
                // If it matches, render the live widget
                return <EconomicCalendarWidget key={id} />;
            }

            // Otherwise, render the callout normally (which will be invisible if empty)
            return (
                <div key={id} className="mb-4 bg-blue-900 border border-blue-600 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        {content.icon && (
                            <span className="text-xl">
                                {content.icon.emoji || '💡'}
                            </span>
                        )}
                        <div className="text-gray-300 leading-relaxed">
                            {renderRichText(richText)}
                        </div>
                    </div>
                </div>
            );
        }

        case 'divider':
            return (
                <hr key={id} className="border-gray-600 my-6" />
            );

        case 'table':
            return (
                <div key={id} className="mb-4 overflow-x-auto">
                    <table className="min-w-full border-collapse border border-gray-600 rounded-lg bg-gray-800">
                        <tbody>
                            {/* This is the crucial part: map over children and render them */}
                            {block.children?.map(child => renderBlock(child))}
                        </tbody>
                    </table>
                </div>
            );

        case 'table_row':
            return (
                <tr key={id} className="border-b border-gray-600">
                    {content.cells?.map((cell: RichText[], cellIndex: number) => (
                        <td key={cellIndex} className="border-r border-gray-600 px-3 py-2 text-gray-300 last:border-r-0">
                            {renderRichText(cell)}
                        </td>
                    ))}
                </tr>
            );

        case 'image':
            return (
                <div key={id} className="mb-4">
                    <img
                        src={content.url}
                        alt="Image"
                        className="max-w-full rounded-lg"
                    />
                    {content.caption && content.caption.length > 0 && (
                        <p className="text-sm text-gray-500 mt-2 text-center">
                            {renderRichText(content.caption)}
                        </p>
                    )}
                </div>
            );

        case 'video':
            return (
                <div key={id} className="mb-4">
                    <video
                        src={content.url}
                        controls
                        className="max-w-full rounded-lg"
                    />
                    {content.caption && content.caption.length > 0 && (
                        <p className="text-sm text-gray-500 mt-2 text-center">
                            {renderRichText(content.caption)}
                        </p>
                    )}
                </div>
            );

        case 'bookmark':
            return (
                <div key={id} className="mb-4 border border-gray-600 rounded-lg p-3 bg-gray-800">
                    <a
                        href={content.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                    >
                        {content.url}
                    </a>
                    {content.caption && content.caption.length > 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                            {renderRichText(content.caption)}
                        </p>
                    )}
                </div>
            );

        default:
            if (content.unsupported) {
                return (
                    <div key={id} className="mb-4 p-3 bg-gray-800 border border-gray-600 rounded-lg">
                        <p className="text-gray-500 text-sm">
                            Unsupported block type: {content.originalType}
                        </p>
                    </div>
                );
            }
            return <div key={id}></div>;
    }
}

export default function NotionBlockRenderer({ blocks, className = '' }: NotionBlockRendererProps) {
    // Explicitly type the array to hold JSX Elements. This is the key fix.
    const renderedElements: (JSX.Element | null)[] = [];

    let i = 0;
    while (i < blocks.length) {
        const block = blocks[i];

        if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item') {
            const listType = block.type; // 'bulleted_list_item' or 'numbered_list_item'

            // Explicitly type the listItems array.
            const listItems: NotionBlock[] = [];

            // Group all consecutive items of the same list type
            let j = i;
            while (j < blocks.length && blocks[j].type === listType) {
                listItems.push(blocks[j]);
                j++;
            }

            if (listType === 'bulleted_list_item') {
                renderedElements.push(
                    <ul key={block.id} className="list-disc space-y-1 pl-6 mb-4">
                        {listItems.map(item => (
                            <li key={item.id} className="text-gray-300 leading-relaxed">
                                {renderRichText(item.content.richText || [])}
                            </li>
                        ))}
                    </ul>
                );
            } else { // This will be 'numbered_list_item'
                renderedElements.push(
                    <ol key={block.id} className="list-decimal space-y-1 pl-6 mb-4">
                        {listItems.map(item => (
                            <li key={item.id} className="text-gray-300 leading-relaxed">
                                {renderRichText(item.content.richText || [])}
                            </li>
                        ))}
                    </ol>
                );
            }
            i = j; // Move the index past the list items we just processed
        } else {
            renderedElements.push(renderBlock(block));
            i++;
        }
    }

    return (
        <div className={`notion-content ${className}`}>
            {renderedElements}
        </div>
    );
}