export type ProviderCode = 'GrabPH' | 'Angkas' | 'JoyRideMC';

export interface SurgeComputationInput {
  provider: ProviderCode;
  originLabel?: string;
  hour?: number;
  dayOfWeek?: number; // 0 (Sun) - 6 (Sat)
}

export interface SurgeComputationResult {
  isSurge: boolean;
  surgeMultiplier: number;
}

const CBD_KEYWORDS = ['makati', 'bgc', 'bonifacio', 'ortigas', 'ayala'];
const AIRPORT_KEYWORDS = ['naia', 'airport', 'terminal'];

function normalizeLabel(label?: string): string {
  return label?.toLowerCase() ?? '';
}

function isRushHour(hour: number): boolean {
  return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
}

function isLateNight(hour: number): boolean {
  return hour >= 22 || hour < 5;
}

function isWeekday(day: number): boolean {
  return day >= 1 && day <= 5;
}

function matchesKeyword(label: string, keywords: string[]): boolean {
  return keywords.some((kw) => label.includes(kw));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const PROVIDER_PROFILES: Record<
  ProviderCode,
  { baseProbability: number; maxMultiplier: number; baseVariance: number }
> = {
  GrabPH: {
    baseProbability: 0.75, // 75% of trips with some level of surge
    maxMultiplier: 2.0,
    baseVariance: 0.1,
  },
  Angkas: {
    baseProbability: 0.4,
    maxMultiplier: 1.4,
    baseVariance: 0.05,
  },
  JoyRideMC: {
    baseProbability: 0.35,
    maxMultiplier: 1.35,
    baseVariance: 0.05,
  },
};

export function calculateSurgeMultiplier(input: SurgeComputationInput): SurgeComputationResult {
  const now = new Date();
  const hour = Number.isFinite(input.hour) ? input.hour! : now.getHours();
  const dayOfWeek = Number.isFinite(input.dayOfWeek) ? input.dayOfWeek! : now.getDay();
  const originNormalized = normalizeLabel(input.originLabel);
  const profile = PROVIDER_PROFILES[input.provider];

  if (!profile) {
    return { isSurge: false, surgeMultiplier: 1 };
  }

  const rush = isRushHour(hour);
  const late = isLateNight(hour);
  const cbd = matchesKeyword(originNormalized, CBD_KEYWORDS);
  const airport = matchesKeyword(originNormalized, AIRPORT_KEYWORDS);
  const weekday = isWeekday(dayOfWeek);

  let surgeScore = 0;

  if (rush) {
    surgeScore += input.provider === 'GrabPH' ? 0.55 : 0.35;
  } else if (late) {
    surgeScore += input.provider === 'GrabPH' ? 0.3 : 0.2;
  } else {
    surgeScore += input.provider === 'GrabPH' ? 0.15 : 0.05;
  }

  if (cbd) {
    surgeScore += input.provider === 'GrabPH' ? 0.35 : 0.2;
  }

  if (airport) {
    surgeScore += input.provider === 'GrabPH' ? 0.5 : 0.3;
  }

  if (weekday && rush && (cbd || airport)) {
    surgeScore += 0.15;
  }

  const probabilityBoost =
    (rush ? 0.1 : 0) +
    (late ? 0.05 : 0) +
    (cbd ? 0.05 : 0) +
    (airport ? 0.1 : 0);

  const triggerProbability = clamp(
    profile.baseProbability + probabilityBoost,
    0,
    input.provider === 'GrabPH' ? 0.95 : 0.8
  );

  let tentativeMultiplier = 1 + surgeScore;
  const randomVariance = (Math.random() * (profile.baseVariance * 2)) - profile.baseVariance;
  tentativeMultiplier += randomVariance;

  const shouldSurge = tentativeMultiplier > 1.05 || Math.random() < triggerProbability;

  if (!shouldSurge) {
    return { isSurge: false, surgeMultiplier: 1 };
  }

  const finalMultiplier = clamp(
    parseFloat(tentativeMultiplier.toFixed(2)),
    1.05,
    profile.maxMultiplier
  );

  return {
    isSurge: true,
    surgeMultiplier: finalMultiplier,
  };
}

export function getLocationCategory(originLabel?: string): 'CBD' | 'AIRPORT' | 'RESIDENTIAL' {
  const normalized = normalizeLabel(originLabel);
  if (matchesKeyword(normalized, AIRPORT_KEYWORDS)) {
    return 'AIRPORT';
  }
  if (matchesKeyword(normalized, CBD_KEYWORDS)) {
    return 'CBD';
  }
  return 'RESIDENTIAL';
}

export type TimeSlot = 'RUSH_HOUR' | 'LATE_NIGHT' | 'OFF_PEAK';

export function getTimeSlotFromHour(hour: number): TimeSlot {
  if (isRushHour(hour)) {
    return 'RUSH_HOUR';
  }
  if (isLateNight(hour)) {
    return 'LATE_NIGHT';
  }
  return 'OFF_PEAK';
}

