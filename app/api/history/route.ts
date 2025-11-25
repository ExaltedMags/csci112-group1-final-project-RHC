import { NextResponse } from 'next/server';

import { getTripsCollection } from '@/lib/mongodb';
import { serializeTrips } from '@/lib/serializers';

export async function GET(req: Request) {
  try {
    const tripsCollection = await getTripsCollection();

    // Get userId from query params
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get('userId');

    // Dev fallback: allow demo user in development
    const isDev = process.env.NODE_ENV !== 'production';
    const allowDemo = process.env.ALLOW_DEMO_USER === 'true';
    if (!userId && isDev && allowDemo) {
      userId = 'demo-user-123';
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }

    // 1. Fetch recent history
    const historyDocs = await tripsCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    // 2. Aggregate analytics (simple example)
    // Matches revised proposal query #7B (Top Routes using BOOKED trips)
    // NOTE: In this prototype, BOOKED trips stand in for COMPLETED because we do not have real provider callbacks.
    // Count booked trips by provider
    const aggregation = await tripsCollection.aggregate([
      { $match: { status: 'BOOKED', userId } },
      {
        $group: {
          _id: "$selectedQuote.provider",
          count: { $sum: 1 },
          avgFare: { $avg: "$selectedQuote.minFare" }
        }
      }
    ]).toArray();

    return NextResponse.json({ history: serializeTrips(historyDocs), analytics: aggregation });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

