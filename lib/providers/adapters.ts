import { calculateSurgeMultiplier, type SurgeComputationInput } from './surge-calculator';

export interface ProviderQuote {
  provider: string;
  fare: number; // Single fare value (typically minFare or average)
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

type QuoteContext = Pick<SurgeComputationInput, 'originLabel' | 'hour' | 'dayOfWeek'>;

function resolveSurge(
  provider: SurgeComputationInput['provider'],
  context?: QuoteContext
): { surgeMultiplier: number; isSurge: boolean } {
  const { isSurge, surgeMultiplier } = calculateSurgeMultiplier({
    provider,
    originLabel: context?.originLabel,
    hour: context?.hour,
    dayOfWeek: context?.dayOfWeek,
  });
  return {
    isSurge,
    surgeMultiplier,
  };
}

// 1. GrabPH Adapter (4-wheel)
export function getGrabPHQuote(
  distanceKm: number,
  durationMinutes: number,
  originLabel?: string,
  context?: QuoteContext
): ProviderQuote {
  // Real PH fare matrix: base=45, perKm=15, perMinute=2
  const base = 45;
  const perKm = 15;
  const perMinute = 2;
  
  const preSurge = base + (perKm * distanceKm) + (perMinute * durationMinutes);
  const surge = resolveSurge('GrabPH', { originLabel, ...context });
  
  const minFare = Math.floor(preSurge * surge.surgeMultiplier);
  const maxFare = Math.ceil(minFare * 1.1);
  
  return {
    provider: 'GrabPH',
    fare: minFare, // Use minFare as the fare value
    minFare,
    maxFare,
    eta: Math.ceil(durationMinutes), // Use real duration from ORS
    surgeMultiplier: parseFloat(surge.surgeMultiplier.toFixed(2)),
    isSurge: surge.isSurge,
    category: '4-wheel'
  };
}
export const getGrabPhQuote = getGrabPHQuote;

// 2. Angkas Adapter (2-wheel)
// TWG matrix: First 2km = 50, 2-7km = +10/km, Beyond 7km = +15/km
export function getAngkasQuote(
  distanceKm: number,
  durationMinutes: number,
  originLabel?: string,
  context?: QuoteContext
): ProviderQuote {
  let rawFare = 50; // First 2km
  
  if (distanceKm > 7) {
    // Beyond 7km: +15/km
    rawFare += (distanceKm - 7) * 15;
    rawFare += (7 - 2) * 10; // 2-7km: +10/km
  } else if (distanceKm > 2) {
    // 2-7km: +10/km
    rawFare += (distanceKm - 2) * 10;
  }
  
  const surge = resolveSurge('Angkas', { originLabel, ...context });
  rawFare *= surge.surgeMultiplier;
  
  const minFare = Math.floor(rawFare);
  const maxFare = Math.ceil(rawFare * 1.05); // tighter spread
  
  return {
    provider: 'Angkas',
    fare: minFare, // Use minFare as the fare value
    minFare,
    maxFare,
    eta: Math.ceil(durationMinutes * 0.7), // MC is faster, ~70% of car time
    surgeMultiplier: parseFloat(surge.surgeMultiplier.toFixed(2)),
    isSurge: surge.isSurge,
    category: '2-wheel'
  };
}

// 3. JoyRideMC Adapter (2-wheel)
// TWG matrix: First 2km = 50, 2-7km = +10/km, Beyond 7km = +15/km
export function getJoyRideQuote(
  distanceKm: number,
  durationMinutes: number,
  originLabel?: string,
  context?: QuoteContext
): ProviderQuote {
  let rawFare = 50; // First 2km
  
  if (distanceKm > 7) {
    // Beyond 7km: +15/km
    rawFare += (distanceKm - 7) * 15;
    rawFare += (7 - 2) * 10; // 2-7km: +10/km
  } else if (distanceKm > 2) {
    // 2-7km: +10/km
    rawFare += (distanceKm - 2) * 10;
  }
  
  const surge = resolveSurge('JoyRideMC', { originLabel, ...context });
  rawFare *= surge.surgeMultiplier;
  
  const minFare = Math.floor(rawFare);
  const maxFare = Math.ceil(rawFare * 1.05);
  
  return {
    provider: 'JoyRideMC',
    fare: minFare, // Use minFare as the fare value
    minFare,
    maxFare,
    eta: Math.ceil(durationMinutes * 0.75), // MC is faster, ~75% of car time
    surgeMultiplier: parseFloat(surge.surgeMultiplier.toFixed(2)),
    isSurge: surge.isSurge,
    category: '2-wheel'
  };
}
export const getJoyRideMcQuote = getJoyRideQuote;

export async function getAllQuotes(
  distanceKm: number,
  durationMinutes: number,
  originLabel?: string,
  context?: QuoteContext
): Promise<{ quotes: ProviderQuote[], distanceKm: number }> {
  // Simulate API latency
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const quotes = [
    getGrabPHQuote(distanceKm, durationMinutes, originLabel, context),
    getAngkasQuote(distanceKm, durationMinutes, originLabel, context),
    getJoyRideQuote(distanceKm, durationMinutes, originLabel, context)
  ];
  
  // Sort by price ascending
  quotes.sort((a, b) => a.minFare - b.minFare);
  
  return { quotes, distanceKm };
}
export const getQuotesForTrip = getAllQuotes;
