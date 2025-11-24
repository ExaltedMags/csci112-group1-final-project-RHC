import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserHistoryEntry {
  tripId: mongoose.Types.ObjectId;
  originName: string;
  destinationName: string;
  requestedAt: Date;
}

export interface IUser extends Document {
  name?: string;
  email: string;
  history: IUserHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const UserHistorySchema = new Schema<IUserHistoryEntry>({
  tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
  originName: { type: String, required: true },
  destinationName: { type: String, required: true },
  requestedAt: { type: Date, required: true }
}, { _id: false });

const UserSchema = new Schema<IUser>({
  name: { type: String },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  history: [UserHistorySchema]
}, { timestamps: true });

// Prevent model recompilation error in Next.js
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
