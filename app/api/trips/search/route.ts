import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Trip, ITrip } from '@/models/Trip';
import { getAllQuotes, estimateDistance } from '@/lib/providers/adapters';
import { geocodePlace, getRoute, type LatLng } from '@/lib/openrouteservice';

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
};

const MIN_DURATION_MINUTES = 5;
const AVERAGE_SPEED_KPH = 25;

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
    await connectToDatabase();
    const body: SearchBody = await req.json();

    const originLabel = body.originPlace?.label ?? body.origin;
    const destinationLabel = body.destinationPlace?.label ?? body.destination;

    if (!originLabel || !destinationLabel) {
      return NextResponse.json({ error: 'Origin and destination are required' }, { status: 400 });
    }

    let originLatLng: LatLng | null = getLatLngFromPlace(body.originPlace);
    let destinationLatLng: LatLng | null = getLatLngFromPlace(body.destinationPlace);

    if (!originLatLng) {
      const fallback = await geocodePlace(originLabel);
      if (fallback) {
        originLatLng = fallback;
      }
    }

    if (!destinationLatLng) {
      const fallback = await geocodePlace(destinationLabel);
      if (fallback) {
        destinationLatLng = fallback;
      }
    }

    let distanceKm = 0;
    let durationMinutes = MIN_DURATION_MINUTES;
    let usedFallback = false;

    if (originLatLng && destinationLatLng) {
      const route = await getRoute(originLatLng, destinationLatLng);
      if (route) {
        distanceKm = route.distanceKm;
        durationMinutes = route.durationMinutes;
        console.info(`[trips-search] Mapbox coordinates + ORS routing`, {
          origin: originLabel,
          destination: destinationLabel,
          distanceKm,
          durationMinutes,
        });
      } else {
        usedFallback = true;
      }
    } else {
      usedFallback = true;
    }

    if (usedFallback) {
      distanceKm = estimateDistance(originLabel, destinationLabel);
      durationMinutes = estimateDurationFromDistance(distanceKm);
      console.warn(`[trips-search] Falling back to estimate`, {
        origin: originLabel,
        destination: destinationLabel,
        distanceKm,
        durationMinutes,
      });
    }

    const { quotes } = await getAllQuotes(distanceKm, durationMinutes, originLabel);

    const tripData: Partial<ITrip> = {
      origin: originLabel,
      destination: destinationLabel,
      distanceKm,
      durationMinutes,
      quotes,
      status: 'SEARCHED',
      userId: 'demo-user-123',
    };

    if (originLatLng) {
      tripData.originLocation = {
        label: originLabel,
        lat: originLatLng.lat,
        lng: originLatLng.lng,
      };
    }

    if (destinationLatLng) {
      tripData.destinationLocation = {
        label: destinationLabel,
        lat: destinationLatLng.lat,
        lng: destinationLatLng.lng,
      };
    }

    const trip = await Trip.create(tripData);

    return NextResponse.json({ tripId: String(trip._id) });
  } catch (error) {
    console.error('Error searching trips:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

