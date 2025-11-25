import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

import { getUsersCollection } from '@/lib/mongodb';

export async function POST(req: Request) {
  try {
    const usersCollection = await getUsersCollection();
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
    let user = await usersCollection.findOne({ email: normalizedEmail });

    if (!user) {
      // Create new user
      const now = new Date();
      const insertDoc = {
        email: normalizedEmail,
        name: name?.trim() || undefined,
        history: [],
        createdAt: now,
        updatedAt: now,
      };

      const result = await usersCollection.insertOne(insertDoc);
      user = { ...insertDoc, _id: result.insertedId };
    } else {
      // Update name if provided and different
      if (name?.trim() && name.trim() !== user.name) {
        const trimmedName = name.trim();
        const updatedAt = new Date();
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { name: trimmedName, updatedAt } }
        );
        user.name = trimmedName;
        user.updatedAt = updatedAt;
      }
    }

    // Return user info (userId is the MongoDB _id as string)
    return NextResponse.json({
      userId: user._id instanceof ObjectId ? user._id.toString() : String(user._id),
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

