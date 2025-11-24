import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import { Trip } from '@/models/Trip';
import { ReferralLog } from '@/models/ReferralLog';
import { PROVIDER_LABELS } from '@/lib/providers/adapters';

/**
 * Detect device type from User-Agent header
 * Simple heuristic: mobile, tablet, or desktop
 */
function detectDeviceType(userAgent: string | null): 'mobile' | 'tablet' | 'desktop' {
  if (!userAgent) {
    return 'desktop'; // Default fallback
  }

  const ua = userAgent.toLowerCase();

  // Check for tablet first (before mobile, as tablets often contain mobile keywords)
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }

  // Check for mobile
  if (/android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    return 'mobile';
  }

  // Default to desktop
  return 'desktop';
}

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    await connectToDatabase();
    const { userId } = await req.json();
    
    // Validate userId
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      // Dev fallback: allow demo user in development
      const isDev = process.env.NODE_ENV !== 'production';
      const allowDemo = process.env.ALLOW_DEMO_USER === 'true';
      if (isDev && allowDemo) {
        // Will use trip.userId below
      } else {
        return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
      }
    }
    
    const trip = await Trip.findById(params.id);
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Verify trip belongs to user (unless dev fallback)
    const isDev = process.env.NODE_ENV !== 'production';
    const allowDemo = process.env.ALLOW_DEMO_USER === 'true';
    if (!(isDev && allowDemo && !userId)) {
      if (trip.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Verify trip has a selected quote
    if (!trip.selectedQuote) {
      return NextResponse.json({ error: 'No quote selected for this trip' }, { status: 400 });
    }

    // Verify trip is in BOOKED status
    if (trip.status !== 'BOOKED') {
      return NextResponse.json({ error: 'Trip must be booked before handoff' }, { status: 400 });
    }

    const selectedQuote = trip.selectedQuote;
    const finalUserId = userId || trip.userId; // Use provided userId or trip's userId (for dev fallback)

    // Detect device type from User-Agent header
    const userAgent = req.headers.get('user-agent');
    const deviceType = detectDeviceType(userAgent);

    // Create ReferralLog
    // Note: For demo-user-123, we still create ReferralLog
    await ReferralLog.create({
      userId: finalUserId,
      tripId: trip._id,
      providerCode: selectedQuote.provider,
      providerName: PROVIDER_LABELS[selectedQuote.provider] || selectedQuote.provider,
      bookedMinFare: selectedQuote.minFare,
      bookedMaxFare: selectedQuote.maxFare,
      deviceType: deviceType,
    });

    // Note: User History is updated at selection time (in /api/trips/[id]/select/route.ts)
    // This endpoint only handles referral logging at handoff time

    return NextResponse.json({ 
      success: true, 
      message: 'Referral logged successfully',
      deviceType 
    });
  } catch (error) {
    console.error('Error logging referral on handoff:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

