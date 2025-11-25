import { config } from 'dotenv';
import { resolve } from 'path';
import { MongoClient, ObjectId } from 'mongodb';

import { getAngkasQuote, getGrabPHQuote, getJoyRideQuote, PROVIDER_LABELS } from '../lib/providers/adapters';
import type { ProviderQuote } from '../lib/providers/adapters';
import type { TripDbDoc } from '../models/Trip';
import type { IReferralLog, DeviceType } from '../models/ReferralLog';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

type RouteTemplate = {
  origin: string;
  destination: string;
  originLocation: { lat: number; lng: number; label: string };
  destinationLocation: { lat: number; lng: number; label: string };
  distanceKm: number;
  durationMinutes: number;
};

const ROUTE_TEMPLATES: RouteTemplate[] = [
  {
    origin: 'Ateneo de Manila University',
    destination: 'Bonifacio Global City',
    originLocation: { lat: 14.6394, lng: 121.0785, label: 'Ateneo de Manila University' },
    destinationLocation: { lat: 14.5491, lng: 121.0453, label: 'Bonifacio Global City' },
    distanceKm: 13,
    durationMinutes: 35,
  },
  {
    origin: 'Makati Central Business District',
    destination: 'Ortigas Center',
    originLocation: { lat: 14.5547, lng: 121.0244, label: 'Makati CBD' },
    destinationLocation: { lat: 14.5869, lng: 121.0606, label: 'Ortigas Center' },
    distanceKm: 8.5,
    durationMinutes: 30,
  },
  {
    origin: 'SM Mall of Asia, Pasay',
    destination: 'Bonifacio Global City',
    originLocation: { lat: 14.5353, lng: 120.9822, label: 'Mall of Asia' },
    destinationLocation: { lat: 14.5491, lng: 121.0453, label: 'Bonifacio Global City' },
    distanceKm: 7.5,
    durationMinutes: 25,
  },
  {
    origin: 'NAIA Terminal 3',
    destination: 'Makati Central Business District',
    originLocation: { lat: 14.5188, lng: 121.0181, label: 'NAIA Terminal 3' },
    destinationLocation: { lat: 14.5547, lng: 121.0244, label: 'Makati CBD' },
    distanceKm: 6.8,
    durationMinutes: 28,
  },
  {
    origin: 'Fairview, Quezon City',
    destination: 'Ayala Center, Makati',
    originLocation: { lat: 14.736, lng: 121.045, label: 'Fairview, QC' },
    destinationLocation: { lat: 14.5512, lng: 121.0263, label: 'Ayala Center' },
    distanceKm: 22,
    durationMinutes: 55,
  },
];

type TimeBucket = 'RUSH' | 'LATE' | 'OFF';

const TIME_BUCKET_WEIGHTS: { value: TimeBucket; weight: number }[] = [
  { value: 'RUSH', weight: 4.5 },
  { value: 'OFF', weight: 4.5 },
  { value: 'LATE', weight: 1 },
];

const TIME_BUCKET_HOURS: Record<TimeBucket, number[]> = {
  RUSH: [6, 7, 7, 8, 8, 9, 17, 17, 18, 18, 19],
  OFF: [10, 11, 12, 13, 14, 15, 16, 20, 21],
  LATE: [22, 23, 0, 1, 2, 3, 4],
};

const DEVICE_TYPE_WEIGHTS: { value: DeviceType; weight: number }[] = [
  { value: 'mobile', weight: 7.25 },
  { value: 'desktop', weight: 2.25 },
  { value: 'tablet', weight: 0.5 },
];

const REFERRAL_CONVERSION_MIN = 0.6;
const REFERRAL_CONVERSION_MAX = 0.75;

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function weightedPick<T>(items: { value: T; weight: number }[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
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
  const quotes = [
    getGrabPHQuote(distanceKm, durationMinutes, originLabel, { hour, dayOfWeek }),
    getAngkasQuote(distanceKm, durationMinutes, originLabel, { hour, dayOfWeek }),
    getJoyRideQuote(distanceKm, durationMinutes, originLabel, { hour, dayOfWeek }),
  ];
  quotes.sort((a, b) => a.minFare - b.minFare);
  return quotes;
}

function chooseSelectedQuote(quotes: ProviderQuote[]): ProviderQuote {
  const roll = Math.random();
  if (roll < 0.65) {
    // 65% pick cheapest
    return quotes[0];
  } else if (roll < 0.88) {
    // 23% pick fastest
    return quotes.reduce((best, quote) => (quote.eta < best.eta ? quote : best), quotes[0]);
  } else {
    // 12% pick random
    return pickRandom(quotes);
  }
}

function toTripDoc(template: RouteTemplate, userId: string): TripDbDoc {
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
    userId,
    createdAt: tripDate,
    updatedAt: tripDate,
    originLocation: template.originLocation,
    destinationLocation: template.destinationLocation,
  };
}

