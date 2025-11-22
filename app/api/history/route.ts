import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Trip } from '@/models/Trip';

export async function GET() {
  try {
    await connectToDatabase();

    // 1. Fetch recent history
    const history = await Trip.find({ userId: 'demo-user-123' })
      .sort({ createdAt: -1 })
      .limit(20);

    // 2. Aggregate analytics (simple example)
    // Count booked trips by provider
    const aggregation = await Trip.aggregate([
      { $match: { status: 'BOOKED', userId: 'demo-user-123' } },
      {
        $group: {
          _id: "$selectedQuote.provider",
          count: { $sum: 1 },
          avgFare: { $avg: "$selectedQuote.minFare" }
        }
      }
    ]);

    return NextResponse.json({ history, analytics: aggregation });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

