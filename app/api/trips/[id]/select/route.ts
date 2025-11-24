import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Trip, IQuote } from '@/models/Trip';
import { User } from '@/models/User';
import { ReferralLog } from '@/models/ReferralLog';
import { PROVIDER_LABELS } from '@/lib/providers/adapters';

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    await connectToDatabase();
    const { provider } = await req.json();
    
    const trip = await Trip.findById(params.id);
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const selectedQuote = trip.quotes.find((q: IQuote) => q.provider === provider);
    if (!selectedQuote) {
      return NextResponse.json({ error: 'Invalid provider selected' }, { status: 400 });
    }

    trip.selectedQuote = selectedQuote;
    trip.status = 'BOOKED';
    await trip.save();

    // --- New User & Referral Logic ---
    const userId = trip.userId; // "demo-user-123"

    // 1. Upsert User
    await User.findByIdAndUpdate(
      userId,
      {
        $setOnInsert: { _id: userId },
      },
      { upsert: true, new: true }
    );

    // 2. Create ReferralLog
    await ReferralLog.create({
      userId,
      tripId: trip._id,
      providerCode: selectedQuote.provider,
      providerName: PROVIDER_LABELS[selectedQuote.provider] || selectedQuote.provider,
      bookedMinFare: selectedQuote.minFare,
      bookedMaxFare: selectedQuote.maxFare,
    });

    // 3. Update User History (push and trim)
    const summaryEntry = {
      tripId: trip._id,
      originName: trip.origin,
      destinationName: trip.destination,
      requestedAt: trip.createdAt ?? new Date(),
    };

    await User.findByIdAndUpdate(userId, {
      $push: {
        history: {
          $each: [summaryEntry],
          $slice: -10, // keep only last 10 entries
        },
      },
    });

    return NextResponse.json({ success: true, trip });
  } catch (error) {
    console.error('Error selecting provider:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
