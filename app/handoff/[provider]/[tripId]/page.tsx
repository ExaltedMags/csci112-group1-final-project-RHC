import { notFound } from "next/navigation";
import connectToDatabase from "@/lib/mongoose";
import { Trip } from "@/models/Trip";
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

  const trip = await Trip.findById(params.tripId).lean();

  if (!trip) {
    notFound();
  }

  // Pass serialized data to client component
  const serializedTrip = JSON.parse(JSON.stringify(trip));

  return (
    <HandoffView 
      trip={serializedTrip} 
      providerId={params.provider} 
    />
  );
}

