// lib/pricing.ts - Enhanced for solo walk durations
export interface ServicePricing {
  id: string;
  name: string;
  description: string;
  durations?: {
    duration: number;
    pricing: {
      oneDog: number;
      twoDogs: number;
    };
  }[];
  duration?: number | null; // For simple services
  price?: number | null;
  priceDisplay: string;
}

export const SERVICE_PRICING: Record<string, ServicePricing> = {
  meetgreet: {
    id: "meetgreet",
    name: "Meet & Greet - for new clients",
    description: "Free 30-minute introduction session for new clients.",
    duration: 30,
    price: 0,
    priceDisplay: "FREE / 30-mins"
  },
  solo: {
    id: "solo", 
    name: "Solo Walk",
    description: "One-on-one attention for your best friend. Choose your duration.",
    durations: [
      {
        duration: 60,
        pricing: { oneDog: 17.50, twoDogs: 25.00 }
      },
      {
        duration: 120, 
        pricing: { oneDog: 25.00, twoDogs: 32.50 }
      }
    ],
    priceDisplay: "£17.50 - £32.50"
  },
  quick: {
    id: "quick",
    name: "Quick Walk (30 min)",
    description: "A fun, quick play in the park.",
    duration: 30,
    price: 10.00,
    priceDisplay: "£10 / 30-mins"
  },
  sitting: {
    id: "sitting",
    name: "Dog Sitting (Variable)",
    description: "Customized visits with time-based pricing.",
    duration: null,
    price: null,
    priceDisplay: "From £25"
  }
};


// ← ADD THESE EXPORTS:
export const getServicePrice = (serviceId: string): number | null => {
  const service = SERVICE_PRICING[serviceId];
  if (!service) return null;
  return service.price ?? null;
};

export const requiresManualPricing = (serviceId: string): boolean => {
  return SERVICE_PRICING[serviceId]?.price === null;
};

// Add this export to your existing pricing.ts file:
export const formatPrice = (price: number | null): string => {
  if (price === null) return "POA";
  if (price === 0) return "FREE";
  return `£${price.toFixed(2)}`;
};

// NEW: Solo walk duration-based pricing exports
export const getSoloWalkPrice = (duration: number, dogCount: number): number => {
  const soloPricing = SERVICE_PRICING.solo.durations?.find(d => d.duration === duration);
  if (!soloPricing) return 0;
  
  return dogCount === 2 ? soloPricing.pricing.twoDogs : soloPricing.pricing.oneDog;
};

export const getSoloWalkOptions = () => {
  return SERVICE_PRICING.solo.durations || [];
};

export const formatSoloWalkPrice = (duration: number, dogCount: number): string => {
  const price = getSoloWalkPrice(duration, dogCount);
  return `£${price.toFixed(2)}`;
};

// Helper to check if a service uses duration-based pricing
export const hasDurationPricing = (serviceId: string): boolean => {
  return SERVICE_PRICING[serviceId]?.durations !== undefined;
};

// Get display text for duration
export const getDurationDisplay = (duration: number): string => {
  if (duration === 60) return "1 Hour";
  if (duration === 120) return "2 Hours";
  return `${duration} minutes`;
};

// Loyalty reward tier: snap an average price to the closest service price tier
const REWARD_TIERS = [10, 17.50, 25, 32.50];

export const getRewardTier = (avgPrice: number): number => {
  let closest = REWARD_TIERS[0];
  let minDist = Math.abs(avgPrice - closest);
  for (const tier of REWARD_TIERS) {
    const dist = Math.abs(avgPrice - tier);
    if (dist < minDist) {
      minDist = dist;
      closest = tier;
    }
  }
  return closest;
};