import { serviceCatalogue } from '@/lib/pricing';

const SITE = 'https://hunters-hounds.london';

/**
 * schema.org description of the business, published on every Hunter's Hounds
 * page so that search engines and AI assistants can read what the business is,
 * where it works and what it charges without parsing the prose.
 *
 * Prices come from lib/pricing.ts for the moment of the request, so a new
 * price book takes effect here on its own date with nothing to remember.
 *
 * No ratings or reviews on purpose: Google ignores ratings a business
 * publishes about itself, and marking them up breaks its guidelines.
 */
export function huntersHoundsJsonLd(now: Date = new Date()) {
    const s = serviceCatalogue(now);

    const offer = (name: string, description: string, price: number) => ({
        '@type': 'Offer',
        price: price.toFixed(2),
        priceCurrency: 'GBP',
        url: `${SITE}/services`,
        itemOffered: { '@type': 'Service', name, description, areaServed: 'Highbury and Islington, London' },
    });

    const offers = [
        offer(
            'Meet & Greet',
            'Free 30-minute introduction for new clients and their dog, before any walk is booked.',
            0
        ),
    ];

    if (s.quick.price != null) {
        offers.push(
            offer(
                'Quick Walk (30 minutes)',
                `A 30-minute one-on-one walk and play in the park. Two dogs from the same home: £${(s.quick.twoDogPrice ?? s.quick.price).toFixed(2)}.`,
                s.quick.price
            )
        );
    }

    for (const d of s.solo.durations ?? []) {
        const hours = d.duration / 60;
        offers.push(
            offer(
                `Solo Walk (${hours} ${hours === 1 ? 'hour' : 'hours'})`,
                `A one-on-one walk with photo updates. Two dogs from the same home: £${d.pricing.twoDogs.toFixed(2)}.`,
                d.pricing.oneDog
            )
        );
    }

    return {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        '@id': `${SITE}/#business`,
        name: "Hunter's Hounds",
        description:
            'One-on-one dog walking and dog sitting in Highbury and Islington, North London, around Highbury Fields and Clissold Park, with a free meet & greet for new clients.',
        url: SITE,
        image: `${SITE}/images/dog-walking/hunter-and-me.jpg`,
        telephone: '+447932749772',
        address: {
            '@type': 'PostalAddress',
            postalCode: 'N5 1JG',
            addressLocality: 'London',
            addressRegion: 'England',
            addressCountry: 'GB',
        },
        geo: { '@type': 'GeoCoordinates', latitude: 51.5614, longitude: -0.1048 },
        areaServed: ['Highbury', 'Highbury Fields', 'Clissold Park', 'Islington', 'North London'],
        knowsAbout: ['Dog walking', 'Dog sitting', 'Solo dog walks'],
        priceRange: '££',
        openingHours: 'Mo-Fr 09:00-20:00',
        hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'Dog walking and dog sitting',
            itemListElement: [
                ...offers,
                {
                    '@type': 'Offer',
                    url: `${SITE}/services`,
                    itemOffered: {
                        '@type': 'Service',
                        name: 'Dog Sitting',
                        description: `Daytime, evening and overnight dog sitting, by arrangement. ${s.sitting.priceDisplay}.`,
                        areaServed: 'Highbury and Islington, London',
                    },
                },
            ],
        },
    };
}
