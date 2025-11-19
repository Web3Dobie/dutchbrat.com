// app/page.tsx - Beautiful Hunter's Hounds homepage with domain detection
import { isHuntersHoundsDomain } from '@/lib/domainDetection'
import Link from 'next/link'
import Image from 'next/image'

// DutchBrat components
import HeroIntro from './components/HeroIntro'
import HunterBlock from './components/HunterBlock'
import CryptoPriceBlock from './components/CryptoPriceBlock'

function HuntersHomePage() {
  return (
    <div className="bg-gray-950 text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Welcome to Hunter's Hounds
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto">
            Professional & Loving Dog Walking Services in London
          </p>
          <p className="text-lg text-gray-400 mb-12 max-w-3xl mx-auto">
            One-on-one care in Highbury Fields and Clissold Park, inspired by the memory of my beloved Dobermann, Hunter.
          </p>

          {/* Hero Image */}
          <div className="relative w-full max-w-2xl mx-auto mb-12">
            <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-blue-500/20">
              <Image
                src="/images/dog-walking/hunter-and-me.jpg"
                alt="Ernesto with his beloved Dobermann, Hunter"
                width={800}
                height={800}
                className="object-cover object-center w-full h-full"
                priority
              />
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              href="/book-now"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 text-lg shadow-lg transform hover:scale-105"
            >
              🐕 Book a Walk
            </Link>
            <Link
              href="/services"
              className="bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 text-lg shadow-lg transform hover:scale-105"
            >
              📋 My Services
            </Link>
            <Link
              href="/my-account"
              className="text-blue-400 hover:text-blue-300 font-bold py-4 px-8 underline text-lg transition-colors duration-300"
            >
              👤 Customer Login
            </Link>
          </div>
        </div>

        {/* Why Choose Us Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-semibold mb-12 text-center">Why Choose Hunter's Hounds?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="text-center p-6 bg-gray-800/50 rounded-2xl backdrop-blur-sm border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 transform hover:scale-105">
              <div className="text-5xl mb-6">🐕</div>
              <h3 className="text-xl font-semibold mb-4 text-blue-400">One-on-One Care</h3>
              <p className="text-gray-300 leading-relaxed">
                Your dog gets my complete attention during our walks. No group walks, just personalized care and genuine connection.
              </p>
            </div>
            <div className="text-center p-6 bg-gray-800/50 rounded-2xl backdrop-blur-sm border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 transform hover:scale-105">
              <div className="text-5xl mb-6">❤️</div>
              <h3 className="text-xl font-semibold mb-4 text-purple-400">Born from Love</h3>
              <p className="text-gray-300 leading-relaxed">
                Hunter's Hounds was created to honor my beloved Hunter. Every dog receives the same love and dedication I gave him.
              </p>
            </div>
            <div className="text-center p-6 bg-gray-800/50 rounded-2xl backdrop-blur-sm border border-gray-700/50 hover:border-green-500/50 transition-all duration-300 transform hover:scale-105">
              <div className="text-5xl mb-6">🏞️</div>
              <h3 className="text-xl font-semibold mb-4 text-green-400">Perfect Locations</h3>
              <p className="text-gray-300 leading-relaxed">
                Highbury Fields and Clissold Park offer the perfect mix of open space, water features, and safe enclosed areas.
              </p>
            </div>
          </div>
        </section>

        {/* Services Preview */}
        <section className="mb-16">
          <h2 className="text-3xl font-semibold mb-8 text-center">My Services</h2>
          <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {/* Meet & Greet */}
              <Link href="/services" className="group block">
                <div className="bg-gray-800/70 rounded-xl p-6 border border-green-500/30 group-hover:border-green-500 transition-all duration-300 h-full">
                  <h3 className="text-lg font-semibold mb-3 text-green-400">Meet & Greet</h3>
                  <p className="text-sm text-gray-300 mb-4">Get to know your furry friend and discuss their specific needs</p>
                  <div className="text-green-300 font-medium">FREE for new clients</div>
                </div>
              </Link>
              
              {/* Quick Walk */}
              <Link href="/services" className="group block">
                <div className="bg-gray-800/70 rounded-xl p-6 border border-blue-500/30 group-hover:border-blue-500 transition-all duration-300 h-full">
                  <h3 className="text-lg font-semibold mb-3 text-blue-400">Quick Walk</h3>
                  <p className="text-sm text-gray-300 mb-4">Perfect for busy days when your dog needs a quick energy boost</p>
                  <div className="text-blue-300 font-medium">30 minutes</div>
                </div>
              </Link>
              
              {/* Solo Walk */}
              <Link href="/services" className="group block">
                <div className="bg-gray-800/70 rounded-xl p-6 border border-purple-500/30 group-hover:border-purple-500 transition-all duration-300 h-full">
                  <h3 className="text-lg font-semibold mb-3 text-purple-400">Solo Walk</h3>
                  <p className="text-sm text-gray-300 mb-4">Premium one-on-one attention and comprehensive exercise session</p>
                  <div className="text-purple-300 font-medium">60 minutes</div>
                </div>
              </Link>
              
              {/* Dog Sitting */}
              <Link href="/services" className="group block">
                <div className="bg-gray-800/70 rounded-xl p-6 border border-yellow-500/30 group-hover:border-yellow-500 transition-all duration-300 h-full">
                  <h3 className="text-lg font-semibold mb-3 text-yellow-400">Dog Sitting</h3>
                  <p className="text-sm text-gray-300 mb-4">Extended care and companionship when your dog needs extra attention</p>
                  <div className="text-yellow-300 font-medium">Custom duration</div>
                </div>
              </Link>
            </div>
            <div className="text-center mt-8">
              <Link
                href="/services"
                className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                View Full Pricing & Book →
              </Link>
            </div>
          </div>
        </section>

        {/* My Story */}
        <section className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-3xl font-semibold mb-6">My Story</h2>
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50">
            <p className="text-lg text-gray-300 leading-relaxed mb-6">
              My name is Ernesto, and for 7 wonderful years, my best friend was Hunter, a loyal and loving Dobermann. 
              He taught me what unconditional love looks like and showed me how much joy a dog can bring to everyday life.
            </p>
            <p className="text-lg text-gray-300 leading-relaxed mb-8">
              After Hunter passed, I wanted to find a way to honor his memory by sharing the same care, attention, and love 
              with other wonderful dogs in my London community. That's how Hunter's Hounds was born.
            </p>
            <Link
              href="/services"
              className="text-blue-400 hover:text-blue-300 font-semibold text-lg underline transition-colors duration-300"
            >
              Learn more about my services →
            </Link>
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center bg-gradient-to-r from-green-900/30 to-blue-900/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50">
          <h2 className="text-3xl font-semibold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            New clients receive a free 30-minute meet-and-greet session so I can get to know your dog and you can see if we're a good fit.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/book-now"
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 text-lg shadow-lg transform hover:scale-105"
            >
              🎉 Book Your Free Meet & Greet
            </Link>
            <Link
              href="/book-now"
              className="text-green-400 hover:text-green-300 font-semibold text-lg underline transition-colors duration-300"
            >
              Have questions? Get in touch first
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export default function Home() {
  // Check if this is a Hunter's Hounds domain
  if (isHuntersHoundsDomain()) {
    // Render beautiful Hunter's Hounds homepage
    return <HuntersHomePage />
  }

  // ORIGINAL DutchBrat homepage layout - unchanged
  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-10">
      <CryptoPriceBlock />
      <HeroIntro />
      <HunterBlock />
    </main>
  )
}