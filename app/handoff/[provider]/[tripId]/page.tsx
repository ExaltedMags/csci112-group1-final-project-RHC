import { notFound } from "next/navigation";
import connectToDatabase from "@/lib/mongoose";
import { Trip } from "@/models/Trip";
import { getBestRoute } from "@/lib/route-planner";
import HandoffView from "./handoff-view";

interface PageProps {
  params: Promise<{
    provider: string;
    tripId: string;
  }>;
}

export default async function HandoffPage(props: PageProps) {
  const params = await props.params;
  await connectToDatabase();

  // Fetch full document (not lean) to allow on-read lazy repair
  const doc = await Trip.findById(params.tripId);

  if (!doc) {
    notFound();
  }

  const isDev = process.env.NODE_ENV !== "production";

  // Lazy route repair: if we have coordinates but no geometry, attempt ORS now
  try {
    const hasOrigin =
      typeof doc.originLocation?.lat === "number" &&
      typeof doc.originLocation?.lng === "number";
    const hasDestination =
      typeof doc.destinationLocation?.lat === "number" &&
      typeof doc.destinationLocation?.lng === "number";
    const coordsMissingOrEmpty =
      !doc.routeGeometry?.coordinates ||
      (Array.isArray(doc.routeGeometry.coordinates) &&
        doc.routeGeometry.coordinates.length < 2);

    if (hasOrigin && hasDestination && coordsMissingOrEmpty) {
      if (isDev) {
        console.log("[lazy-route-repair] Attempting repair for trip", String(doc._id));
      }

      const bestRoute = await getBestRoute(
        { lat: doc.originLocation!.lat, lng: doc.originLocation!.lng },
        { lat: doc.destinationLocation!.lat, lng: doc.destinationLocation!.lng },
        { loggerPrefix: "[lazy-route-repair]" }
      );

      if (bestRoute) {
        doc.routeGeometry = { coordinates: bestRoute.geometry };
        doc.routeSource = bestRoute.source;

        // Optionally update distance/duration only if missing/invalid
        if (!(typeof doc.distanceKm === "number" && doc.distanceKm > 0)) {
          doc.distanceKm = bestRoute.distanceKm;
        }
        if (!(typeof doc.durationMinutes === "number" && doc.durationMinutes > 0)) {
          doc.durationMinutes = bestRoute.durationMinutes;
        }

        await doc.save();

        if (isDev) {
          console.log("[lazy-route-repair] Success, geometry points:", bestRoute.geometry.length);
        }
      } else if (isDev) {
        console.warn("[lazy-route-repair] Routing providers failed for trip", String(doc._id));
      }
    }
  } catch (error) {
    if (isDev) {
      console.warn("[lazy-route-repair] Repair attempt errored:", error);
    }
    // Non-fatal: continue with existing trip (markers only)
  }

  // Pass serialized data to client component
  const serializedTrip = JSON.parse(JSON.stringify(doc));
  const orsEnabled = Boolean(process.env.ORS_API_KEY);

  return (
    <HandoffView 
      trip={serializedTrip} 
      providerId={params.provider} 
      orsEnabled={orsEnabled}
    />
  );
}

