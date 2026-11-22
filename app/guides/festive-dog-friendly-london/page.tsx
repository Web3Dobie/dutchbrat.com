import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: "Festive Dog-Friendly London & Highbury Guide (2026) | Hunter's Hounds",
    description:
        "Ernesto's curated guide to the best dog-friendly Christmas events, charity walks, and cozy pub stops around Highbury, Islington, and wider London for 2026.",
    openGraph: {
        title: 'Festive Dog-Friendly London & Highbury Guide (2026)',
        description:
            'Our favourite local winter walk loops, dog-friendly cafes, and London Christmas events to enjoy with your pup this season.',
        type: 'article',
    },
    alternates: { canonical: 'https://hunters-hounds.london/guides/festive-dog-friendly-london' },
}

/**
 * A public guide page, linked from the December 2026 newsletter.
 *
 * Deliberately a static server component: no session, no database, no client
 * JavaScript. It has to load for someone who taps a link in an email, which
 * means it must work for people with no account and no cookie.
 *
 * Content lives in the two arrays below rather than inline in the markup, so
 * next year's edition is an edit to data rather than a rewrite of the page.
 */

interface LocalSpot {
    name: string
    tag: string
    location: string
    description: string
    /** Omitted where there is no verified page to link to. */
    linkLabel?: string
    href?: string
    accent: string
    badge: string
}

interface FestiveEvent {
    name: string
    date: string
    time: string
    location: string
    description: string
    /** Omitted where there is no verified page to link to. */
    linkLabel?: string
    href?: string
}

const LOCAL_SPOTS: LocalSpot[] = [
    {
        name: 'La Maison Highbury',
        tag: 'Local Favourite',
        location: '19 Calabria Road, N5 1JB — on the corner',
        description:
            'A small, cosy neighbourhood cafe on the corner of Calabria Road, doing baked goods, bagels, sandwiches and salads with local suppliers. Close enough to the Fields to be the natural end of a morning loop, and a proper local rather than somewhere you would make a trip for. Properly dog-friendly — they keep polaroids of their regulars up in the cafe, so your dog may well end up on the wall. No bookings, you just walk in.',
        linkLabel: 'La Maison Highbury',
        href: 'https://www.lamaisonhighbury.co.uk/',
        accent: 'text-amber-400',
        badge: 'border-amber-500/30 bg-amber-500/10',
    },
    {
        name: 'Vertige Café',
        tag: 'Cosy Cafe',
        location: 'Highbury Corner / off the Fields',
        description:
            'A warm, French-leaning indoor refuge for humans and dogs on cold winter mornings — no need to sit out in the December frost for a coffee and a pastry.',
        linkLabel: 'Islington Local Guide',
        href: 'https://islingtonlocalguide.co.uk/dog-friendly-islington/',
        accent: 'text-red-400',
        badge: 'border-red-500/30 bg-red-500/10',
    },
    {
        name: 'Canonbury Tavern',
        tag: 'Festive Pub Stop',
        location: '21 Canonbury Place, N1 2NS',
        description:
            'An easy festive pub stop if you loop from Highbury down through the New River Walk and Canonbury’s Georgian squares. “Dogs are always welcome” in their own words — bar, dining room and the garden — with water bowls provided. Worth knowing the pub and garden are adults-only after 6pm.',
        linkLabel: 'The Canonbury Tavern',
        href: 'https://www.thecanonbury.co.uk/',
        accent: 'text-emerald-400',
        badge: 'border-emerald-500/30 bg-emerald-500/10',
    },
    {
        name: 'Coal Drops Yard',
        tag: 'Lights & Markets',
        location: "King's Cross, N1C",
        description:
            'Just a short hop down the canal from Angel, and it goes all out: the King’s Cross Winter Market runs 26 November to 3 January, Christmas Under the Canopy from 20 November to 23 December, and there are smaller craft and food markets most weekends in December. Plenty of the cafes and restaurants welcome dogs inside — we have spent a lot of time here with Hunter — and most of it is outdoors on the cobbles anyway.',
        linkLabel: 'Coal Drops Yard',
        href: 'https://www.coaldropsyard.com/',
        accent: 'text-amber-300',
        badge: 'border-amber-400/30 bg-amber-400/10',
    },
]

