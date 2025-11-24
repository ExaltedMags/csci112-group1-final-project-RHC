export type ProviderLifecycleStep = {
  text: string
}

export const PROVIDER_LIFECYCLE_STEPS: ProviderLifecycleStep[] = [
  { text: "Confirming your booking" },
  { text: "Matching you with a nearby driver" },
  { text: "Driver assigned" },
  { text: "Driver is heading to your pickup point" },
  { text: "Almost at pickup point" },
  { text: "Trip started" },
  { text: "On the way to your destination" },
  { text: "Trip completed" },
]

// Duration per step (ms). Keep it short so the simulation feels responsive.
export const PROVIDER_LIFECYCLE_STEP_DURATION_MS = 1100

export const PROVIDER_LIFECYCLE_TOTAL_DURATION_MS =
  PROVIDER_LIFECYCLE_STEPS.length * PROVIDER_LIFECYCLE_STEP_DURATION_MS


