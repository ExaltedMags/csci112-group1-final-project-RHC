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
      const isDev = process.env.NODE_ENV !== 'production';
      if (isDev) {
        const hasMapboxToken = Boolean(process.env.MAPBOX_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
        if (!hasMapboxToken) {
          console.warn(`[places-search] No results for "${query.trim()}" - MAPBOX_TOKEN not configured`);
        } else {
          console.warn(`[places-search] No results found for query "${query.trim()}"`);
        }
      }
    }

    return NextResponse.json(places);
  } catch (error) {
    console.error('[places-search] Failed to fetch suggestions:', error);
    return NextResponse.json([], { status: 500 });
  }
}


