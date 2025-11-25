import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getUsersCollection } from '@/lib/mongodb';

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ userId: id, history: [] });
    }

    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne({ _id: new ObjectId(id) });

    if (!user) {
      return NextResponse.json({ userId: id, history: [] });
    }

    return NextResponse.json({
      userId: user._id.toString(),
      history: user.history,
    });
  } catch (error) {
    console.error('Error fetching user history:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

