export interface ServicePricing {
  id: string;
  name: string;
  description: string;  // ← ADD THIS
  duration: number | null;
  price: number | null;
  priceDisplay: string;
}

export const SERVICE_PRICING: Record<string, ServicePricing> = {
  meetgreet: {
    id: "meetgreet",
    name: "Meet & Greet - for new clients",
    description: "Free 30-minute introduction session for new clients. Get to know each other and discuss your dog's specific needs.",
    duration: 30,
    price: 0,
    priceDisplay: "FREE / 30-mins"
  },
  solo: {
    id: "solo", 
    name: "Solo Walk (60 min)",
    description: "One-on-one attention for your best friend. Perfect for dogs who prefer their own space.",
    duration: 60,
    price: 17.50,
    priceDisplay: "£17.50 / hour"
  },
  quick: {
    id: "quick",
    name: "Quick Walk (30 min)",
    description: "A fun, quick play in the park, to break up the day.",
    duration: 30,
    price: 10.00,
    priceDisplay: "£10 / 30-mins"
  },
  sitting: {
    id: "sitting",
    name: "Dog Sitting (Variable)",
    description: "Customized visits during the day or the evening, when your dog does not want to be on its own.",
    duration: null,
    price: null,
    priceDisplay: "POA / visit"
  }
};

// ← ADD THESE EXPORTS:
export const getServicePrice = (serviceId: string): number | null => {
  return SERVICE_PRICING[serviceId]?.price || null;
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