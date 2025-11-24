import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Trip } from '@/models/Trip';
import { ReferralLog } from '@/models/ReferralLog';
import { PROVIDER_LABELS } from '@/lib/providers/adapters';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();

    // 1. Existing Aggregation: Provider stats (count, avgFare)
    const providerStats = await Trip.aggregate([
      { $match: { status: 'BOOKED', userId: 'demo-user-123' } },
      {
        $group: {
          _id: "$selectedQuote.provider",
          count: { $sum: 1 },
          avgFare: { $avg: "$selectedQuote.minFare" },
        },
      },
      { $sort: { count: -1 } }
    ]);

    const totalTrips = providerStats.reduce((acc, curr) => acc + curr.count, 0);
    
    const perProvider = providerStats.map(item => ({
      provider: PROVIDER_LABELS[item._id] || item._id,
      providerCode: item._id,
      count: item.count,
      avgFare: Math.round(item.avgFare),
    }));

    const favoriteProvider = perProvider.length > 0 ? perProvider[0].provider : null;

    // 2. New Analytics: Savings vs Cheapest Option
    const savingsStats = await Trip.aggregate([
      { 
        $match: { 
          status: 'BOOKED', 
          userId: 'demo-user-123',
          selectedQuote: { $exists: true }
        } 
      },
      {
        $addFields: {
          cheapestFare: { $min: "$quotes.minFare" },
          selectedFare: "$selectedQuote.minFare"
        }
      },
      {
        $addFields: {
          overpay: { 
            $max: [ 0, { $subtract: ["$selectedFare", "$cheapestFare"] } ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          tripsWithOverpay: {
             $sum: { $cond: [ { $gt: ["$overpay", 0] }, 1, 0 ] }
          },
          totalOverpay: { $sum: "$overpay" }
        }
      }
    ]);

    const savingsData = savingsStats.length > 0 ? savingsStats[0] : { totalTrips: 0, tripsWithOverpay: 0, totalOverpay: 0 };
    const avgOverpayPerTrip = savingsData.totalTrips > 0 
      ? Math.round(savingsData.totalOverpay / savingsData.totalTrips) 
      : 0;

    const savings = {
      totalTrips: savingsData.totalTrips,
      tripsWithOverpay: savingsData.tripsWithOverpay,
      totalOverpay: savingsData.totalOverpay,
      avgOverpayPerTrip
    };

    // 3. Optional: Referral Analytics
    const referralStats = await ReferralLog.aggregate([
       { $match: { userId: 'demo-user-123' } },
       {
         $group: {
            _id: "$providerCode",
            count: { $sum: 1 }
         }
       },
       { $sort: { count: -1 } }
    ]);

    const referralsPerProvider = referralStats.map(item => ({
      providerCode: item._id,
      count: item.count
    }));

    return NextResponse.json({
      totalTrips,
      perProvider,
      favoriteProvider,
      savings,
      referralsPerProvider
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
