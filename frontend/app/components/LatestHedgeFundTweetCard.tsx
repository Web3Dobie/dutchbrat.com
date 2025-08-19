// frontend/app/components/LatestHedgeFundTweetCard.tsx
import TweetCard from './TweetCard'

export default function LatestHedgeFundTweetCard() {
    const config = {
        apiEndpoint: '/api/latest-hedgefund-tweet',
        title: 'Latest HF Commentary',
        icon: '💼',
        borderColor: 'border-gray-700',
        titleColor: 'text-gray-400',
        linkColor: 'text-blue-400',
        fallbackMessage: 'No hedge fund tweets available',
        followLink: 'https://x.com/Dutch_Brat',
        fallbackLink: 'https://x.com/Dutch_Brat',
        showEngagementScore: true,
        showType: true,
        maxTextLength: 250
    }

    return <TweetCard config={config} />
}