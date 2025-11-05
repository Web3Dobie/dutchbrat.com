// File: frontend/app/dog-walking/page.tsx

import Image from 'next/image';
import MobileBookingCalendar from '../components/MobileBookingCalendar';
import { ServiceCard } from '@/app/components/ServiceCard';
import { DashboardServiceCard } from '@/app/components/DashboardServiceCard';
import { SERVICE_PRICING } from '@/lib/pricing';

// UPDATED: Added an optional 'objectPositionClass' prop to fix cropping
// Updated PlayfulImage component with responsive aspect ratios
function PlayfulImage({
  src,
  alt,
  rotationClass,
  aspectRatio = 'aspect-square',
  objectPositionClass = 'object-center'
}: {
  src: string,
  alt: string,
  rotationClass: string,
  aspectRatio?: string,
  objectPositionClass?: string
}) {
  return (
    <div className={`relative w-full ${aspectRatio} rounded-lg overflow-hidden shadow-2xl transition-transform duration-300 ease-in-out hover:scale-105 ${rotationClass}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-cover ${objectPositionClass}`}
        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
    </div>
  );
}

export default function DogWalkingPage() {
  return (
    <main className="bg-gray-950 text-white">
      {/* All content should be inside this SINGLE container div */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Section 1: Hero / Introduction */}
        <section className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">Hunter's Hounds</h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Professional & Loving Dog Walking Services, Inspired by a Best Friend.
          </p>

          {/* Added max-w-2xl mx-auto to center and constrain the image */}
          <div className="relative w-full max-w-2xl mx-auto aspect-square rounded-lg overflow-hidden shadow-2xl">
            <Image
              src="/images/dog-walking/hunter-and-me.jpg"
              alt="Myself with my Dobermann, Hunter"
              fill
              // ===== FIX #1: Added 'object-center' to prevent cropping your head =====
              className="object-cover object-center"
              priority
            />
          </div>
        </section>

        {/* Section 2: Our Story */}
        <section className="max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-semibold mb-4 text-center">Our Story</h2>
          <p className="text-gray-300 leading-relaxed">
            My name is Ernesto, and for 7 years, my best friend was Hunter, a loyal and loving Dobermann.
            Playing in the park with him was the best part of my day. After he passed, I wanted to
            find a way to honour his memory. Hunter's Hounds is my way of sharing the care, joy, and
            attention I gave him with other wonderful dogs in our community. I am reliable, experienced,
            and will treat your dog with the same love and respect I gave my sweet Boy.
          </p>
        </section>

        {/* Section 3: Services */}
        <section className="mb-16">
          <h2 className="text-3xl font-semibold mb-8 text-center">Services</h2>
          {/* Wrap the paragraph in a div to control width and centering */}
          <div className="max-w-3xl mx-auto mb-12">
            <p className="text-gray-300 leading-relaxed">
              Highbury Fields and Clissold Park are my favourite spots to walk dogs. I offer a range of services
              to suit your dog's needs, from solo walks (1 hour & 30 minutes) to longer dog sitting sessions.
              All walks include plenty of exercise, socialisation, and love. Your dog's happiness and well-being
              are my top priorities.

              New clients are welcome to book a free 30 minute meet-and-greet session, so I can get to know your dog
              and discuss their needs.
            </p>
          </div>
        
        {/* Services Grid and Dashboard Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* First 3 services (will be row 1 on desktop) */}
            {Object.values(SERVICE_PRICING).slice(0, 3).map(service => (
              <ServiceCard
                key={service.id}
                title={service.name}
                description={service.description}
                price={service.priceDisplay}
              />
            ))}
            
            {/* Dog Sitting (will start row 2 on desktop) */}
            {Object.values(SERVICE_PRICING).slice(3).map(service => (
              <ServiceCard
                key={service.id}
                title={service.name}
                description={service.description}
                price={service.priceDisplay}
              />
            ))}
            
            {/* Empty space for desktop layout - hidden on mobile/tablet */}
            <div className="hidden md:block"></div>
            
            {/* Dashboard Card - Distinctive styling */}
            <DashboardServiceCard />
          </div>
        </section>

        {/* Section 4: Booking Calendar with Mobile-Responsive Gallery */}
        <section>
          <h2 className="text-3xl font-bold mb-8 text-center text-blue-400">Book a Walk</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">

            {/* Left Image - Mobile: hidden, Desktop: portrait ratio */}
            <div className="hidden lg:flex justify-center">
              <PlayfulImage
                src="/images/dog-walking/photo1.jpg"
                alt="A happy dog in the park"
                rotationClass="-rotate-3 hover:-rotate-1"
                aspectRatio="aspect-[3/4]"
              />
            </div>

            {/* Booking Calendar - Center */}
            <div className="max-w-xl mx-auto w-full bg-gray-900 rounded-lg p-2 lg:col-span-1">
              <MobileBookingCalendar />
            </div>

            {/* Right Image - Mobile: hidden, Desktop: portrait ratio */}
            <div className="hidden lg:flex justify-center">
              <PlayfulImage
                src="/images/dog-walking/photo2.jpg"
                alt="Hunter enjoying the park scenery"
                rotationClass="rotate-3 hover:rotate-1"
                aspectRatio="aspect-[3/4]"
                objectPositionClass="object-center"
              />
            </div>

          </div>

          {/* Mobile Gallery - Shows on mobile/tablet, hidden on desktop */}
          <div className="mt-8 lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-6">
            <PlayfulImage
              src="/images/dog-walking/photo1.jpg"
              alt="A happy dog in the park"
              rotationClass="-rotate-1"
              aspectRatio="aspect-[4/3]"
            />
            <PlayfulImage
              src="/images/dog-walking/photo2.jpg"
              alt="Hunter enjoying the park scenery"
              rotationClass="rotate-1"
              aspectRatio="aspect-[4/3]"
              objectPositionClass="object-center"
            />
          </div>

          {/* Bottom Image - Responsive ratios */}
          <div className="mt-8 max-w-lg mx-auto">
            <PlayfulImage
              src="/images/dog-walking/photo3.jpg"
              alt="A sunny day in the park"
              rotationClass="rotate-2"
              aspectRatio="aspect-[4/3] lg:aspect-[3/4]"
            />
          </div>
        </section>
      </div>
    </main>
  );
}