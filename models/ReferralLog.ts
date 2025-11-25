import type { ObjectId } from 'mongodb';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface IReferralLog {
  _id?: ObjectId;
  userId: string;
  tripId: ObjectId;
  providerCode: string;
  providerName: string;
  bookedMinFare: number;
  bookedMaxFare: number;
  deviceType: DeviceType;
  createdAt: Date;
  updatedAt: Date;
}

