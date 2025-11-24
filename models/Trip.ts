import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IQuote {
  provider: string;
  fare: number; // Store as single number for simplicity in selection, or min/max
  minFare: number;
  maxFare: number;
  eta: number; // minutes
  surgeMultiplier: number;
  isSurge: boolean;
  category: '4-wheel' | '2-wheel';
}

export interface ITrip extends Document {
  origin: string;
  destination: string;
  distanceKm: number;
  durationMinutes: number;
  originLocation?: {
    label: string;
    lat: number;
    lng: number;
  };
  destinationLocation?: {
    label: string;
    lat: number;
    lng: number;
  };
  routeGeometry?: {
    coordinates: {
      lat: number;
      lng: number;
    }[];
  };
  routeSource?: 'ORS' | 'MAPBOX';
  status: 'SEARCHED' | 'BOOKED' | 'COMPLETED';
  quotes: IQuote[];
  selectedQuote?: IQuote;
  userId: string; // Demo user ID
  createdAt: Date;
}

const QuoteSchema = new Schema<IQuote>({
  provider: { type: String, required: true },
  minFare: { type: Number, required: true },
  maxFare: { type: Number, required: true },
  eta: { type: Number, required: true },
  surgeMultiplier: { type: Number, default: 1.0 },
  isSurge: { type: Boolean, default: false },
  category: { type: String, enum: ['4-wheel', '2-wheel'], required: true }
}, { _id: false });

const CoordinateSchema = new Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true }
}, { _id: false });

const TripSchema = new Schema<ITrip>({
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  distanceKm: { type: Number, required: true },
  durationMinutes: { type: Number, required: true },
  originLocation: {
    label: { type: String },
    lat: { type: Number },
    lng: { type: Number }
  },
  destinationLocation: {
    label: { type: String },
    lat: { type: Number },
    lng: { type: Number }
  },
  routeGeometry: {
    coordinates: { type: [CoordinateSchema], default: undefined }
  },
  routeSource: { type: String, enum: ['ORS', 'MAPBOX'], default: undefined },
  status: { type: String, enum: ['SEARCHED', 'BOOKED', 'COMPLETED'], default: 'SEARCHED' },
  quotes: [QuoteSchema],
  selectedQuote: QuoteSchema,
  userId: { type: String, default: 'demo-user-123' },
  createdAt: { type: Date, default: Date.now }
});

// Prevent model recompilation error in Next.js
export const Trip: Model<ITrip> = mongoose.models.Trip || mongoose.model<ITrip>('Trip', TripSchema);

