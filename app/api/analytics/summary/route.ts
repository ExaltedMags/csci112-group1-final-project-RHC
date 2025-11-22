import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Trip } from '@/models/Trip';
import { PROVIDER_LABELS } from '@/lib/providers/adapters';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();

    // Aggregate analytics for the demo user
    const aggregation = await Trip.aggregate([
      { $match: { status: 'BOOKED', userId: 'demo-user-123' } },
      {
        $group: {
          _id: "$selectedQuote.provider",
          count: { $sum: 1 },
          avgFare: { $avg: "$selectedQuote.minFare" },
        },
      },
      { $sort: { count: -1 } } // Sort by count descending to find favorite easily
    ]);

    const totalTrips = aggregation.reduce((acc, curr) => acc + curr.count, 0);
    
    const perProvider = aggregation.map(item => ({
      provider: PROVIDER_LABELS[item._id] || item._id,
      providerCode: item._id, // Keep the original code too
      count: item.count,
      avgFare: Math.round(item.avgFare),
    }));

    const favoriteProvider = perProvider.length > 0 ? perProvider[0].provider : null;

    return NextResponse.json({
      totalTrips,
      perProvider,
      favoriteProvider,
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

