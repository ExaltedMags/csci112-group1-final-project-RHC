import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserHistoryEntry {
  tripId: mongoose.Types.ObjectId;
  originLabel: string;
  destinationLabel: string;
  chosenProviderCode: string;
  chosenProviderName: string;
  createdAt: Date;
}

export interface IUser extends Omit<Document, '_id'> {
  _id: string; // we will use the same string as Trip.userId, e.g. "demo-user-123"
  name?: string;
  email?: string;
  history: IUserHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const UserHistorySchema = new Schema<IUserHistoryEntry>({
  tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
  originLabel: { type: String, required: true },
  destinationLabel: { type: String, required: true },
  chosenProviderCode: { type: String, required: true },
  chosenProviderName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const UserSchema = new Schema<IUser>({
  _id: { type: String, required: true },
  name: { type: String },
  email: { type: String },
  history: [UserHistorySchema]
}, { timestamps: true });

// Prevent model recompilation error in Next.js
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

