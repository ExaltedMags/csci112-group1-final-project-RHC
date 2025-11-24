import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReferralLog extends Document {
  userId: string;
  tripId: mongoose.Types.ObjectId;
  providerCode: string;
  providerName: string;
  bookedMinFare: number;
  bookedMaxFare: number;
  deviceType: string; // 'mobile', 'tablet', or 'desktop'
  createdAt: Date;
  updatedAt: Date;
}

const ReferralLogSchema = new Schema<IReferralLog>({
  userId: { type: String, required: true },
  tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
  providerCode: { type: String, required: true },
  providerName: { type: String, required: true },
  bookedMinFare: { type: Number, required: true },
  bookedMaxFare: { type: Number, required: true },
  deviceType: { type: String, required: true, enum: ['mobile', 'tablet', 'desktop'] }
}, { timestamps: true }); // timestamps: true adds createdAt and updatedAt

// Prevent model recompilation error in Next.js
export const ReferralLog: Model<IReferralLog> = mongoose.models.ReferralLog || mongoose.model<IReferralLog>('ReferralLog', ReferralLogSchema);

