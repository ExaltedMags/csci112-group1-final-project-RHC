import { NextResponse } from 'next/server';

import { getTripsCollection } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

type ProviderSurgeInsight = {
  provider: string;
  totalQuotes: number;
  surgePercentage: number;
  averageSurgeMultiplier: number;
  maxSurgeMultiplier: number;
};

type TimeSlotInsight = {
  timeSlot: string;
  tripCount: number;
  surgePercentage: number;
  averageSurgeMultiplier: number;
};

type LocationInsight = {
  locationType: string;
  tripCount: number;
  surgePercentage: number;
  averageSurgeMultiplier: number;
};

type RouteAnalytics = {
  origin: string;
  destination: string;
  tripCount: number;
  avgFare: number;
  avgDistance: number;
  mostPopularProvider: string;
};

function percentage(part: number, whole: number): number {
  if (!whole) return 0;
  return parseFloat(((part / whole) * 100).toFixed(1));
}

function round(value: number | null | undefined, precision = 2): number {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 0;
  }
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export async function GET() {
  try {
    const tripsCollection = await getTripsCollection();

    // Surge frequency by provider
    const providerAggregation = await tripsCollection
      .aggregate([
        { $match: { quotes: { $exists: true, $ne: [] } } },
        { $unwind: '$quotes' },
        {
          $group: {
            _id: '$quotes.provider',
            totalQuotes: { $sum: 1 },
            surgeQuotes: {
              $sum: { $cond: [{ $gt: ['$quotes.surgeMultiplier', 1] }, 1, 0] },
            },
            avgMultiplier: { $avg: '$quotes.surgeMultiplier' },
            maxMultiplier: { $max: '$quotes.surgeMultiplier' },
          },
        },
        { $sort: { totalQuotes: -1 } },
      ])
      .toArray();

    const surgeFrequencyByProvider: ProviderSurgeInsight[] = providerAggregation.map((item) => ({
      provider: item._id ?? 'Unknown',
      totalQuotes: item.totalQuotes ?? 0,
      surgePercentage: percentage(item.surgeQuotes ?? 0, item.totalQuotes ?? 0),
      averageSurgeMultiplier: round(item.avgMultiplier ?? 1, 2),
      maxSurgeMultiplier: round(item.maxMultiplier ?? 1, 2),
    }));

    // Time slot insights
    const timeSlotAggregation = await tripsCollection
      .aggregate([
        {
          $addFields: {
            hourOfDay: { $hour: '$createdAt' },
          },
        },
        {
          $addFields: {
            timeSlot: {
              $switch: {
                branches: [
                  {
                    case: {
                      $or: [
                        {
                          $and: [
                            { $gte: ['$hourOfDay', 7] },
                            { $lte: ['$hourOfDay', 9] },
                          ],
                        },
                        {
                          $and: [
                            { $gte: ['$hourOfDay', 17] },
                            { $lte: ['$hourOfDay', 19] },
                          ],
                        },
                      ],
                    },
                    then: 'Rush Hour',
                  },
                  {
                    case: {
                      $or: [
                        { $gte: ['$hourOfDay', 22] },
                        { $lt: ['$hourOfDay', 5] },
                      ],
                    },
                    then: 'Late Night',
                  },
                ],
                default: 'Off-Peak',
              },
            },
            tripAverageMultiplier: { $avg: '$quotes.surgeMultiplier' },
            quotesWithSurge: {
              $size: {
                $filter: {
                  input: '$quotes',
                  cond: { $gt: ['$$this.surgeMultiplier', 1] },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: '$timeSlot',
            tripCount: { $sum: 1 },
            tripsWithSurge: {
              $sum: { $cond: [{ $gt: ['$quotesWithSurge', 0] }, 1, 0] },
            },
            avgSurgeMultiplier: { $avg: '$tripAverageMultiplier' },
          },
        },
        { $sort: { tripCount: -1 } },
      ])
      .toArray();

    const surgePatternsByTimeOfDay: TimeSlotInsight[] = timeSlotAggregation.map((item) => ({
      timeSlot: item._id ?? 'Off-Peak',
      tripCount: item.tripCount ?? 0,
      surgePercentage: percentage(item.tripsWithSurge ?? 0, item.tripCount ?? 0),
      averageSurgeMultiplier: round(item.avgSurgeMultiplier ?? 1, 2),
    }));

    const locationAggregation = await tripsCollection
      .aggregate([
        {
          $addFields: {
            normalizedOrigin: { $toLower: '$origin' },
          },
        },
        {
          $addFields: {
            locationType: {
              $switch: {
                branches: [
                  {
                    case: {
                      $regexMatch: {
                        input: '$normalizedOrigin',
                        regex: /(naia|airport|terminal)/,
                      },
                    },
                    then: 'Airport',
                  },
                  {
                    case: {
                      $regexMatch: {
                        input: '$normalizedOrigin',
                        regex: /(makati|bgc|bonifacio|ortigas|ayala)/,
                      },
                    },
                    then: 'CBD',
                  },
                ],
                default: 'Residential',
              },
            },
            tripAverageMultiplier: { $avg: '$quotes.surgeMultiplier' },
            quotesWithSurge: {
              $size: {
                $filter: {
                  input: '$quotes',
                  cond: { $gt: ['$$this.surgeMultiplier', 1] },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: '$locationType',
            tripCount: { $sum: 1 },
            tripsWithSurge: {
              $sum: { $cond: [{ $gt: ['$quotesWithSurge', 0] }, 1, 0] },
            },
            avgSurgeMultiplier: { $avg: '$tripAverageMultiplier' },
          },
        },
        { $sort: { tripCount: -1 } },
      ])
      .toArray();

    const surgePatternsByLocation: LocationInsight[] = locationAggregation.map((item) => ({
      locationType: item._id ?? 'Residential',
      tripCount: item.tripCount ?? 0,
      surgePercentage: percentage(item.tripsWithSurge ?? 0, item.tripCount ?? 0),
      averageSurgeMultiplier: round(item.avgSurgeMultiplier ?? 1, 2),
    }));

    // Top routes by volume aggregation
    const topRoutesAggregation = await tripsCollection
      .aggregate([
        {
          $match: {
            status: 'BOOKED',
            'originLocation.label': { $exists: true },
            'destinationLocation.label': { $exists: true },
          },
        },
        {
          $group: {
            _id: {
              origin: '$originLocation.label',
              destination: '$destinationLocation.label',
            },
            tripCount: { $sum: 1 },
            avgFare: { $avg: '$selectedQuote.minFare' },
            avgDistance: { $avg: '$distanceKm' },
            providers: { $push: '$selectedQuote.provider' },
          },
        },
        { $sort: { tripCount: -1 } },
        { $limit: 10 },
        {
          $addFields: {
            // Calculate the most popular provider by finding the mode
            mostPopularProvider: {
              $let: {
                vars: {
                  providerCounts: {
                    $reduce: {
                      input: '$providers',
                      initialValue: [],
                      in: {
                        $let: {
                          vars: {
                            existing: {
                              $filter: {
                                input: '$$value',
                                cond: { $eq: ['$$this.provider', '$$this'] },
                              },
                            },
                          },
                          in: {
                            $cond: {
                              if: { $gt: [{ $size: '$$existing' }, 0] },
                              then: '$$value',
                              else: { $concatArrays: ['$$value', [{ provider: '$$this', count: 1 }]] },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                in: { $arrayElemAt: ['$providers', 0] },
              },
            },
          },
        },
      ])
      .toArray();

    // Post-process to calculate the actual most popular provider
    const topRoutes: RouteAnalytics[] = topRoutesAggregation.map((item) => {
      // Count provider occurrences
      const providerCounts: Record<string, number> = {};
      const providers = item.providers as string[];
      for (const provider of providers) {
        if (provider) {
          providerCounts[provider] = (providerCounts[provider] || 0) + 1;
        }
      }
      // Find the most popular provider
      let mostPopularProvider = 'Unknown';
      let maxCount = 0;
      for (const [provider, count] of Object.entries(providerCounts)) {
        if (count > maxCount) {
          maxCount = count;
          mostPopularProvider = provider;
        }
      }

      return {
        origin: item._id?.origin ?? 'Unknown',
        destination: item._id?.destination ?? 'Unknown',
        tripCount: item.tripCount ?? 0,
        avgFare: round(item.avgFare ?? 0, 0),
        avgDistance: round(item.avgDistance ?? 0, 1),
        mostPopularProvider,
      };
    });

    return NextResponse.json({
      surgeFrequencyByProvider,
      surgePatternsByTimeOfDay,
      surgePatternsByLocation,
      topRoutes,
    });
  } catch (error) {
    console.error('[analytics/global] Failed to compute surge analytics', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