const FESTIVE_EVENTS: FestiveEvent[] = [
    {
        name: 'Rescue Dogs of London & Friends Christmas Jumper Parade',
        date: 'Saturday 28 November 2026',
        time: '10:00 – 12:00',
        location: "Central London, near St James's Park",
        description:
            'This annual festive parade invites rescue dogs and friends to show off their best Christmas jumpers for charity, finishing with a group photo in front of Buckingham Palace. The exact meeting point is still to be announced, so check the listing nearer the time.',
        linkLabel: 'Join the waitlist via The Dogvine',
        href: 'https://thedogvine.com/events/rescue-dogs-of-london-friends-dog-christmas-jumper-parade/',
    },
    {
        name: 'Carols at the Barn',
        date: 'Saturday 28 November 2026',
        time: '16:30',
        location: 'Highbury Barn Square, N5',
        description:
            'One on our own doorstep: carols in the square outside The Highbury Barn, led by the Choir of St Joan of Arc. It is out in the open air, so a calm dog on a lead can stand and listen with you — though it will be dark and there will be a crowd and singing, so it is one for dogs who are comfortable with both.',
    },
    {
        name: 'Christmas Charity Pack Walk',
        date: 'Saturday 12 December 2026',
        time: '11:00 – 15:00 · £20 per person',
        location: 'London — meeting point shared on booking',
        description:
            'Supporting the Canine Welfare Fund, this on-lead group walk includes a dog fancy-dress competition and access to a dog-friendly cafe. Booking and payment are required in advance and are non-refundable, and the meeting point is only shared once payment clears.',
        linkLabel: 'Register via Find Dog Friendly Places',
        href: 'https://www.finddogfriendlyplaces.co.uk/events/christmas-pack-walk-london-charity-dogs',
    },
    {
        name: 'Family Wild Walk: Hackney Downs to Hackney Central',
        date: 'Saturday 12 December 2026',
        time: '10:45 – 13:00 · free',
        location: 'Meet at Hackney Downs, E5',
        description:
            'A gentle family walk led by Outdoor People, gathering at 10:45 and setting off at 11. Well-behaved dogs on leads are welcome. There is no fee — they simply ask that you take a friend out on a walk of your own sometime.',
        linkLabel: 'Book a free place via Humanitix',
        href: 'https://events.humanitix.com/family-wild-walk-hackney-downs-to-hackney-central',
    },
    {
        name: 'All Dogs Matter: Dog Christmas Jingle & Mingle',
        date: 'Sunday 13 December 2026',
        time: '11:00 – 14:00 · free entry',
        location: 'The Spaniards Inn, Hampstead Heath, NW3 7JJ',
        description:
            'Dust off your best — or worst — Christmas jumper for an All Dogs Matter get-together at the Spaniards Inn. Carols at 1pm, mince pies and mulled wine, and prizes for the best Christmas jumpers. Free entry, everyone welcome.',
        linkLabel: 'All Dogs Matter events',
        href: 'https://alldogsmatter.co.uk/get-involved/events/',
    },
    {
        name: 'Santa Paws at Capel Manor Gardens',
        date: 'Saturday 19 December 2026',
        time: '10:00 – 16:00 · last entry 15:30',
        location: 'Capel Manor Gardens, Enfield',
        description:
            'On-lead dogs can visit Santa in the Manor House grotto, try a dog agility course, and browse festive pet stalls across the 30-acre grounds. The Santa Paws experience is £5 per dog on top of Gardens admission and must be booked in advance; dogs are not allowed in the mini zoo. Free parking on site.',
        linkLabel: 'Book tickets at Capel Manor Gardens',
        href: 'https://www.capelmanorgardens.co.uk/event/santa-paws-at-capel-manor-gardens-2/',
    },
    {
        name: 'Hackney Flea Mas Market',
        date: 'Saturday 19 & Sunday 20 December 2026',
        time: '10:00 – 17:00 · free entry',
        location: 'Abney Public Hall, 73a Stoke Newington Church Street, N16 0AS',
        description:
            'Two days of festive flea market across the hall, first floor and basement, with free entry. The organisers list it as dog friendly, and it is an easy detour from Highbury if you are already heading up Church Street.',
        linkLabel: 'Hackney Flea on Eventbrite',
        href: 'https://www.eventbrite.co.uk/e/hackney-flea-mas-market-tickets-1992335582359',
    },
    {
        name: 'Early Morning Christmas Lights Walk',
        date: 'Throughout December',
        time: 'Best before 08:30',
        location: 'Mayfair, Covent Garden & Chelsea',
        description:
            'For dogs who prefer calm streets over busy crowds, an early morning stroll beneath the outdoor displays in Mayfair or Covent Garden lets you soak up the lights in peace.',
        linkLabel: "Raven Imagery's London Christmas guide",
        href: 'https://www.ravenimagery.co.uk/dog-photography-journal/christmas-with-your-dog-london',
    },
]

