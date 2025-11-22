import { notFound } from "next/navigation"
import connectToDatabase from "@/lib/mongoose"
import { Trip, ITrip } from "@/models/Trip"
import TripView from "./trip-view"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TripPage(props: PageProps) {
  const params = await props.params;
  await connectToDatabase()
  
  const trip = await Trip.findById(params.id).lean<ITrip>()
  
  if (!trip) {
    notFound()
  }

  // Convert _id and createdAt to standard types for client component serialization if needed
  // Mongoose .lean() returns POJO, but _id is ObjectId and Date is Date object.
  // Next.js server components can pass Date objects to client components in recent versions, 
  // but ObjectId needs string conversion.
  const serializedTrip = {
    ...trip,
    _id: trip._id.toString(),
    quotes: trip.quotes.map(q => ({...q})), // Ensure plain objects
    createdAt: trip.createdAt.toISOString() // Pass as string to be safe
  } as unknown as ITrip & { _id: string }

  return <TripView trip={serializedTrip} />
}

