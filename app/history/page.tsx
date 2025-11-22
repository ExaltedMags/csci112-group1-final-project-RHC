import connectToDatabase from "@/lib/mongoose"
import { Trip, ITrip } from "@/models/Trip"
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

  return <HistoryView history={history} analytics={analyticsDocs} />
}

