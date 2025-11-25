import { config } from 'dotenv';
import { resolve } from 'path';
import { MongoClient } from 'mongodb';

import { getAngkasQuote, getGrabPHQuote, getJoyRideQuote } from '../lib/providers/adapters';
import type { ProviderQuote } from '../lib/providers/adapters';
import type { TripDbDoc } from '../models/Trip';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

type ProviderQuoteBuilder = typeof getGrabPHQuote;

type RouteTemplate = {
  origin: string;
  destination: string;
  originLocation: { lat: number; lng: number; label: string };
  destinationLocation: { lat: number; lng: number; label: string };
  distanceKm: number;
  durationMinutes: number;
  targetCount: number;
};

const ROUTE_TEMPLATES: RouteTemplate[] = [
  {
    origin: 'Ateneo de Manila University',
    destination: 'Bonifacio Global City',
    originLocation: { lat: 14.6394, lng: 121.0785, label: 'Ateneo de Manila University' },
    destinationLocation: { lat: 14.5491, lng: 121.0453, label: 'Bonifacio Global City' },
    distanceKm: 13,
    durationMinutes: 35,
    targetCount: 15,
  },
  {
    origin: 'Makati Central Business District',
    destination: 'Ortigas Center',
    originLocation: { lat: 14.5547, lng: 121.0244, label: 'Makati CBD' },
    destinationLocation: { lat: 14.5869, lng: 121.0606, label: 'Ortigas Center' },
    distanceKm: 8.5,
    durationMinutes: 30,
    targetCount: 12,
  },
  {
    origin: 'SM Mall of Asia, Pasay',
    destination: 'Bonifacio Global City',
    originLocation: { lat: 14.5353, lng: 120.9822, label: 'Mall of Asia' },
    destinationLocation: { lat: 14.5491, lng: 121.0453, label: 'Bonifacio Global City' },
    distanceKm: 7.5,
    durationMinutes: 25,
    targetCount: 10,
  },
  {
    origin: 'NAIA Terminal 3',
    destination: 'Makati Central Business District',
    originLocation: { lat: 14.5188, lng: 121.0181, label: 'NAIA Terminal 3' },
    destinationLocation: { lat: 14.5547, lng: 121.0244, label: 'Makati CBD' },
    distanceKm: 6.8,
    durationMinutes: 28,
    targetCount: 10,
  },
  {
    origin: 'Fairview, Quezon City',
    destination: 'Ayala Center, Makati',
    originLocation: { lat: 14.736, lng: 121.045, label: 'Fairview, QC' },
    destinationLocation: { lat: 14.5512, lng: 121.0263, label: 'Ayala Center' },
    distanceKm: 22,
    durationMinutes: 55,
    targetCount: 8,
  },
  {
    origin: 'Bonifacio Global City',
    destination: 'Alabang Town Center',
    originLocation: { lat: 14.5491, lng: 121.0453, label: 'Bonifacio Global City' },
    destinationLocation: { lat: 14.4213, lng: 121.0276, label: 'Alabang Town Center' },
    distanceKm: 20,
    durationMinutes: 50,
    targetCount: 8,
  },
  {
    origin: 'UP Diliman',
    destination: 'Bonifacio Global City',
    originLocation: { lat: 14.6549, lng: 121.0647, label: 'UP Diliman' },
    destinationLocation: { lat: 14.5491, lng: 121.0453, label: 'Bonifacio Global City' },
    distanceKm: 12,
    durationMinutes: 33,
    targetCount: 7,
  },
  {
    origin: 'Mandaluyong City Hall',
    destination: 'Pasig City Hall',
    originLocation: { lat: 14.5836, lng: 121.0409, label: 'Mandaluyong' },
    destinationLocation: { lat: 14.5547, lng: 121.0645, label: 'Pasig' },
    distanceKm: 6,
    durationMinutes: 20,
    targetCount: 6,
  },
];

type TimeBucket = 'RUSH' | 'LATE' | 'OFF';

type ProviderDefinition = {
  provider: string;
  builder: ProviderQuoteBuilder;
  availability: number;
  loyaltyWeight: number;
};

type Persona = 'CHEAPEST' | 'FASTEST' | 'LOYAL';

