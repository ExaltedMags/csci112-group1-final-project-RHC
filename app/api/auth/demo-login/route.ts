import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { User } from '@/models/User';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { email, name } = await req.json();

    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.trim().toLowerCase();

    // Find or create user by email
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Create new user
      user = await User.create({
        email: normalizedEmail,
        name: name?.trim() || undefined,
        history: [],
      });
    } else {
      // Update name if provided and different
      if (name?.trim() && name.trim() !== user.name) {
        user.name = name.trim();
        await user.save();
      }
    }

    // Return user info (userId is the MongoDB _id as string)
    return NextResponse.json({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error('Error in demo-login:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

