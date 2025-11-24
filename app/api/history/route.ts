import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Trip } from '@/models/Trip';

export async function GET(req: Request) {
  try {
    await connectToDatabase();

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
    const history = await Trip.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);

    // 2. Aggregate analytics (simple example)
    // Count booked trips by provider
    const aggregation = await Trip.aggregate([
      { $match: { status: 'BOOKED', userId } },
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

