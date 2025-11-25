import { notFound } from "next/navigation"

import connectToDatabase from "@/lib/mongoose"
import { Trip, ITrip } from "@/models/Trip"
import TripProgressView from "./progress-view"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TripProgressPage(props: PageProps) {
  const params = await props.params
  await connectToDatabase()

  const trip = await Trip.findById(params.id).lean<ITrip>()

  if (!trip) {
    notFound()
  }

  // Serialize the trip for client-side consumption
  // Using type assertion to unknown first to avoid strict type checking
  // since we're converting from Mongoose document to plain object
  const serializedTrip = {
    ...trip,
    _id: trip._id.toString(),
    quotes: trip.quotes.map((quote) => ({ ...quote })),
    createdAt: trip.createdAt?.toISOString?.() ?? new Date().toISOString(),
  } as unknown as ITrip & { _id: string }

  return <TripProgressView trip={serializedTrip} />
}


