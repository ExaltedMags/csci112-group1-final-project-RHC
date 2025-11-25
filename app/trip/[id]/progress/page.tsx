import { notFound } from "next/navigation"
import { ObjectId } from "mongodb"

import { getTripsCollection } from "@/lib/mongodb"
import { serializeTrip } from "@/lib/serializers"
import TripProgressView from "./progress-view"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TripProgressPage(props: PageProps) {
  const params = await props.params
  if (!ObjectId.isValid(params.id)) {
    notFound()
  }

  const tripsCollection = await getTripsCollection()
  const trip = await tripsCollection.findOne({ _id: new ObjectId(params.id) })

  if (!trip || !trip._id) {
    notFound()
  }

  const serializedTrip = serializeTrip(trip)

  return <TripProgressView trip={serializedTrip} />
}