const PROVIDER_DEFINITIONS: ProviderDefinition[] = [
  {
    provider: 'GrabPH',
    builder: getGrabPHQuote,
    availability: 0.95,
    loyaltyWeight: 0.5,
  },
  {
    provider: 'Angkas',
    builder: getAngkasQuote,
    availability: 0.7,
    loyaltyWeight: 0.3,
  },
  {
    provider: 'JoyRideMC',
    builder: getJoyRideQuote,
    availability: 0.6,
    loyaltyWeight: 0.2,
  },
];

const PERSONA_WEIGHTS: { value: Persona; weight: number }[] = [
  { value: 'CHEAPEST', weight: 0.65 },
  { value: 'FASTEST', weight: 0.23 },
  { value: 'LOYAL', weight: 0.12 },
];

const ROUTE_VARIANCE = 0.3;
const MIN_ROUTE_TRIPS = 3;
const EXTRA_TRIPS_MIN = 15;
const EXTRA_TRIPS_MAX = 20;

const TIME_BUCKET_WEIGHTS: { bucket: TimeBucket; weight: number }[] = [
  { bucket: 'RUSH', weight: 4.5 },
  { bucket: 'OFF', weight: 4.5 },
  { bucket: 'LATE', weight: 1 },
];

const TIME_BUCKET_HOURS: Record<TimeBucket, number[]> = {
  RUSH: [6, 7, 7, 8, 8, 9, 17, 17, 18, 18, 19],
  OFF: [10, 11, 12, 13, 14, 15, 16, 20, 21],
  LATE: [22, 23, 0, 1, 2, 3, 4],
};

const LOYALTY_PROVIDER_WEIGHTS = PROVIDER_DEFINITIONS.map((definition) => ({
  value: definition.provider,
  weight: definition.loyaltyWeight,
}));

const USER_IDS = ['seed-user-01', 'seed-user-02', 'seed-user-03', 'seed-user-04', 'seed-user-05', 'seed-user-06'];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function weightedPick<T>(items: { value: T; weight: number }[]): T {
  if (!items.length) {
    throw new Error('[seed-trips] weightedPick requires items');
  }
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) {
    return items[0].value;
  }
  let roll = Math.random() * totalWeight;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) {
      return item.value;
    }
  }
  return items[items.length - 1].value;
}

function randomizeAround(base: number, varianceRatio: number): number {
  const variance = 1 - varianceRatio + Math.random() * varianceRatio * 2;
  return base * variance;
}

function pickTimeBucket(): TimeBucket {
  return weightedPick(TIME_BUCKET_WEIGHTS);
}

function buildTripDate(bucket: TimeBucket): Date {
  const date = new Date();
  const daysAgo = Math.floor(Math.random() * 25) + 1;
  date.setDate(date.getDate() - daysAgo);

  const hours = TIME_BUCKET_HOURS[bucket] ?? TIME_BUCKET_HOURS.OFF;
  const hour = pickRandom(hours);
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);
  date.setHours(hour, minute, second, 0);
  return date;
}

function buildQuotes(
  distanceKm: number,
  durationMinutes: number,
  originLabel: string,
  tripDate: Date
): ProviderQuote[] {
  const hour = tripDate.getHours();
  const dayOfWeek = tripDate.getDay();
  const availableProviders = PROVIDER_DEFINITIONS.filter((provider) =>
    Math.random() < provider.availability
  );
  if (!availableProviders.length) {
    availableProviders.push(PROVIDER_DEFINITIONS[0]);
  }
  const quotes = availableProviders.map((provider) =>
    provider.builder(distanceKm, durationMinutes, originLabel, { hour, dayOfWeek })
  );
  quotes.sort((a, b) => a.minFare - b.minFare);
  return quotes;
}

function chooseSelectedQuote(quotes: ProviderQuote[]): ProviderQuote {
  if (!quotes.length) {
    throw new Error('[seed-trips] No quotes available to select from');
  }

  const persona = weightedPick(PERSONA_WEIGHTS);
  const cheapestQuote = quotes[0];
  const fastestQuote = quotes.reduce((best, quote) => (quote.eta < best.eta ? quote : best), quotes[0]);

  if (persona === 'CHEAPEST') {
    if (Math.random() < 0.15 && fastestQuote.provider !== cheapestQuote.provider) {
      return fastestQuote;
    }
    return cheapestQuote;
  }

  if (persona === 'FASTEST') {
    if (Math.random() < 0.2 && fastestQuote.provider !== cheapestQuote.provider) {
      return cheapestQuote;
    }
    return fastestQuote;
  }

  const loyalProvider = weightedPick(LOYALTY_PROVIDER_WEIGHTS);
  const loyalQuote = quotes.find((quote) => quote.provider === loyalProvider);
  if (loyalQuote) {
    if (Math.random() < 0.2 && fastestQuote.provider !== loyalQuote.provider) {
      return fastestQuote.provider === loyalQuote.provider ? cheapestQuote : fastestQuote;
    }
    if (Math.random() < 0.15 && cheapestQuote.provider !== loyalQuote.provider) {
      return cheapestQuote;
    }
    return loyalQuote;
  }

  return cheapestQuote;
}

