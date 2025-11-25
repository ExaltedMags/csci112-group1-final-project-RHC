/**
 * TypeScript types for the Global Analytics API response
 * Used by /api/analytics/global endpoint
 */

export interface ProviderSurgeInsight {
  provider: string;
  totalQuotes: number;
  surgePercentage: number;
  averageSurgeMultiplier: number;
  maxSurgeMultiplier: number;
}

export interface TimeSlotInsight {
  timeSlot: 'Rush Hour' | 'Late Night' | 'Off-Peak' | string;
  tripCount: number;
  surgePercentage: number;
  averageSurgeMultiplier: number;
}

export interface LocationInsight {
  locationType: 'Airport' | 'CBD' | 'Residential' | string;
  tripCount: number;
  surgePercentage: number;
  averageSurgeMultiplier: number;
}

export interface GlobalAnalyticsResponse {
  surgeFrequencyByProvider: ProviderSurgeInsight[];
  surgePatternsByTimeOfDay: TimeSlotInsight[];
  surgePatternsByLocation: LocationInsight[];
}

// Extended provider stats for display (calculated on frontend)
export interface ProviderStats extends ProviderSurgeInsight {
  marketShare: number;
  avgFare?: number;
  avgEta?: number;
}

// Utility type for surge level classification
export type SurgeLevel = 'none' | 'moderate' | 'high';

export function getSurgeLevel(multiplier: number): SurgeLevel {
  if (multiplier >= 1.5) return 'high';
  if (multiplier > 1.0) return 'moderate';
  return 'none';
}

export function getSurgeLevelColor(level: SurgeLevel): string {
  switch (level) {
    case 'high':
      return 'text-red-600 bg-red-50';
    case 'moderate':
      return 'text-amber-600 bg-amber-50';
    case 'none':
      return 'text-emerald-600 bg-emerald-50';
  }
}

export function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatSurgeMultiplier(multiplier: number): string {
  return `${multiplier.toFixed(2)}x`;
}

