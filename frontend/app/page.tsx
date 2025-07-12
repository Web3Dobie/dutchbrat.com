import HeroIntro from './components/HeroIntro'
import HunterBlock from './components/HunterBlock'
import CryptoPriceBlock from './components/CryptoPriceBlock'

export default function Home() {
    return (
        <main className="min-h-screen bg-gray-950 text-white px-6 py-10">
            <CryptoPriceBlock />
            <HeroIntro />
            <HunterBlock />
        </main>
    )
}
