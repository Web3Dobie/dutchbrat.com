import { Fragment } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { allPriceBooks, priceBookFor, londonDate, type PriceBook } from '@/lib/pricing'

/**
 * Prices live in lib/pricing.ts and appear ONCE on this page, in the rate card
 * below. The service cards carry a headline figure only.
 *
 * The rate card shows every price book that is still relevant: today's, plus
 * the next one if a change is coming. That makes the January change visible to
 * clients now, and it retires itself — once 1 Jan passes, priceBookFor returns
 * the new book, no later book exists, and the page silently goes back to a
 * single column. Nothing to remember to take down.
 *
 * Resolved per request rather than at module load: this container runs for
 * weeks, so a module constant would still be serving December's prices in
 * January.
 */

const gbp = (n: number) => `£${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`

/** 'YYYY-MM-DD' -> '1 January 2027'. Midday UTC to stay clear of TZ edges. */
const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

/** 'YYYY-MM-DD' -> '1 Jan'. */
const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })

const dayBefore = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

interface RateColumn {
  book: PriceBook
  heading: string
  highlight: boolean
}

export default function ServicesPage() {
  const now = new Date()
  const today = londonDate(now)
  const current = priceBookFor(now)
  const next = allPriceBooks().find((b) => b.effectiveFrom > today) ?? null

  const columns: RateColumn[] = next
    ? [
        { book: current, heading: `Until ${longDate(dayBefore(next.effectiveFrom))}`, highlight: false },
        { book: next, heading: `From ${longDate(next.effectiveFrom)}`, highlight: true },
      ]
    : [{ book: current, heading: 'Price', highlight: false }]

  // Headline figure on a service card: today's price, and what it becomes.
  const headline = (pick: (b: PriceBook) => string) => ({
    today: pick(current),
    soon: next ? pick(next) : null,
  })

  const quick = headline((b) => `${gbp(b.walk[30][1])} / ${gbp(b.walk[30][2])}`)
  const solo = headline((b) => `${gbp(b.walk[60][1])} / ${gbp(b.walk[60][2])}`)
  const sit = headline((b) => `From ${gbp(b.sitting.bands[0].beforeEvening)}`)

  const changeFrom = next ? shortDate(next.effectiveFrom) : null

  const walkRows: { label: string; detail: string; duration: 30 | 60 | 120 }[] = [
    { label: 'Quick Walk', detail: '30 minutes', duration: 30 },
    { label: 'Solo Walk', detail: '1 hour', duration: 60 },
    { label: 'Solo Walk', detail: '2 hours', duration: 120 },
  ]

  const cellBase = 'px-4 py-3 text-right tabular-nums whitespace-nowrap'
  const headBase = 'px-4 py-3 text-xs font-semibold uppercase tracking-wide'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <section className="py-16 bg-black/20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600 bg-clip-text text-transparent">
            My Services
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Professional dog walking and pet care services tailored to your furry friend&apos;s needs.
            All services include one-on-one attention in beautiful Highbury Fields and Clissold Park.
          </p>
        </div>
      </section>

      {/* Rate change notice — only while a change is still ahead of us */}
      {next && (
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto bg-amber-500/10 border border-amber-500/40 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-12 h-12 shrink-0 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📅</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-amber-300 mb-1">
                    My rates are changing on {longDate(next.effectiveFrom)}
                  </h2>
                  <p className="text-gray-300">
                    These are my first new rates in some time, and they keep the service sustainable
                    so I can carry on giving every dog the same individual attention. Both the current
                    and the new prices are shown side by side below, so there are no surprises.
                    Anything already in the diary before {longDate(next.effectiveFrom)} is charged
                    at today&apos;s rate.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

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

      {/* Detailed Services — what each service IS. Full prices are in the rate card. */}
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
                    <h3 className="text-3xl font-bold text-green-400">Meet &amp; Greet</h3>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">FREE</span>
                    <span className="text-gray-300 ml-3">for new clients • 30 minutes</span>
                    {next && <div className="mt-2 text-sm text-gray-400">Staying free</div>}
                  </div>
                  <p className="text-gray-300 leading-relaxed mb-6">
                    A perfect introduction for new clients and their dogs. I&apos;ll visit your home to meet your furry friend,
                    understand their personality, discuss their specific needs, and answer any questions you have about my services.
                  </p>
                  <ul className="text-gray-300 space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">✓</span> Personal introduction at your home
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">✓</span> Assess your dog&apos;s temperament and needs
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
                    <span className="text-4xl font-bold text-white">{quick.today}</span>
                    <span className="text-gray-300 ml-3">30 minutes • 1 or 2 dogs</span>
                    {quick.soon && (
                      <div className="mt-2 text-sm text-amber-300/90">
                        {quick.soon} from {changeFrom}
                      </div>
                    )}
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
                    <span className="text-4xl font-bold text-white">{solo.today}</span>
                    <span className="text-gray-300 ml-3">1 hour • 1 or 2 dogs</span>
                    {solo.soon && (
                      <div className="mt-2 text-sm text-amber-300/90">
                        {solo.soon} from {changeFrom}
                      </div>
                    )}
                    <div className="mt-1 text-sm text-gray-400">Two-hour walks also available</div>
                  </div>
                  <p className="text-gray-300 leading-relaxed mb-6">
                    The premium experience — focused individual attention for your dog(s). Perfect for dogs who
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
            <div className="bg-gradient-to-r from-yellow-900/30 to-gray-800/30 rounded-2xl p-8 border border-yellow-500/30">
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
                    <span className="text-4xl font-bold text-white">{sit.today}</span>
                    <span className="text-gray-300 ml-3">
                      minimum {current.sitting.minimumHours} hours
                    </span>
                    {sit.soon && (
                      <div className="mt-2 text-sm text-amber-300/90">
                        {sit.soon} from {changeFrom}
                      </div>
                    )}
                  </div>
                  <p className="text-gray-300 leading-relaxed mb-6">
                    For times when your dog needs extended care and companionship. Whether it&apos;s a few hours during the day
                    or evening care, I provide flexible, personalised sitting services tailored to your dog&apos;s routine.
                  </p>
                  <ul className="text-gray-300 space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="text-yellow-400">✓</span> Minimum {current.sitting.minimumHours} hours duration
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

      {/* The rate card — the single place every price is written down */}
      <section id="rates" className="py-16 bg-black/20 scroll-mt-8">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-semibold text-center mb-3">Rate Card</h2>
            <p className="text-gray-400 text-center mb-12">
              {next
                ? `Today's rates and the new rates from ${longDate(next.effectiveFrom)}, side by side.`
                : 'All prices include one-on-one attention and photo updates.'}
            </p>

            {/* Walks */}
            <div className="mb-12">
              <h3 className="text-2xl font-semibold mb-6 text-blue-400">Walks</h3>
              <div className="bg-gray-800/40 rounded-2xl border border-gray-700/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse">
                    <thead>
                      <tr className="border-b border-gray-700/60">
                        <th rowSpan={2} className={`${headBase} text-left text-gray-400 align-bottom`}>
                          Service
                        </th>
                        {columns.map((c) => (
                          <th
                            key={c.book.effectiveFrom}
                            colSpan={2}
                            className={`${headBase} text-center ${
                              c.highlight ? 'text-amber-300 bg-amber-500/10' : 'text-gray-400'
                            }`}
                          >
                            {c.heading}
                          </th>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-700/60 text-gray-500">
                        {columns.map((c) => (
                          <Fragment key={c.book.effectiveFrom}>
                            <th className={`${headBase} text-right font-medium ${c.highlight ? 'bg-amber-500/10' : ''}`}>
                              1 dog
                            </th>
                            <th className={`${headBase} text-right font-medium ${c.highlight ? 'bg-amber-500/10' : ''}`}>
                              2 dogs
                            </th>
                          </Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-700/40">
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">Meet &amp; Greet</div>
                          <div className="text-sm text-gray-400">New clients • 30 minutes</div>
                        </td>
                        {columns.map((c) => (
                          <td
                            key={c.book.effectiveFrom}
                            colSpan={2}
                            className={`${cellBase} text-center text-green-400 font-semibold ${
                              c.highlight ? 'bg-amber-500/5' : ''
                            }`}
                          >
                            FREE
                          </td>
                        ))}
                      </tr>
                      {walkRows.map((row) => (
                        <tr key={`${row.label}-${row.duration}`} className="border-b border-gray-700/40 last:border-0">
                          <td className="px-4 py-3">
                            <div className="text-white font-medium">{row.label}</div>
                            <div className="text-sm text-gray-400">{row.detail}</div>
                          </td>
                          {columns.map((c) => (
                            <Fragment key={c.book.effectiveFrom}>
                              <td className={`${cellBase} text-white ${c.highlight ? 'bg-amber-500/5 font-semibold' : ''}`}>
                                {gbp(c.book.walk[row.duration][1])}
                              </td>
                              <td className={`${cellBase} text-white ${c.highlight ? 'bg-amber-500/5 font-semibold' : ''}`}>
                                {gbp(c.book.walk[row.duration][2])}
                              </td>
                            </Fragment>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sitting */}
            <div>
              <h3 className="text-2xl font-semibold mb-6 text-yellow-400">Dog Sitting</h3>
              <div className="bg-gray-800/40 rounded-2xl border border-gray-700/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] border-collapse">
                    <thead>
                      <tr className="border-b border-gray-700/60">
                        <th rowSpan={2} className={`${headBase} text-left text-gray-400 align-bottom`}>
                          Duration
                        </th>
                        {columns.map((c) => (
                          <th
                            key={c.book.effectiveFrom}
                            colSpan={2}
                            className={`${headBase} text-center ${
                              c.highlight ? 'text-amber-300 bg-amber-500/10' : 'text-gray-400'
                            }`}
                          >
                            {c.heading}
                          </th>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-700/60 text-gray-500">
                        {columns.map((c) => (
                          <Fragment key={c.book.effectiveFrom}>
                            <th className={`${headBase} text-right font-medium ${c.highlight ? 'bg-amber-500/10' : ''}`}>
                              Starts before 6 PM
                            </th>
                            <th className={`${headBase} text-right font-medium ${c.highlight ? 'bg-amber-500/10' : ''}`}>
                              Starts 6 PM or later
                            </th>
                          </Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {current.sitting.bands.map((band, i) => (
                        <tr key={band.label} className="border-b border-gray-700/40">
                          <td className="px-4 py-3 text-white font-medium">
                            {band.label}
                            {band.maxHours === null && (
                              <span className="block text-sm text-gray-400 font-normal">
                                Over {current.sitting.bands[i - 1]?.maxHours ?? 6} hours
                              </span>
                            )}
                          </td>
                          {columns.map((c) => {
                            const b = c.book.sitting.bands[i]
                            const same = b.beforeEvening === b.fromEvening
                            return same ? (
                              <td
                                key={c.book.effectiveFrom}
                                colSpan={2}
                                className={`${cellBase} text-center text-white ${
                                  c.highlight ? 'bg-amber-500/5 font-semibold' : ''
                                }`}
                              >
                                {gbp(b.beforeEvening)}
                                <span className="text-gray-400 text-sm font-normal"> (any start time)</span>
                              </td>
                            ) : (
                              <Fragment key={c.book.effectiveFrom}>
                                <td className={`${cellBase} text-white ${c.highlight ? 'bg-amber-500/5 font-semibold' : ''}`}>
                                  {gbp(b.beforeEvening)}
                                </td>
                                <td className={`${cellBase} text-white ${c.highlight ? 'bg-amber-500/5 font-semibold' : ''}`}>
                                  {gbp(b.fromEvening)}
                                </td>
                              </Fragment>
                            )
                          })}
                        </tr>
                      ))}
                      <tr>
                        <td className="px-4 py-3 text-white font-medium">
                          Overnight
                          <span className="block text-sm text-gray-400 font-normal">Per night</span>
                        </td>
                        {columns.map((c) => (
                          <td
                            key={c.book.effectiveFrom}
                            colSpan={2}
                            className={`${cellBase} text-center text-white ${
                              c.highlight ? 'bg-amber-500/5 font-semibold' : ''
                            }`}
                          >
                            {gbp(c.book.sitting.overnightPerNight)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-4">
                Sittings are a minimum of {current.sitting.minimumHours} hours. The evening rate applies
                when a sitting <em>starts</em> at {current.sitting.eveningFromHour % 12 || 12} PM or later.
                Longer stays are quoted individually — please just ask.
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Sittings are arranged directly with me rather than booked online. Drop me a message and
                we&apos;ll sort out the details.
              </p>
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