function pickDeviceType(): DeviceType {
  return weightedPick(DEVICE_TYPE_WEIGHTS);
}

function getProviderName(providerCode: string): string {
  return PROVIDER_LABELS[providerCode] || providerCode;
}

function shouldCreateReferral(): boolean {
  const conversionRate = REFERRAL_CONVERSION_MIN + Math.random() * (REFERRAL_CONVERSION_MAX - REFERRAL_CONVERSION_MIN);
  return Math.random() < conversionRate;
}

function createReferralLog(
  trip: TripDbDoc & { _id: ObjectId },
  tripCreatedAt: Date
): IReferralLog {
  if (!trip.selectedQuote) {
    throw new Error('[seed-user-trips] Trip must have selectedQuote to create referral log');
  }

  const providerCode = trip.selectedQuote.provider;
  const providerName = getProviderName(providerCode);
  const deviceType = pickDeviceType();
  
  const referralTimestamp = new Date(tripCreatedAt);
  const minutesAfter = Math.floor(Math.random() * 5) + 1;
  referralTimestamp.setMinutes(referralTimestamp.getMinutes() + minutesAfter);

  return {
    userId: trip.userId,
    tripId: trip._id,
    providerCode,
    providerName,
    bookedMinFare: trip.selectedQuote.minFare,
    bookedMaxFare: trip.selectedQuote.maxFare,
    deviceType,
    createdAt: referralTimestamp,
    updatedAt: referralTimestamp,
  };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;

  if (!uri) {
    throw new Error('[seed-user-trips] Missing MONGODB_URI');
  }
  if (!dbName) {
    throw new Error('[seed-user-trips] Missing MONGODB_DB');
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const usersCollection = db.collection('users');
  const tripsCollection = db.collection<TripDbDoc>('trips');
  const referralLogsCollection = db.collection<IReferralLog>('referral_logs');

  try {
    // Find Test Osterone user
    const user = await usersCollection.findOne({
      $or: [
        { name: { $regex: 'Test Osterone', $options: 'i' } },
        { email: { $regex: 'osterone', $options: 'i' } },
      ],
    });

    if (!user) {
      throw new Error('[seed-user-trips] User "Test Osterone" not found');
    }

    const userId = user._id instanceof ObjectId ? user._id.toString() : String(user._id);
    console.log(`[seed-user-trips] Found user: ${user.name} (${user.email}) - userId: ${userId}`);

    // Generate ~25 trips
    const numTrips = 25;
    const trips: TripDbDoc[] = [];

    console.log(`[seed-user-trips] Generating ${numTrips} trips...`);
    for (let i = 0; i < numTrips; i++) {
      const template = pickRandom(ROUTE_TEMPLATES);
      trips.push(toTripDoc(template, userId));
      if ((i + 1) % 5 === 0) {
        console.log(`[seed-user-trips] Prepared ${i + 1}/${numTrips} trips...`);
      }
    }

    console.log(`[seed-user-trips] Inserting ${trips.length} trips...`);
    const result = await tripsCollection.insertMany(trips);
    console.log(`[seed-user-trips] Seeded ${result.insertedCount} trips successfully.`);

    // Generate referral logs
    console.log(`[seed-user-trips] Seeding referral logs...`);
    const referralLogs: IReferralLog[] = [];
    
    const insertedTripIds = Object.values(result.insertedIds);
    const insertedTrips = await tripsCollection
      .find({ _id: { $in: insertedTripIds } })
      .toArray();

    let referralCount = 0;
    for (const trip of insertedTrips) {
      if (shouldCreateReferral() && trip.selectedQuote) {
        try {
          const referralLog = createReferralLog(trip as TripDbDoc & { _id: ObjectId }, trip.createdAt);
          referralLogs.push(referralLog);
          referralCount += 1;
          
          if (referralCount % 5 === 0) {
            console.log(`[seed-user-trips] Created ${referralCount}/${insertedTrips.length} referral logs...`);
          }
        } catch (error) {
          console.warn(`[seed-user-trips] Skipping referral log for trip ${trip._id}:`, error);
        }
      }
    }

    if (referralLogs.length > 0) {
      const referralResult = await referralLogsCollection.insertMany(referralLogs);
      const conversionRate = ((referralLogs.length / insertedTrips.length) * 100).toFixed(1);
      console.log(
        `[seed-user-trips] Successfully created ${referralResult.insertedCount} referral logs (${conversionRate}% conversion rate)`
      );
    } else {
      console.log(`[seed-user-trips] No referral logs created (0% conversion rate)`);
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('[seed-user-trips] Failed to seed trips', error);
  process.exit(1);
});