/**
 * Falling snow across the whole page.
 *
 * Pure CSS, rendered on the server: no client JavaScript, no hydration, and it
 * works for someone who taps the link in an email on a slow phone. The flake
 * values are fixed rather than random so the server and client markup always
 * agree.
 *
 * Honours prefers-reduced-motion — a screenful of drifting specks is a genuine
 * problem for people with vestibular conditions, and the page reads perfectly
 * well with the flakes held still.
 */
const SNOWFLAKES = [
    { left: 4, size: 14, duration: 14, delay: 0, drift: 40, opacity: 0.5, glyph: '❄' },
    { left: 11, size: 10, duration: 19, delay: 3, drift: -30, opacity: 0.35, glyph: '❅' },
    { left: 18, size: 18, duration: 12, delay: 6, drift: 60, opacity: 0.45, glyph: '❆' },
    { left: 25, size: 11, duration: 17, delay: 1, drift: -50, opacity: 0.4, glyph: '❄' },
    { left: 32, size: 16, duration: 21, delay: 8, drift: 25, opacity: 0.3, glyph: '❅' },
    { left: 39, size: 12, duration: 15, delay: 4, drift: -40, opacity: 0.5, glyph: '❆' },
    { left: 46, size: 20, duration: 24, delay: 2, drift: 55, opacity: 0.35, glyph: '❄' },
    { left: 53, size: 13, duration: 16, delay: 9, drift: -20, opacity: 0.45, glyph: '❅' },
    { left: 60, size: 10, duration: 20, delay: 5, drift: 45, opacity: 0.4, glyph: '❆' },
    { left: 67, size: 17, duration: 13, delay: 11, drift: -55, opacity: 0.5, glyph: '❄' },
    { left: 74, size: 12, duration: 22, delay: 7, drift: 30, opacity: 0.3, glyph: '❅' },
    { left: 81, size: 15, duration: 18, delay: 0, drift: -35, opacity: 0.45, glyph: '❆' },
    { left: 88, size: 11, duration: 23, delay: 10, drift: 50, opacity: 0.35, glyph: '❄' },
    { left: 95, size: 19, duration: 15, delay: 12, drift: -25, opacity: 0.4, glyph: '❅' },
    { left: 8, size: 13, duration: 26, delay: 14, drift: 35, opacity: 0.3, glyph: '❆' },
    { left: 29, size: 9, duration: 11, delay: 13, drift: -45, opacity: 0.5, glyph: '❄' },
    { left: 50, size: 14, duration: 25, delay: 16, drift: 20, opacity: 0.35, glyph: '❅' },
    { left: 71, size: 16, duration: 14, delay: 15, drift: -60, opacity: 0.4, glyph: '❆' },
    { left: 85, size: 10, duration: 19, delay: 18, drift: 40, opacity: 0.45, glyph: '❄' },
    { left: 15, size: 21, duration: 28, delay: 17, drift: -30, opacity: 0.25, glyph: '❅' },
]

const SNOW_CSS = `
@keyframes hh-snowfall {
  0%   { transform: translate3d(0, -12vh, 0) rotate(0deg);   opacity: 0; }
  8%   { opacity: var(--hh-o); }
  92%  { opacity: var(--hh-o); }
  100% { transform: translate3d(var(--hh-drift), 112vh, 0) rotate(360deg); opacity: 0; }
}
.hh-flake {
  position: absolute;
  top: 0;
  color: #fff;
  will-change: transform;
  animation-name: hh-snowfall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
@media (prefers-reduced-motion: reduce) {
  .hh-flake { animation: none; opacity: var(--hh-o); top: 15%; }
}
`

