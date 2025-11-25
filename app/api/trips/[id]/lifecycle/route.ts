import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"

import { getTripsCollection } from "@/lib/mongodb"
import { PROVIDER_LIFECYCLE_STEPS } from "@/lib/provider-lifecycle"

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params

  try {
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid trip id" }, { status: 400 })
    }

    const tripsCollection = await getTripsCollection()
    const trip = await tripsCollection.findOne({ _id: new ObjectId(params.id) })

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 })
    }

    const payload = await req.json().catch(() => ({}))
    const provider = payload?.provider as string | undefined

    if (provider && trip.selectedQuote && trip.selectedQuote.provider !== provider) {
      console.warn("[lifecycle] Provider mismatch", {
        tripId: trip._id.toString(),
        expected: trip.selectedQuote?.provider,
        received: provider,
      })
    }

    return NextResponse.json({
      success: true,
      steps: PROVIDER_LIFECYCLE_STEPS,
      provider: provider ?? trip.selectedQuote?.provider ?? null,
    })
  } catch (error) {
    console.error("Error starting lifecycle simulation:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}


