import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getTripsCollection } from '@/lib/mongodb';
import { serializeTrip } from '@/lib/serializers';

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid trip id' }, { status: 400 });
    }

    const tripsCollection = await getTripsCollection();
    const trip = await tripsCollection.findOne({ _id: new ObjectId(params.id) });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    return NextResponse.json(serializeTrip(trip));
  } catch (error) {
    console.error('Error fetching trip:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