function Snowfall() {
    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: SNOW_CSS }} />
            <div
                aria-hidden
                className="pointer-events-none fixed inset-0 z-20 select-none overflow-hidden"
            >
                {SNOWFLAKES.map((f, i) => (
                    <span
                        key={i}
                        className="hh-flake"
                        style={
                            {
                                left: `${f.left}%`,
                                fontSize: `${f.size}px`,
                                animationDuration: `${f.duration}s`,
                                animationDelay: `-${f.delay}s`,
                                '--hh-drift': `${f.drift}px`,
                                '--hh-o': f.opacity,
                            } as React.CSSProperties
                        }
                    >
                        {f.glyph}
                    </span>
                ))}
            </div>
        </>
    )
}

/** A string of Christmas lights, as a divider. Decorative only. */
function LightString() {
    const bulbs = [
        'bg-red-500',
        'bg-amber-400',
        'bg-emerald-500',
        'bg-blue-400',
        'bg-red-500',
        'bg-amber-400',
        'bg-emerald-500',
        'bg-blue-400',
        'bg-red-500',
        'bg-amber-400',
        'bg-emerald-500',
        'bg-blue-400',
    ]
    return (
        <div aria-hidden className="flex items-center justify-center gap-3 py-1">
            {bulbs.map((colour, i) => (
                <span
                    key={i}
                    className={`h-2 w-2 rounded-full ${colour} shadow-[0_0_8px_currentColor] opacity-80`}
                />
            ))}
        </div>
    )
}

