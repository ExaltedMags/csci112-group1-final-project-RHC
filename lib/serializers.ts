import { TripDbDoc, ITrip } from '@/models/Trip';

function stringifyDate(value?: Date): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : String(value);
}

export function serializeTrip(doc: TripDbDoc): ITrip {
  if (!doc._id) {
    throw new Error('serializeTrip called without _id');
  }

  return {
    ...doc,
    _id: doc._id.toString(),
    createdAt: stringifyDate(doc.createdAt) ?? new Date().toISOString(),
    updatedAt: stringifyDate(doc.updatedAt),
  };
}

export function serializeTrips(docs: TripDbDoc[]): ITrip[] {
  return docs.map(serializeTrip);
}

