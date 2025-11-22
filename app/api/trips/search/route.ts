import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Trip } from '@/models/Trip';
import { getAllQuotes } from '@/lib/providers/adapters';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { origin, destination } = await req.json();

    if (!origin || !destination) {
      return NextResponse.json({ error: 'Origin and destination are required' }, { status: 400 });
    }

    // 1. Get Quotes from Providers
    const { quotes, distanceKm } = await getAllQuotes(origin, destination);

    // 2. Create Trip record
    const trip = await Trip.create({
      origin,
      destination,
      distanceKm,
      quotes,
      status: 'SEARCHED',
      userId: 'demo-user-123' // Hardcoded for demo
    });

    return NextResponse.json({ tripId: trip._id });
  } catch (error) {
    console.error('Error searching trips:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

