// components/HTDArticleCard.tsx
import Link from 'next/link'

interface HTDArticleCardProps {
    id: string
    title: string
    summary: string
    publishedDate: string
    category: string
    threadUrl?: string
    size?: number
    className?: string
}

export function HTDArticleCard({
    id,
    title,
    summary,
    publishedDate,
    category,
    threadUrl,
    size,
    className = ""
}: HTDArticleCardProps) {

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr)
            const now = new Date()
            const diffTime = Math.abs(now.getTime() - date.getTime())
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

            if (diffDays === 0) return 'Today'
            if (diffDays === 1) return 'Yesterday'
            if (diffDays < 7) return `${diffDays} days ago`
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
            if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
            return `${Math.floor(diffDays / 365)} years ago`
        } catch {
            return new Date(dateStr).toLocaleDateString()
        }
    }

    const getCategoryColor = (cat: string) => {
        const normalizedCat = cat.toLowerCase()
        if (normalizedCat.includes('macro')) return 'bg-blue-500'
        if (normalizedCat.includes('equity')) return 'bg-green-500'
        if (normalizedCat.includes('political')) return 'bg-purple-500'
        return 'bg-blue-500' // default
    }

    // Generate internal link to articles page
    const articlePageUrl = `/articles?htd-article-id=${id}`

    return (
        <div className={`bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors duration-200 overflow-hidden ${className}`}>
            {/* Header with badges */}
            <div className="p-4 pb-3">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                            HTD Research
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(category)} text-white`}>
                            {category}
                        </span>
                    </div>
                    <div className="text-gray-400 text-xs">
                        {formatDate(publishedDate)}
                    </div>
                </div>

                {/* Title - clickable */}
                <Link href={articlePageUrl}>
                    <h3 className="text-lg font-bold text-white hover:text-blue-400 mb-3 line-clamp-2 leading-tight cursor-pointer transition-colors duration-200">
                        {title}
                    </h3>
                </Link>

                {/* Summary */}
                <p className="text-gray-300 text-sm mb-4 line-clamp-3 leading-relaxed">
                    {summary}
                </p>

                {/* Metadata */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span>Institutional Analysis</span>
                    {size && (
                        <span>{Math.round(size / 1024)} KB</span>
                    )}
                </div>
            </div>

            {/* Action buttons */}
            <div className="px-4 pb-4">
                <div className="flex gap-2">
                    {/* Main article link - internal */}
                    <Link
                        href={articlePageUrl}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium text-center transition-colors duration-200"
                    >
                        Read Analysis
                    </Link>

                    {/* Thread link if available */}
                    {threadUrl && (
                        <Link
                            href={threadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-4 py-2 rounded text-sm font-medium transition-colors duration-200 flex items-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                            Thread
                        </Link>
                    )}
                </div>
            </div>
        </div>
    )
}

// Compact version
export function HTDArticleCardCompact({
    id,
    title,
    category,
    publishedDate,
    className = ""
}: Pick<HTDArticleCardProps, 'id' | 'title' | 'category' | 'publishedDate' | 'className'>) {

    const articlePageUrl = `/articles?htd-article-id=${id}`

    return (
        <Link
            href={articlePageUrl}
            className={`block bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-lg p-3 transition-colors duration-200 ${className}`}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                    HTD
                </span>
                <span className="text-gray-500 text-xs">
                    {new Date(publishedDate).toLocaleDateString()}
                </span>
            </div>

            <h4 className="text-white font-medium text-sm line-clamp-2 mb-1">
                {title}
            </h4>

            <p className="text-gray-400 text-xs">
                {category}
            </p>
        </Link>
    )
}