import 'server-only';

import { Db, MongoClient, Collection } from 'mongodb';

import { TripDbDoc } from '@/models/Trip';
import { IUser } from '@/models/User';
import { IReferralLog } from '@/models/ReferralLog';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!uri) {
  throw new Error('[mongodb] Missing MONGODB_URI environment variable');
}

if (!dbName) {
  throw new Error('[mongodb] Missing MONGODB_DB environment variable');
}

const resolvedUri: string = uri;
const resolvedDbName: string = dbName;

type MongoCache = {
  client: MongoClient | null;
  db: Db | null;
  promise: Promise<MongoClient> | null;
};

declare global {
  var _mongoCache: MongoCache | undefined;
}

const cache: MongoCache = globalThis._mongoCache ?? {
  client: null,
  db: null,
  promise: null,
};

if (!globalThis._mongoCache) {
  globalThis._mongoCache = cache;
}

async function getClient(): Promise<MongoClient> {
  if (cache.client) {
    return cache.client;
  }

  if (!cache.promise) {
    cache.promise = MongoClient.connect(resolvedUri);
  }

  cache.client = await cache.promise;
  return cache.client;
}

export async function getDb(): Promise<Db> {
  if (cache.db) {
    return cache.db;
  }

  const client = await getClient();
  cache.db = client.db(resolvedDbName);
  return cache.db;
}

const COLLECTIONS = {
  trips: 'trips',
  users: 'users',
  referralLogs: 'referral_logs', // Matches revised proposal naming for referral logs analytics
} as const;

export async function getTripsCollection(): Promise<Collection<TripDbDoc>> {
  const db = await getDb();
  return db.collection<TripDbDoc>(COLLECTIONS.trips);
}

export async function getUsersCollection(): Promise<Collection<IUser>> {
  const db = await getDb();
  return db.collection<IUser>(COLLECTIONS.users);
}

export async function getReferralLogsCollection(): Promise<Collection<IReferralLog>> {
  const db = await getDb();
  return db.collection<IReferralLog>(COLLECTIONS.referralLogs);
}

