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

  const serializedTrip = {
    ...trip,
    _id: trip._id.toString(),
    quotes: trip.quotes.map((quote) => ({ ...quote })),
    createdAt: trip.createdAt?.toISOString?.() ?? new Date().toISOString(),
  } as ITrip & { _id: string }

  return <TripProgressView trip={serializedTrip} />
}


