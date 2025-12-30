import Image from 'next/image'
import Link from 'next/link'

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <section className="py-16 bg-black/20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600 bg-clip-text text-transparent">
            My Services
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Professional dog walking and pet care services tailored to your furry friend's needs. 
            All services include one-on-one attention in beautiful Highbury Fields and Clissold Park.
          </p>
        </div>
      </section>

      {/* Service Areas */}
      <section className="py-12 bg-black/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-semibold mb-6">Service Areas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-green-400 mb-3">🌳 Highbury Fields</h3>
                <p className="text-gray-300">
                  Spacious open fields perfect for running, fetch, and off-lead exercise for well-trained dogs.
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-semibold text-blue-400 mb-3">🏞️ Clissold Park</h3>
                <p className="text-gray-300">
                  Beautiful park with varied terrain, ponds, and secure areas for safe exploration and play.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Services */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            
            {/* Meet & Greet */}
            <div className="mb-16 bg-gradient-to-r from-green-900/30 to-gray-800/30 rounded-2xl p-8 border border-green-500/30">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                      <span className="text-xl">🤝</span>
                    </div>
                    <h3 className="text-3xl font-bold text-green-400">Meet & Greet</h3>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">FREE</span>
                    <span className="text-gray-300 ml-3">for new clients • 30 minutes</span>
                  </div>
                  <p className="text-gray-300 leading-relaxed mb-6">
                    A perfect introduction for new clients and their dogs. I'll visit your home to meet your furry friend, 
                    understand their personality, discuss their specific needs, and answer any questions you have about my services.
                  </p>
                  <ul className="text-gray-300 space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">✓</span> Personal introduction at your home
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">✓</span> Assess your dog's temperament and needs
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">✓</span> Discuss walking preferences and routines
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">✓</span> Short trial walk if your dog is comfortable
                    </li>
                  </ul>
                </div>
                <div className="relative">
                  <Image
                    src="/images/dog-walking/photo1.jpg"
                    alt="Meeting a new furry friend"
                    width={400}
                    height={300}
                    className="rounded-xl object-cover w-full"
                  />
                </div>
              </div>
            </div>

            {/* Quick Walk */}
            <div className="mb-16 bg-gradient-to-r from-blue-900/30 to-gray-800/30 rounded-2xl p-8 border border-blue-500/30">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="order-2 lg:order-1 relative">
                  <Image
                    src="/images/dog-walking/photo2.jpg"
                    alt="Quick energizing walk in the park"
                    width={400}
                    height={300}
                    className="rounded-xl object-cover w-full"
                  />
                </div>
                <div className="order-1 lg:order-2">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                      <span className="text-xl">⚡</span>
                    </div>
                    <h3 className="text-3xl font-bold text-blue-400">Quick Walk</h3>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">£10</span>
                    <span className="text-gray-300 ml-3">30 minutes</span>
                  </div>
                  <p className="text-gray-300 leading-relaxed mb-6">
                    Perfect for busy days or when your dog needs a quick energy boost. A focused 30-minute session 
                    that includes exercise, toilet break, and some playtime to break up their day.
                  </p>
                  <ul className="text-gray-300 space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="text-blue-400">✓</span> 30 minutes of focused attention
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-blue-400">✓</span> Exercise and toilet break
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-blue-400">✓</span> Basic playtime and interaction
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-blue-400">✓</span> Photo updates via WhatsApp
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Solo Walk */}
            <div className="mb-16 bg-gradient-to-r from-purple-900/30 to-gray-800/30 rounded-2xl p-8 border border-purple-500/30">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                      <span className="text-xl">👑</span>
                    </div>
                    <h3 className="text-3xl font-bold text-purple-400">Solo Walk</h3>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">£17.50 / £25</span>
                    <span className="text-gray-300 ml-3">1 hour • 1 or 2 dogs</span>
                  </div>
                  
                  {/* Pricing Breakdown */}
                  <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
                    <h4 className="text-lg font-semibold text-purple-400 mb-3">Walk Pricing</h4>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">1 hour (1 dog)</span>
                        <span className="text-white font-medium">£17.50</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">1 hour (2 dogs)</span>
                        <span className="text-white font-medium">£25</span>
                      </div>
                      <div className="border-t border-gray-600 pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">2 hours (1 dog)</span>
                          <span className="text-white font-medium">£25</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">2 hours (2 dogs)</span>
                          <span className="text-white font-medium">£32.50</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-300 leading-relaxed mb-6">
                    The premium experience - focused individual attention for your dog(s). Perfect for dogs who 
                    need more exercise, mental stimulation, or prefer not to be around other dogs.
                  </p>
                  <ul className="text-gray-300 space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="text-purple-400">✓</span> Individual attention for each dog
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-purple-400">✓</span> Comprehensive exercise session
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-purple-400">✓</span> Mental stimulation and training reinforcement
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-purple-400">✓</span> Extended playtime and socialisation
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-purple-400">✓</span> Detailed WhatsApp update with photos
                    </li>
                  </ul>
                </div>
                <div className="relative">
                  <Image
                    src="/images/dog-walking/solo-walk.jpg"
                    alt="Premium solo walk experience"
                    width={400}
                    height={300}
                    className="rounded-xl object-cover w-full"
                  />
                </div>
              </div>
            </div>

            {/* Dog Sitting */}
            <div className="mb-16 bg-gradient-to-r from-yellow-900/30 to-gray-800/30 rounded-2xl p-8 border border-yellow-500/30">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="order-2 lg:order-1 relative">
                  <Image
                    src="/images/dog-walking/dog-sitting.jpg"
                    alt="Extended dog sitting and care"
                    width={400}
                    height={300}
                    className="rounded-xl object-cover w-full"
                  />
                </div>
                <div className="order-1 lg:order-2">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center">
                      <span className="text-xl">🏠</span>
                    </div>
                    <h3 className="text-3xl font-bold text-yellow-400">Dog Sitting</h3>
                  </div>
                  <div className="mb-6">
                    <span className="text-2xl font-bold text-white">From £25</span>
                    <span className="text-gray-300 ml-3">Minimum 2 hours</span>
                  </div>
                  <p className="text-gray-300 leading-relaxed mb-6">
                    For times when your dog needs extended care and companionship. Whether it's a few hours during the day 
                    or evening care, I provide flexible, personalized sitting services tailored to your dog's routine.
                  </p>

                  {/* Pricing Matrix */}
                  <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
                    <h4 className="text-lg font-semibold text-yellow-400 mb-4">Pricing Structure</h4>
                    
                    {/* Daytime Rates */}
                    <div className="mb-4">
                      <h5 className="text-white font-medium mb-2">Before 6 PM:</h5>
                      <div className="grid grid-cols-1 gap-1 text-sm text-gray-300">
                        <div className="flex justify-between">
                          <span>2 hours</span>
                          <span className="text-white font-medium">£25</span>
                        </div>
                        <div className="flex justify-between">
                          <span>2-4 hours</span>
                          <span className="text-white font-medium">£35</span>
                        </div>
                        <div className="flex justify-between">
                          <span>4-6 hours</span>
                          <span className="text-white font-medium">£45</span>
                        </div>
                      </div>
                    </div>

                    {/* Evening Rates */}
                    <div className="mb-4">
                      <h5 className="text-white font-medium mb-2">After 6 PM:</h5>
                      <div className="grid grid-cols-1 gap-1 text-sm text-gray-300">
                        <div className="flex justify-between">
                          <span>2 hours</span>
                          <span className="text-white font-medium">£35</span>
                        </div>
                        <div className="flex justify-between">
                          <span>2-4 hours</span>
                          <span className="text-white font-medium">£45</span>
                        </div>
                        <div className="flex justify-between">
                          <span>4-6 hours</span>
                          <span className="text-white font-medium">£55</span>
                        </div>
                      </div>
                    </div>

                    {/* Full Day */}
                    <div className="border-t border-gray-600 pt-3">
                      <div className="flex justify-between text-white font-medium">
                        <span>Full Day</span>
                        <span>£55</span>
                      </div>
                    </div>
                  </div>

                  <ul className="text-gray-300 space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-400">✓</span> Minimum 2 hours duration
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-400">✓</span> Home visits or extended park sessions
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-400">✓</span> Feeding and medication if needed
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-400">✓</span> Companionship for anxious dogs
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-400">✓</span> Regular updates throughout the session
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Summary */}
      <section className="py-16 bg-black/20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-semibold text-center mb-12">Pricing Overview</h2>
            
            {/* Walk Services */}
            <div className="mb-12">
              <h3 className="text-2xl font-semibold text-center mb-8 text-blue-400">Walk Services</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <div className="bg-gray-800/50 rounded-xl p-6 text-center border border-green-500/30">
                  <h4 className="text-lg font-semibold text-green-400 mb-2">Meet & Greet</h4>
                  <div className="text-2xl font-bold text-white mb-1">FREE</div>
                  <div className="text-sm text-gray-400">New clients • 30 min</div>
                </div>
                
                <div className="bg-gray-800/50 rounded-xl p-6 text-center border border-blue-500/30">
                  <h4 className="text-lg font-semibold text-blue-400 mb-2">Quick Walk</h4>
                  <div className="text-2xl font-bold text-white mb-1">£10</div>
                  <div className="text-sm text-gray-400">30 minutes</div>
                </div>
                
                <div className="bg-gray-800/50 rounded-xl p-6 text-center border border-purple-500/30">
                  <h4 className="text-lg font-semibold text-purple-400 mb-2">1 Hour Walk</h4>
                  <div className="text-lg font-bold text-white mb-1">
                    <div>£17.50 (1 dog)</div>
                    <div>£25 (2 dogs)</div>
                  </div>
                  <div className="text-sm text-gray-400">60 minutes</div>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-6 text-center border border-purple-500/30">
                  <h4 className="text-lg font-semibold text-purple-400 mb-2">2 Hour Walk</h4>
                  <div className="text-lg font-bold text-white mb-1">
                    <div>£25 (1 dog)</div>
                    <div>£32.50 (2 dogs)</div>
                  </div>
                  <div className="text-sm text-gray-400">2 hours</div>
                </div>
              </div>
            </div>

            {/* Dog Sitting Services */}
            <div>
              <h3 className="text-2xl font-semibold text-center mb-8 text-yellow-400">Dog Sitting Services</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Daytime Sitting */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-yellow-500/30">
                  <h4 className="text-lg font-semibold text-yellow-400 mb-3 text-center">Before 6 PM</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">2 hours</span>
                      <span className="text-white font-medium">£25</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">2-4 hours</span>
                      <span className="text-white font-medium">£35</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">4-6 hours</span>
                      <span className="text-white font-medium">£45</span>
                    </div>
                  </div>
                </div>

                {/* Evening Sitting */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-yellow-500/30">
                  <h4 className="text-lg font-semibold text-yellow-400 mb-3 text-center">After 6 PM</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">2 hours</span>
                      <span className="text-white font-medium">£35</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">2-4 hours</span>
                      <span className="text-white font-medium">£45</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">4-6 hours</span>
                      <span className="text-white font-medium">£55</span>
                    </div>
                  </div>
                </div>

                {/* Full Day */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-yellow-500/30 flex flex-col justify-center">
                  <h4 className="text-lg font-semibold text-yellow-400 mb-3 text-center">Full Day</h4>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-2">£55</div>
                    <div className="text-sm text-gray-400">Complete day care</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-semibold text-center mb-12">What's Always Included</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <div className="bg-gray-800/30 rounded-xl p-6 text-center border border-gray-700/50">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl">📱</span>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-blue-400">Photo Updates</h3>
                <p className="text-gray-300 text-sm">WhatsApp photos and updates during each visit</p>
              </div>
              
              <div className="bg-gray-800/30 rounded-xl p-6 text-center border border-gray-700/50">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl">🔒</span>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-purple-400">Reliable Service</h3>
                <p className="text-gray-300 text-sm">Punctual, trustworthy, and consistent care</p>
              </div>

              <div className="bg-gray-800/30 rounded-xl p-6 text-center border border-gray-700/50">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl">💬</span>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-green-400">Custom Requests</h3>
                <p className="text-gray-300 text-sm">Need something tailored? WhatsApp me: 07932749772</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-semibold mb-6">Ready to Book?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Start with a free Meet & Greet to see if we're a perfect match for your furry friend
          </p>
          <p className="text-lg text-gray-400 mb-12 max-w-xl mx-auto">
            Need something special? Custom arrangements available via WhatsApp: <br/>
            <a href="https://wa.me/447932749772" className="text-green-400 hover:text-green-300 font-semibold transition-colors">
              07932 749 772
            </a>
          </p>
          <Link
            href="/book-now"
            className="inline-block px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-lg rounded-full transition-all duration-300 transform hover:scale-105 shadow-xl"
          >
            Book Your Service Now
          </Link>
        </div>
      </section>
    </div>
  )
}