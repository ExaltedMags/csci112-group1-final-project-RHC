import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getTripsCollection, getUsersCollection } from '@/lib/mongodb';
import { IQuote } from '@/models/Trip';
import { serializeTrip } from '@/lib/serializers';

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid trip id' }, { status: 400 });
    }

    const tripsCollection = await getTripsCollection();
    const usersCollection = await getUsersCollection();
    const { provider, userId } = await req.json();
    
    // Validate userId
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      // Dev fallback: allow demo user in development
      const isDev = process.env.NODE_ENV !== 'production';
      const allowDemo = process.env.ALLOW_DEMO_USER === 'true';
      if (isDev && allowDemo) {
        // Will use trip.userId below
      } else {
        return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
      }
    }
    
    const trip = await tripsCollection.findOne({ _id: new ObjectId(params.id) });
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    if (!trip._id) {
      return NextResponse.json({ error: 'Trip is missing identifier' }, { status: 500 });
    }

    // Verify trip belongs to user (unless dev fallback)
    const isDev = process.env.NODE_ENV !== 'production';
    const allowDemo = process.env.ALLOW_DEMO_USER === 'true';
    if (!(isDev && allowDemo && !userId)) {
      if (trip.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const selectedQuote = trip.quotes.find((q: IQuote) => q.provider === provider);
    if (!selectedQuote) {
      return NextResponse.json({ error: 'Invalid provider selected' }, { status: 400 });
    }

    const updatedAt = new Date();
    trip.selectedQuote = selectedQuote;
    trip.status = 'BOOKED';
    trip.updatedAt = updatedAt;

    await tripsCollection.updateOne(
      { _id: trip._id },
      {
        $set: {
          selectedQuote,
          status: 'BOOKED',
          updatedAt,
        },
      }
    );

    // --- User History Logic (separate from referral logging) ---
    const finalUserId = userId || trip.userId; // Use provided userId or trip's userId (for dev fallback)

    // Update User History (only for non-demo users)
    if (finalUserId !== 'demo-user-123') {
      if (ObjectId.isValid(finalUserId)) {
        const summaryEntry = {
          tripId: trip._id,
          originName: trip.origin,
          destinationName: trip.destination,
          requestedAt: trip.createdAt ?? new Date(),
        };

        await usersCollection.updateOne(
          { _id: new ObjectId(finalUserId) },
          {
            $set: {
              updatedAt,
            },
            $push: {
              history: {
                $each: [summaryEntry],
                $slice: -10,
              },
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          { upsert: false }
        );
      }
    }

    // Note: Referral logging is now done at handoff time (when user clicks "Book" button)
    // See /api/trips/[id]/handoff/route.ts

    return NextResponse.json({ success: true, trip: serializeTrip(trip) });
  } catch (error) {
    console.error('Error selecting provider:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
