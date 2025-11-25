import type { ObjectId } from 'mongodb';

export type TripStatus = 'SEARCHED' | 'BOOKED' | 'COMPLETED';
export type RouteSource = 'ORS' | 'MAPBOX';
export type VehicleCategory = '4-wheel' | '2-wheel';

export interface IQuote {
  provider: string;
  /**
   * Optional cached fare average. Most UI flows rely on min/max fares.
   */
  fare?: number;
  minFare: number;
  maxFare: number;
  eta: number;
  surgeMultiplier: number;
  isSurge: boolean;
  category: VehicleCategory;
}

export interface TripCoordinate {
  lat: number;
  lng: number;
}

export interface TripLocation extends TripCoordinate {
  label: string;
}

export interface TripRouteGeometry {
  coordinates: TripCoordinate[];
}

export interface TripCore {
  origin: string;
  destination: string;
  distanceKm: number;
  durationMinutes: number;
  originLocation?: TripLocation;
  destinationLocation?: TripLocation;
  routeGeometry?: TripRouteGeometry;
  routeSource?: RouteSource;
  status: TripStatus;
  quotes: IQuote[];
  selectedQuote?: IQuote;
  userId: string;
}

/**
 * Document shape stored in MongoDB. `_id` is optional pre-insert so we can
 * share the type with `insertOne`.
 */
export interface TripDbDoc extends TripCore {
  _id?: ObjectId;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Serialized shape passed to client code.
 */
export type TripDTO = TripCore & {
  _id: string;
  createdAt: string;
  updatedAt?: string;
};

/**
 * Alias retained for historical imports. Represents client-facing trips.
 */
export type ITrip = TripDTO;

