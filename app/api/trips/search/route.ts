import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Trip, ITrip } from '@/models/Trip';
import { getAllQuotes, estimateDistance } from '@/lib/providers/adapters';
import { getRoute, type LatLng } from '@/lib/openrouteservice';
import { geocodePlace, type GeocodedPlace } from '@/lib/mapbox';

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

    const resolvedOriginLabel = originGeocoded?.label ?? originLabel;
    const resolvedDestinationLabel = destinationGeocoded?.label ?? destinationLabel;

    let distanceKm = 0;
    let durationMinutes = MIN_DURATION_MINUTES;
    let routeCoordinates: { lat: number; lng: number }[] | undefined;
    let usedFallback = false;

    if (originLatLng && destinationLatLng) {
      const route = await getRoute(originLatLng, destinationLatLng);
      if (route) {
        distanceKm = route.distanceKm;
        durationMinutes = route.durationMinutes;
        if (route.geometry && route.geometry.length >= 2) {
          routeCoordinates = route.geometry;
        }
        console.info(`[trips-search] Mapbox coordinates + ORS routing`, {
          origin: resolvedOriginLabel,
          destination: resolvedDestinationLabel,
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
      distanceKm = estimateDistance(resolvedOriginLabel, resolvedDestinationLabel);
      durationMinutes = estimateDurationFromDistance(distanceKm);
      console.warn(`[trips-search] Falling back to estimate`, {
        origin: resolvedOriginLabel,
        destination: resolvedDestinationLabel,
        distanceKm,
        durationMinutes,
      });
    }

    const { quotes } = await getAllQuotes(distanceKm, durationMinutes, resolvedOriginLabel);

    const tripData: Partial<ITrip> = {
      origin: resolvedOriginLabel,
      destination: resolvedDestinationLabel,
      distanceKm,
      durationMinutes,
      quotes,
      status: 'SEARCHED',
      userId: 'demo-user-123',
    };

    if (originLatLng) {
      tripData.originLocation = {
        label: resolvedOriginLabel,
        lat: originLatLng.lat,
        lng: originLatLng.lng,
      };
    }

    if (destinationLatLng) {
      tripData.destinationLocation = {
        label: resolvedDestinationLabel,
        lat: destinationLatLng.lat,
        lng: destinationLatLng.lng,
      };
    }

    if (routeCoordinates?.length) {
      tripData.routeGeometry = {
        coordinates: routeCoordinates,
      };
    }

    const trip = await Trip.create(tripData);

    return NextResponse.json({ tripId: String(trip._id) });
  } catch (error) {
    console.error('Error searching trips:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

