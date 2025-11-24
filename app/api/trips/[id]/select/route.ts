import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Trip, IQuote } from '@/models/Trip';
import { User } from '@/models/User';

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    await connectToDatabase();
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
    
    const trip = await Trip.findById(params.id);
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
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

    trip.selectedQuote = selectedQuote;
    trip.status = 'BOOKED';
    await trip.save();

    // --- User History Logic (separate from referral logging) ---
    const finalUserId = userId || trip.userId; // Use provided userId or trip's userId (for dev fallback)

    // Update User History (only for non-demo users)
    if (finalUserId !== 'demo-user-123') {
      const user = await User.findById(finalUserId);
      if (user) {
        const summaryEntry = {
          tripId: trip._id,
          originName: trip.origin,
          destinationName: trip.destination,
          requestedAt: trip.createdAt ?? new Date(),
        };

        await User.findByIdAndUpdate(finalUserId, {
          $push: {
            history: {
              $each: [summaryEntry],
              $slice: -10, // keep only last 10 entries
            },
          },
        });
      }
    }

    // Note: Referral logging is now done at handoff time (when user clicks "Book" button)
    // See /api/trips/[id]/handoff/route.ts

    return NextResponse.json({ success: true, trip });
  } catch (error) {
    console.error('Error selecting provider:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