export default function FestiveDogFriendlyLondonPage() {
    return (
        <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 text-white">
            <Snowfall />

            {/* Hero */}
            <section className="relative overflow-hidden py-16 bg-gradient-to-b from-emerald-900/40 via-black/30 to-transparent">
                {/* Decorative snow. aria-hidden: it says nothing a screen reader needs. */}
                <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
                    <span className="absolute left-[2%] top-6 text-7xl opacity-70 drop-shadow-lg md:text-8xl">&#127876;</span>
                    <span className="absolute right-[2%] top-8 text-7xl opacity-70 drop-shadow-lg md:text-8xl">&#127876;</span>
                    <span className="absolute bottom-4 left-[13%] text-5xl opacity-65 drop-shadow-lg md:text-7xl">&#127872;</span>
                    <span className="absolute bottom-6 right-[12%] text-5xl opacity-65 drop-shadow-lg md:text-7xl">&#127872;</span>
                    <span className="absolute left-[22%] top-28 text-4xl opacity-60 md:text-5xl">&#11088;</span>
                    <span className="absolute right-[21%] top-32 text-4xl opacity-60 md:text-5xl">&#11088;</span>
                    <span className="absolute left-[39%] top-1 text-3xl opacity-50 md:text-4xl">&#11088;</span>
                </div>

                <div className="container relative mx-auto px-4 text-center">
                    <p className="mb-4 text-sm uppercase tracking-[0.2em] text-amber-300/80">
                        &#127876; A Hunter&apos;s Hounds Guide
                    </p>
                    <h1 className="mb-6 bg-gradient-to-r from-red-400 via-amber-300 to-emerald-400 bg-clip-text pb-4 text-4xl font-bold leading-[1.25] text-transparent md:text-6xl">
                        Festive Dog-Friendly Guide: Highbury &amp; London
                    </h1>
                    <p className="mx-auto max-w-3xl text-xl leading-relaxed text-gray-300">
                        Curated by Ernesto at Hunter&apos;s Hounds &mdash; our favourite local winter
                        walk loops, dog-friendly cafes, and London Christmas events to enjoy with your
                        pup this season.
                    </p>
                    <div className="mt-10">
                        <LightString />
                    </div>
                </div>
            </section>

            {/* Section 1 — local */}
            <section className="py-16">
                <div className="container mx-auto max-w-6xl px-4">
                    <h2 className="mb-3 text-3xl font-bold text-white">
                        <span className="mr-3 align-middle text-4xl" aria-hidden>
                            &#127876;
                        </span>
                        Close to home: Highbury &amp; Islington
                    </h2>
                    <p className="mb-10 max-w-2xl text-gray-400">
                        The places we actually walk past every week, and where a cold morning can
                        reasonably end in something warm.
                    </p>

                    <div className="grid gap-6 md:grid-cols-2">
                        {LOCAL_SPOTS.map((spot) => (
                            <div
                                key={spot.name}
                                className="rounded-2xl border border-emerald-800/40 bg-gradient-to-br from-gray-800/60 to-emerald-950/30 p-6 transition-colors duration-300 hover:border-amber-500/40"
                            >
                                <div className="mb-3 flex items-start justify-between gap-4">
                                    <h3 className="text-xl font-semibold text-white">{spot.name}</h3>
                                    <span
                                        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${spot.accent} ${spot.badge}`}
                                    >
                                        {spot.tag}
                                    </span>
                                </div>
                                <p className="mb-3 text-sm text-gray-400">{spot.location}</p>
                                <p className="mb-4 leading-relaxed text-gray-300">{spot.description}</p>
                                {spot.href && (
                                    <a
                                        href={spot.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-amber-400 underline hover:text-amber-300"
                                    >
                                        {spot.linkLabel} &rarr;
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <LightString />

            {/* Section 2 — events */}
            <section className="bg-black/30 py-16">
                <div className="container mx-auto max-w-6xl px-4">
                    <h2 className="mb-3 text-3xl font-bold text-white">
                        <span className="mr-3 align-middle text-4xl" aria-hidden>
                            &#11088;
                        </span>
                        London Christmas dog events, 2026
                    </h2>
                    <p className="mb-10 max-w-2xl text-gray-400">
From our own square to the other side of town. Most raise money for rescue, and
                        several book up, so check before you travel.
                    </p>

                    <div className="space-y-5">
                        {FESTIVE_EVENTS.map((event) => (
                            <div
                                key={event.name}
                                className="rounded-2xl border border-emerald-800/40 bg-gradient-to-br from-gray-800/60 to-emerald-950/30 p-6 transition-colors duration-300 hover:border-red-500/40"
                            >
                                <div className="flex flex-col gap-5 md:flex-row md:items-start">
                                    {/* Date badge */}
                                    <div className="shrink-0 md:w-48">
                                        <div className="inline-block rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/15 to-emerald-500/15 px-4 py-3 md:block">
                                            <p className="text-sm font-semibold leading-snug text-amber-300">
                                                {event.date}
                                            </p>
                                            <p className="mt-1 text-sm text-gray-400">{event.time}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="mb-2 text-xl font-semibold text-white">
                                            {event.name}
                                        </h3>
                                        <p className="mb-3 text-sm text-gray-400">{event.location}</p>
                                        <p className="mb-4 leading-relaxed text-gray-300">
                                            {event.description}
                                        </p>
                                        {event.href && (
                                            <a
                                                href={event.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-amber-400 underline hover:text-amber-300"
                                            >
                                                {event.linkLabel} &rarr;
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="mt-8 text-sm text-gray-500">
                        Dates and times are as published by the organisers and can change &mdash; always
                        check the event link before setting off.
                    </p>
                </div>
            </section>

            {/* CTA — walks only. Boarding is gone over Christmas and New Year. */}
            <section className="py-16">
                <div className="container mx-auto max-w-4xl px-4">
                    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-red-600/15 via-emerald-700/15 to-red-600/15 p-8 text-center md:p-10">
                        <div className="mb-5">
                            <LightString />
                        </div>
                        <h2 className="mb-4 text-2xl font-bold text-white md:text-3xl">
                            <span className="mr-3 align-middle text-4xl" aria-hidden>
                                &#127872;
                            </span>
                            Busy over the holidays?
                        </h2>
                        <p className="mx-auto mb-8 max-w-2xl leading-relaxed text-gray-300">
                            Home boarding is fully booked for Christmas and New Year, but there is still
                            room in the diary for walks. If the days get away from you between visitors,
                            cooking and travel, your dog can still get a proper hour around Highbury
                            Fields or Clissold Park.
                        </p>
                        <div className="flex flex-col justify-center gap-4 sm:flex-row">
                            <Link
                                href="/book-now"
                                className="inline-block rounded-xl bg-gradient-to-r from-red-600 to-emerald-600 px-8 py-3 font-bold text-white transition-all duration-300 hover:from-red-700 hover:to-emerald-700"
                            >
                                Book a walk
                            </Link>
                            <Link
                                href="/my-account"
                                className="inline-block rounded-xl border border-gray-600 px-8 py-3 font-semibold text-gray-200 transition-all duration-300 hover:border-amber-500/50 hover:text-white"
                            >
                                Go to my account
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
