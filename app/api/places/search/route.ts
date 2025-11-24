import { NextResponse } from 'next/server';
import { searchPlaces } from '@/lib/mapbox';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('search') ?? searchParams.get('q') ?? '';

  if (!query.trim()) {
    return NextResponse.json([]);
  }

  try {
    const places = await searchPlaces(query);

    if (places.length === 0) {
      console.warn(`[places-search] no results for query "${query.trim()}"`);
    }

    return NextResponse.json(places);
  } catch (error) {
    console.error('[places-search] Failed to fetch suggestions:', error);
    return NextResponse.json([]);
  }
}


