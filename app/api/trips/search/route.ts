import { NextResponse } from 'next/server';

import { getTripsCollection } from '@/lib/mongodb';
import { TripDbDoc } from '@/models/Trip';
import { getAllQuotes, estimateDistance } from '@/lib/providers/adapters';
import { type LatLng } from '@/lib/openrouteservice';
import { geocodePlace, type GeocodedPlace } from '@/lib/mapbox';
import { getBestRoute } from '@/lib/route-planner';

type PlacePayload = {
  label: string;
  address: string;
  lat: number;
  lng: number;
};

type SearchBody = {
  originPlace?: PlacePayload;
  destinationPlace?: PlacePayload;
  origin?: string;
  destination?: string;
  userId: string; // Required: current user's ID
};

const MIN_DURATION_MINUTES = 5;
const AVERAGE_SPEED_KPH = 25;
const isDev = process.env.NODE_ENV !== 'production';

function logDev(message: string, payload?: unknown) {
  if (!isDev) return;
  if (payload !== undefined) {
    console.info(`[trips-search] ${message}`, payload);
  } else {
    console.info(`[trips-search] ${message}`);
  }
}

function estimateDurationFromDistance(distanceKm: number): number {
  const duration = (distanceKm / AVERAGE_SPEED_KPH) * 60;
  return Math.max(MIN_DURATION_MINUTES, Math.round(duration));
}

function getLatLngFromPlace(place?: PlacePayload): LatLng | null {
  if (!place) return null;
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) {
    return null;
  }
  return { lat: place.lat, lng: place.lng };
}

export async function POST(req: Request) {
  try {
    const tripsCollection = await getTripsCollection();
    const body: SearchBody = await req.json();

    // Validate userId
    if (!body.userId || typeof body.userId !== 'string' || body.userId.trim() === '') {
      // Dev fallback: allow demo user in development
      const isDev = process.env.NODE_ENV !== 'production';
      const allowDemo = process.env.ALLOW_DEMO_USER === 'true';
      if (isDev && allowDemo) {
        body.userId = 'demo-user-123';
      } else {
        return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
      }
    }

    const originLabel = body.originPlace?.label ?? body.origin;
    const destinationLabel = body.destinationPlace?.label ?? body.destination;

    if (!originLabel || !destinationLabel) {
      return NextResponse.json({ error: 'Origin and destination are required' }, { status: 400 });
    }

    let originLatLng: LatLng | null = getLatLngFromPlace(body.originPlace);
    let destinationLatLng: LatLng | null = getLatLngFromPlace(body.destinationPlace);
    let originGeocoded: GeocodedPlace | null = null;
    let destinationGeocoded: GeocodedPlace | null = null;

    if (!originLatLng) {
      originGeocoded = await geocodePlace(originLabel);
      if (originGeocoded) {
        originLatLng = originGeocoded;
      }
    }

    if (!destinationLatLng) {
      destinationGeocoded = await geocodePlace(destinationLabel);
      if (destinationGeocoded) {
        destinationLatLng = destinationGeocoded;
      }
    }

    logDev('Geocoding summary', {
      origin: {
        supplied: Boolean(body.originPlace),
        hasLatLng: Boolean(originLatLng),
        geocoded: Boolean(originGeocoded),
      },
      destination: {
        supplied: Boolean(body.destinationPlace),
        hasLatLng: Boolean(destinationLatLng),
        geocoded: Boolean(destinationGeocoded),
      },
    });

    const resolvedOriginLabel = originGeocoded?.label ?? originLabel;
    const resolvedDestinationLabel = destinationGeocoded?.label ?? destinationLabel;

    let distanceKm = 0;
    let durationMinutes = MIN_DURATION_MINUTES;
    let routeCoordinates: { lat: number; lng: number }[] | undefined;
    let routeSource: 'ORS' | 'MAPBOX' | undefined;
    let usedFallback = false;

    if (originLatLng && destinationLatLng) {
      const bestRoute = await getBestRoute(originLatLng, destinationLatLng, {
        loggerPrefix: '[trips-search]',
      });

      if (bestRoute) {
        distanceKm = bestRoute.distanceKm;
        durationMinutes = bestRoute.durationMinutes;
        routeCoordinates = bestRoute.geometry;
        routeSource = bestRoute.source;
      } else {
        usedFallback = true;
      }
    } else {
      usedFallback = true;
    }

    logDev('Routing result', {
      attempted: Boolean(originLatLng && destinationLatLng),
      success: !usedFallback,
      source: routeSource ?? 'ESTIMATE',
      distanceKm,
      durationMinutes,
      geometryPoints: routeCoordinates?.length ?? 0,
    });

    if (usedFallback) {
      distanceKm = estimateDistance(resolvedOriginLabel, resolvedDestinationLabel);
      durationMinutes = estimateDurationFromDistance(distanceKm);
      console.warn(`[trips-search] Falling back to estimate`, {
        origin: resolvedOriginLabel,
        destination: resolvedDestinationLabel,
        distanceKm,
        durationMinutes,
      });
    }

    const createdAt = new Date();
    const { quotes } = await getAllQuotes(
      distanceKm,
      durationMinutes,
      resolvedOriginLabel,
      { hour: createdAt.getHours(), dayOfWeek: createdAt.getDay() }
    );

    const tripDoc: TripDbDoc = {
      origin: resolvedOriginLabel,
      destination: resolvedDestinationLabel,
      distanceKm,
      durationMinutes,
      quotes,
      status: 'SEARCHED',
      userId: body.userId, // Use userId from request
      createdAt,
    };

    if (originLatLng) {
      tripDoc.originLocation = {
        label: resolvedOriginLabel,
        lat: originLatLng.lat,
        lng: originLatLng.lng,
      };
    }

    if (destinationLatLng) {
      tripDoc.destinationLocation = {
        label: resolvedDestinationLabel,
        lat: destinationLatLng.lat,
        lng: destinationLatLng.lng,
      };
    }

    if (routeCoordinates?.length) {
      tripDoc.routeGeometry = {
        coordinates: routeCoordinates,
      };
      tripDoc.routeSource = routeSource;
    }

    const result = await tripsCollection.insertOne(tripDoc);

    return NextResponse.json({ tripId: String(result.insertedId) });
  } catch (error) {
    console.error('Error searching trips:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