type RouteAllocation = {
  template: RouteTemplate;
  count: number;
};

function buildRoutePlan(): RouteAllocation[] {
  const multipliers = ROUTE_TEMPLATES.map(
    () => 1 + (Math.random() * ROUTE_VARIANCE * 2 - ROUTE_VARIANCE)
  );
  const averageMultiplier =
    multipliers.reduce((sum, multiplier) => sum + multiplier, 0) / multipliers.length;

  return ROUTE_TEMPLATES.map((template, index) => {
    const normalized = multipliers[index] / averageMultiplier;
    const count = Math.max(MIN_ROUTE_TRIPS, Math.round(template.targetCount * normalized));
    return {
      template,
      count,
    };
  });
}

function toTripDoc(template: RouteTemplate): TripDbDoc {
  const bucket = pickTimeBucket();
  const tripDate = buildTripDate(bucket);

  const distanceKm = parseFloat(randomizeAround(template.distanceKm, 0.15).toFixed(1));
  const durationMinutes = Math.max(10, Math.round(randomizeAround(template.durationMinutes, 0.2)));

  const quotes = buildQuotes(distanceKm, durationMinutes, template.originLocation.label, tripDate);
  const selectedQuote = chooseSelectedQuote(quotes);

  return {
    origin: template.origin,
    destination: template.destination,
    distanceKm,
    durationMinutes,
    status: 'BOOKED',
    quotes,
    selectedQuote,
    userId: pickRandom(USER_IDS),
    createdAt: tripDate,
    updatedAt: tripDate,
    originLocation: template.originLocation,
    destinationLocation: template.destinationLocation,
  };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;

  if (!uri) {
    throw new Error('[seed-trips] Missing MONGODB_URI');
  }
  if (!dbName) {
    throw new Error('[seed-trips] Missing MONGODB_DB');
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const tripsCollection = db.collection<TripDbDoc>('trips');

  try {
    const trips: TripDbDoc[] = [];
    const routePlan = buildRoutePlan();
    const extraRandomTrips =
      EXTRA_TRIPS_MIN + Math.floor(Math.random() * (EXTRA_TRIPS_MAX - EXTRA_TRIPS_MIN + 1));
    const totalTarget =
      routePlan.reduce((sum, entry) => sum + entry.count, 0) + extraRandomTrips;

    console.log(
      `[seed-trips] Planning ${totalTarget} trips; routes=[${routePlan
        .map((entry) => `${entry.template.origin}→${entry.template.destination}:${entry.count}`)
        .join(', ')}]; bonus=${extraRandomTrips}`
    );

    let prepared = 0;

    for (const entry of routePlan) {
      for (let i = 0; i < entry.count; i += 1) {
        trips.push(toTripDoc(entry.template));
        prepared += 1;
        if (prepared % 10 === 0) {
          console.log(`[seed-trips] Prepared ${prepared}/${totalTarget} trips...`);
        }
      }
    }

    const routePool = routePlan.map((entry) => ({
      value: entry.template,
      weight: entry.count,
    }));

    for (let i = 0; i < extraRandomTrips; i += 1) {
      const template = weightedPick(routePool);
      trips.push(toTripDoc(template));
      prepared += 1;
      if (prepared % 10 === 0 || prepared === totalTarget) {
        console.log(`[seed-trips] Prepared ${prepared}/${totalTarget} trips...`);
      }
    }

    console.log(`[seed-trips] Inserting ${trips.length} trips...`);
    const result = await tripsCollection.insertMany(trips);
    console.log(`[seed-trips] Seeded ${result.insertedCount} trips successfully.`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('[seed-trips] Failed to seed trips', error);
  process.exit(1);
});

