import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Trip } from '@/models/Trip';
import { ReferralLog } from '@/models/ReferralLog';
import { PROVIDER_LABELS } from '@/lib/providers/adapters';

export const dynamic = 'force-dynamic';

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

    // 1. Existing Aggregation: Provider stats (count, avgFare)
    const providerStats = await Trip.aggregate([
      { $match: { status: 'BOOKED', userId } },
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
          userId,
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

    // 3. Referral Analytics (by provider)
    const referralStats = await ReferralLog.aggregate([
       { $match: { userId } },
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

    // 4. Optional: Referral Analytics by Device Type
    const referralStatsByDevice = await ReferralLog.aggregate([
       { $match: { userId } },
       {
         $group: {
            _id: "$deviceType",
            count: { $sum: 1 }
         }
       },
       { $sort: { count: -1 } }
    ]);

    const referralsByDeviceType = referralStatsByDevice.map(item => ({
      deviceType: item._id,
      count: item.count
    }));

    // 5. Optional: Referral Analytics by Provider + Device Type
    const referralStatsByProviderAndDevice = await ReferralLog.aggregate([
       { $match: { userId } },
       {
         $group: {
            _id: {
              providerCode: "$providerCode",
              deviceType: "$deviceType"
            },
            count: { $sum: 1 }
         }
       },
       { $sort: { count: -1 } }
    ]);

    const referralsByProviderAndDevice = referralStatsByProviderAndDevice.map(item => ({
      providerCode: item._id.providerCode,
      deviceType: item._id.deviceType,
      count: item.count
    }));

    return NextResponse.json({
      totalTrips,
      perProvider,
      favoriteProvider,
      savings,
      referralsPerProvider,
      referralsByDeviceType,
      referralsByProviderAndDevice
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
