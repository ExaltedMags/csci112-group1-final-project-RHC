import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { User } from '@/models/User';

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    await connectToDatabase();
    const { id } = params;

    const user = await User.findById(id);

    if (!user) {
      return NextResponse.json({ userId: id, history: [] });
    }

    return NextResponse.json({
      userId: user._id,
      history: user.history,
    });
  } catch (error) {
    console.error('Error fetching user history:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

