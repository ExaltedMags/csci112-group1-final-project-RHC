import { getRoute, type LatLng, type RouteResult } from './openrouteservice';
import { getMapboxRoute, type MapboxRouteResult } from './mapbox';

type GeometryPoint = { lat: number; lng: number };

export type RoutePlan = {
  distanceKm: number;
  durationMinutes: number;
  geometry: GeometryPoint[];
  source: 'ORS' | 'MAPBOX';
};

type RouteOptions = {
  loggerPrefix?: string;
  maxDistanceKm?: number;
  minGeometryPoints?: number;
};

const DEFAULT_MAX_DISTANCE_KM = 100;
const DEFAULT_MIN_GEOMETRY_POINTS = 5;

function validateGeometry(
  points: GeometryPoint[] | undefined,
  minPoints: number,
) {
  return Array.isArray(points) && points.length >= minPoints;
}

function normalizeRoute(
  route: Pick<RouteResult, 'distanceKm' | 'durationMinutes' | 'geometry'>,
  source: 'ORS' | 'MAPBOX',
  options: Required<Pick<RouteOptions, 'maxDistanceKm' | 'minGeometryPoints'>>,
) {
  if (!validateGeometry(route.geometry, options.minGeometryPoints)) {
    return { plan: null as RoutePlan | null, reason: 'insufficient-geometry' };
  }

  if (route.distanceKm > options.maxDistanceKm) {
    return { plan: null as RoutePlan | null, reason: 'distance-out-of-range' };
  }

  return {
    plan: {
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
      geometry: route.geometry!,
      source,
    },
    reason: null,
  };
}

export async function getBestRoute(
  origin: LatLng,
  destination: LatLng,
  options?: RouteOptions,
): Promise<RoutePlan | null> {
  const isDev = process.env.NODE_ENV !== 'production';
  const maxDistanceKm = options?.maxDistanceKm ?? DEFAULT_MAX_DISTANCE_KM;
  const minGeometryPoints = options?.minGeometryPoints ?? DEFAULT_MIN_GEOMETRY_POINTS;
  const loggerPrefix = options?.loggerPrefix ?? '[route-planner]';

  const orsRoute = await getRoute(origin, destination);

  if (orsRoute) {
    const { plan, reason } = normalizeRoute(orsRoute, 'ORS', {
      maxDistanceKm,
      minGeometryPoints,
    });

    if (plan) {
      if (isDev) {
        console.info(`${loggerPrefix} ORS route accepted`, {
          distanceKm: plan.distanceKm,
          durationMinutes: plan.durationMinutes,
          geometryPoints: plan.geometry.length,
        });
      }
      return plan;
    }

    if (isDev) {
      console.warn(`${loggerPrefix} ORS route rejected`, {
        reason,
        distanceKm: orsRoute.distanceKm,
        geometryPoints: orsRoute.geometry?.length ?? 0,
      });
    }
  }

  const mapboxRoute: MapboxRouteResult | null = await getMapboxRoute(origin, destination);

  if (mapboxRoute) {
    const { plan, reason } = normalizeRoute(mapboxRoute, 'MAPBOX', {
      maxDistanceKm,
      minGeometryPoints,
    });

    if (plan) {
      if (isDev) {
        console.info(`${loggerPrefix} Mapbox route accepted`, {
          distanceKm: plan.distanceKm,
          durationMinutes: plan.durationMinutes,
          geometryPoints: plan.geometry.length,
        });
      }
      return plan;
    }

    if (isDev) {
      console.warn(`${loggerPrefix} Mapbox route rejected`, {
        reason,
        distanceKm: mapboxRoute.distanceKm,
        geometryPoints: mapboxRoute.geometry.length ?? 0,
      });
    }
  }

  if (isDev) {
    console.warn(`${loggerPrefix} All routing providers failed`);
  }

  return null;
}



