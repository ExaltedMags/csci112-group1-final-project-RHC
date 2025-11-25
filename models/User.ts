import type { ObjectId } from 'mongodb';

export interface IUserHistoryEntry {
  tripId: ObjectId;
  originName: string;
  destinationName: string;
  requestedAt: Date;
}

export interface IUser {
  _id?: ObjectId;
  name?: string;
  email: string;
  history: IUserHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}
