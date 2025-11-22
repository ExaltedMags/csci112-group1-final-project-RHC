import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Trip } from '@/models/Trip';

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    await connectToDatabase();
    const trip = await Trip.findById(params.id);

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    return NextResponse.json(trip);
  } catch (error) {
    console.error('Error fetching trip:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

