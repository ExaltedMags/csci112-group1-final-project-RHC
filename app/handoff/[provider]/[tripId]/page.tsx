import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";

import { getTripsCollection } from "@/lib/mongodb";
import { serializeTrip } from "@/lib/serializers";
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
  if (!ObjectId.isValid(params.tripId)) {
    notFound();
  }

  const tripsCollection = await getTripsCollection();
  let doc = await tripsCollection.findOne({ _id: new ObjectId(params.tripId) });

  if (!doc) {
    notFound();
  }

  if (!doc._id) {
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
        const updates: Record<string, unknown> = {
          routeGeometry: { coordinates: bestRoute.geometry },
          routeSource: bestRoute.source,
          updatedAt: new Date(),
        };

        if (!(typeof doc.distanceKm === "number" && doc.distanceKm > 0)) {
          updates.distanceKm = bestRoute.distanceKm;
        }
        if (!(typeof doc.durationMinutes === "number" && doc.durationMinutes > 0)) {
          updates.durationMinutes = bestRoute.durationMinutes;
        }

        const updatedDoc = await tripsCollection.findOneAndUpdate(
          { _id: doc._id },
          { $set: updates },
          { returnDocument: "after" }
        );

        if (updatedDoc) {
          doc = updatedDoc;
        } else {
          doc = { ...doc, ...updates };
        }

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
  const serializedTrip = serializeTrip(doc);
  const orsEnabled = Boolean(process.env.ORS_API_KEY);

  return (
    <HandoffView 
      trip={serializedTrip} 
      providerId={params.provider} 
      orsEnabled={orsEnabled}
    />
  );
}

