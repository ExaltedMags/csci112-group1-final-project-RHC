export interface ProviderQuote {
  provider: string;
  minFare: number;
  maxFare: number;
  eta: number; // minutes
  surgeMultiplier: number;
  isSurge: boolean;
  category: '4-wheel' | '2-wheel';
  // Optional fields for future alignment
  providerCode?: string;
  providerName?: string;
}

export const PROVIDER_LABELS: Record<string, string> = {
  GrabPH: "Grab (4-wheel)",
  Angkas: "Angkas (MC Taxi)",
  JoyRideMC: "JoyRide (MC Taxi)",
};

// Simulated distance calculator (since we don't have Google Maps API)
// Returns distance in KM (randomized for demo variance based on string length)
export function estimateDistance(origin: string, destination: string): number {
  const baseDist = (origin.length + destination.length) / 5; 
  // Add some randomness: +/- 30%
  const variance = 0.7 + Math.random() * 0.6;
  return Math.max(1.5, parseFloat((baseDist * variance).toFixed(1)));
}

// 1. GrabPH Adapter (4-wheel)
export function getGrabPHQuote(distanceKm: number): ProviderQuote {
  // Base: 45 PHP, Per KM: 15 PHP
  // Surge: Randomly triggered (30% chance)
  const isSurge = Math.random() > 0.7;
  const surgeMultiplier = isSurge ? (1.2 + Math.random() * 0.8) : 1.0;
  
  const baseFare = 45;
  const perKm = 15;
  const rawFare = (baseFare + (perKm * distanceKm)) * surgeMultiplier;
  
  // Range +/- 10%
  const minFare = Math.floor(rawFare * 0.9);
  const maxFare = Math.ceil(rawFare * 1.1);
  
  return {
    provider: 'GrabPH',
    minFare,
    maxFare,
    eta: Math.ceil(5 + (distanceKm * 2) + (Math.random() * 5)), // simulated ETA
    surgeMultiplier: parseFloat(surgeMultiplier.toFixed(1)),
    isSurge,
    category: '4-wheel'
  };
}
export const getGrabPhQuote = getGrabPHQuote;

// 2. Angkas Adapter (2-wheel)
export function getAngkasQuote(distanceKm: number): ProviderQuote {
  // Base: 50 PHP (first 2km), Per KM: 10 PHP (after)
  // Surge: Lower chance
  const isSurge = Math.random() > 0.8;
  const surgeMultiplier = isSurge ? (1.1 + Math.random() * 0.4) : 1.0;
  
  let rawFare = 50;
  if (distanceKm > 2) {
    rawFare += (distanceKm - 2) * 10;
  }
  rawFare *= surgeMultiplier;
  
  return {
    provider: 'Angkas',
    minFare: Math.floor(rawFare),
    maxFare: Math.ceil(rawFare * 1.05), // tighter spread
    eta: Math.ceil(3 + (distanceKm * 1.5) + (Math.random() * 3)), // faster than car
    surgeMultiplier: parseFloat(surgeMultiplier.toFixed(1)),
    isSurge,
    category: '2-wheel'
  };
}

// 3. JoyRideMC Adapter (2-wheel)
export function getJoyRideQuote(distanceKm: number): ProviderQuote {
  // Competitive pricing
  // Base: 45 PHP (first 2km), Per KM: 10 PHP
  const isSurge = Math.random() > 0.85;
  const surgeMultiplier = isSurge ? (1.1 + Math.random() * 0.3) : 1.0;
  
  let rawFare = 45;
  if (distanceKm > 2) {
    rawFare += (distanceKm - 2) * 10;
  }
  rawFare *= surgeMultiplier;
  
  return {
    provider: 'JoyRideMC',
    minFare: Math.floor(rawFare),
    maxFare: Math.ceil(rawFare * 1.05),
    eta: Math.ceil(4 + (distanceKm * 1.6) + (Math.random() * 3)),
    surgeMultiplier: parseFloat(surgeMultiplier.toFixed(1)),
    isSurge,
    category: '2-wheel'
  };
}
export const getJoyRideMcQuote = getJoyRideQuote;

export async function getAllQuotes(origin: string, destination: string): Promise<{ quotes: ProviderQuote[], distanceKm: number }> {
  // Simulate API latency
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const distanceKm = estimateDistance(origin, destination);
  
  const quotes = [
    getGrabPHQuote(distanceKm),
    getAngkasQuote(distanceKm),
    getJoyRideQuote(distanceKm)
  ];
  
  // Sort by price ascending
  quotes.sort((a, b) => a.minFare - b.minFare);
  
  return { quotes, distanceKm };
}
export const getQuotesForTrip = getAllQuotes;
