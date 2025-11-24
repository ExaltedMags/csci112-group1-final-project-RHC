import connectToDatabase from "@/lib/mongoose"
import { Trip, ITrip } from "@/models/Trip"
import { ReferralLog } from "@/models/ReferralLog"
import HistoryView from "./history-view"

// Define types for aggregation result
interface AggregationResult {
  _id: string;
  count: number;
  avgFare: number;
}

export const dynamic = 'force-dynamic'; // Ensure we fetch fresh data

export default async function HistoryPage() {
  await connectToDatabase()

  // 1. Fetch recent history
  const historyDocs = await Trip.find({ userId: 'demo-user-123' })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean<ITrip[]>();

  // Serialize for client
  const history = historyDocs.map(doc => ({
    ...doc,
    _id: doc._id.toString(),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    quotes: doc.quotes.map(q => ({...q})),
    selectedQuote: doc.selectedQuote ? {...doc.selectedQuote} : undefined
  })) as unknown as (ITrip & { _id: string })[];

  // 2. Aggregate analytics
  const analyticsDocs = await Trip.aggregate<AggregationResult>([
    { $match: { status: 'BOOKED', userId: 'demo-user-123' } },
    {
      $group: {
        _id: "$selectedQuote.provider",
        count: { $sum: 1 },
        avgFare: { $avg: "$selectedQuote.minFare" }
      }
    }
  ]);

  // 3. Savings Analytics
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

  // 4. Referral Analytics
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

  return <HistoryView 
    history={history} 
    analytics={analyticsDocs} 
    savings={{
      totalOverpay: savingsData.totalOverpay,
      avgOverpayPerTrip
    }}
    referrals={referralStats.map(r => ({ providerCode: r._id, count: r.count }))}
  />
}
