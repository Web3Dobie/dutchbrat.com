// frontend/app/components/LatestTweetCard.tsx
import TweetCard from './TweetCard'

export default function LatestTweetCard() {
    const config = {
        apiEndpoint: '/api/latest-tweet',
        title: 'Latest Tweet',
        icon: '🐦',
        borderColor: 'border-blue-700',
        titleColor: 'text-blue-400',
        linkColor: 'text-blue-400',
        fallbackMessage: 'No tweet available',
        followLink: 'https://x.com/@Web3_Dobie',
        fallbackLink: 'https://x.com/@Web3_Dobie',
        showEngagementScore: false,
        showType: false,
        maxTextLength: 200
    }

    return <TweetCard config={config} />
}