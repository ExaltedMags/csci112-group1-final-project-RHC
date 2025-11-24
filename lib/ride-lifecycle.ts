/**
 * Ride lifecycle status definitions for simulating a real ride-hailing experience
 * Inspired by Grab, Angkas, and JoyRide apps in the Philippines
 */

export type RideStatus = 
  | "BOOKED"
  | "DRIVER_ASSIGNED"
  | "DRIVER_ARRIVING"
  | "DRIVER_ARRIVED"
  | "TRIP_STARTED"
  | "ON_TRIP"
  | "COMPLETED"

export interface RideLifecycleStep {
  status: RideStatus
  label: string
  description: string
  durationMs: number
}

export const RIDE_LIFECYCLE_STEPS: RideLifecycleStep[] = [
  {
    status: "BOOKED",
    label: "Booked",
    description: "Looking for a driver nearby...",
    durationMs: 3000,
  },
  {
    status: "DRIVER_ASSIGNED",
    label: "Driver Assigned",
    description: "Your driver is on the way!",
    durationMs: 4000,
  },
  {
    status: "DRIVER_ARRIVING",
    label: "Driver Arriving",
    description: "Almost at your pickup point",
    durationMs: 4000,
  },
  {
    status: "DRIVER_ARRIVED",
    label: "Driver Arrived",
    description: "Your driver has arrived",
    durationMs: 3000,
  },
  {
    status: "TRIP_STARTED",
    label: "Trip Started",
    description: "Heading to your destination",
    durationMs: 5000,
  },
  {
    status: "ON_TRIP",
    label: "On Trip",
    description: "On the way to your destination",
    durationMs: 4000,
  },
  {
    status: "COMPLETED",
    label: "Completed",
    description: "You have arrived!",
    durationMs: 0,
  },
]

export const TOTAL_LIFECYCLE_DURATION_MS = RIDE_LIFECYCLE_STEPS.reduce(
  (sum, step) => sum + step.durationMs,
  0
)

export function getStepIndex(status: RideStatus): number {
  return RIDE_LIFECYCLE_STEPS.findIndex((step) => step.status === status)
}

export function getStepByIndex(index: number): RideLifecycleStep {
  return RIDE_LIFECYCLE_STEPS[Math.min(index, RIDE_LIFECYCLE_STEPS.length - 1)]
}

/**
 * Mock driver data for simulation
 */
export interface MockDriver {
  name: string
  photo: string
  rating: number
  trips: number
  vehiclePlate: string
  vehicleModel: string
  vehicleColor: string
  eta: number
}

const MOCK_DRIVER_NAMES = [
  "Juan D.",
  "Maria S.",
  "Pedro R.",
  "Ana M.",
  "Carlos T.",
  "Rosa L.",
]

const MOCK_VEHICLE_MODELS_CAR = [
  "Toyota Vios",
  "Honda City",
  "Mitsubishi Mirage",
  "Hyundai Accent",
  "Suzuki Ertiga",
]

const MOCK_VEHICLE_MODELS_MC = [
  "Honda Click 160",
  "Yamaha Mio",
  "Honda PCX",
  "Suzuki Raider",
  "Yamaha Aerox",
]

const MOCK_VEHICLE_COLORS = ["White", "Black", "Silver", "Red", "Blue", "Gray"]

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomPlate(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const l1 = letters[Math.floor(Math.random() * 26)]
  const l2 = letters[Math.floor(Math.random() * 26)]
  const l3 = letters[Math.floor(Math.random() * 26)]
  const num = Math.floor(1000 + Math.random() * 9000)
  return `${l1}${l2}${l3} ${num}`
}

export function generateMockDriver(isMC: boolean = false): MockDriver {
  return {
    name: randomItem(MOCK_DRIVER_NAMES),
    photo: `/api/placeholder/80/80`, // Placeholder
    rating: Number((4.5 + Math.random() * 0.5).toFixed(1)),
    trips: Math.floor(500 + Math.random() * 2000),
    vehiclePlate: randomPlate(),
    vehicleModel: isMC 
      ? randomItem(MOCK_VEHICLE_MODELS_MC) 
      : randomItem(MOCK_VEHICLE_MODELS_CAR),
    vehicleColor: randomItem(MOCK_VEHICLE_COLORS),
    eta: Math.floor(3 + Math.random() * 5),
  }
}

