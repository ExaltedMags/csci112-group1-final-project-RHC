## GROUP 1 – FINAL PROJECT (UPDATED IMPLEMENTATION)

**Project Title:** Integrated Ride-Hailing Application System  
**Industry:** Transportation / Fintech  
**Course:** CSCI 112 – NoSQL Databases  

Azucena, Bicomong, Dy, Magadia, Socorro, Vergabera

---

## I. Introduction / Statement of the Problem

Ride-hailing services rose to prominence in Metro Manila, especially with the convenience they offer to Filipinos living in urban areas. Given their heavy dependence on digital payment methods such as GCash or GrabPay, companies in this sector sit at the intersection of the **fintech** and **transportation** industries.

When it comes to setting fares, ride-hailing applications use a similar model. A base price is set for each trip based on trip duration and distance. A **multiplier component** is then applied to adjust the price according to market conditions such as traffic or weather. As a result, consumers are inclined to find the best offer—either the trip that offers the **fastest** or **cheapest** service. Doing this manually across multiple apps is time-consuming and error-prone, especially during peak hours.

We identify this as a gap that can be addressed through a dedicated **multi-provider comparison platform** for ride-hailing in Metro Manila.

---

## II. Chosen Business Process

Similar to how Trivago aggregates hotel offers, our system aggregates **ride-hailing options**. A user enters an origin and destination, and our application:

- Fetches or computes **quotes** from multiple providers (Grab, Angkas, JoyRideMC).
- Shows estimated **waiting time**, **trip duration**, and **fare ranges**.
- Allows the user to **select** a provider.
- Simulates handing off the user to the provider’s app and tracks a **referral log**.

The goal is to help Filipino commuters quickly compare options based on:
- Time (ETA and total duration)
- Budget (min/max fare, surge multiplier)

The platform does **not** actually book rides; instead, it simulates the booking and focuses on the **data modeling, analytics, and user experience** aspects.

---

## III. Objectives

1. **Provide accurate, real-time fare comparisons** based on distance, duration, and simulated surge conditions (time of day, location, demand patterns).
2. **Help Filipino travelers weigh options** across ride-hailing applications, based on either time or budget preferences.
3. **Make ride-booking more convenient and efficient** by centralizing comparison and offering a clear, modern UI for decision-making.
4. **Design and implement a MongoDB schema** that supports the above use cases, with clearly defined access patterns and analytics queries.

---

## IV. Business Process Diagram

The high-level business process remains the same as in the original proposal:

- User opens app → enters origin & destination.
- System computes/estimates provider quotes.
- User chooses a provider.
- System logs the selection and a referral event at handoff.
- Analytics aggregate trip and referral data over time.

**Note:** See the original proposal PDF for the diagram. The logical flow remains consistent; the implementation details (e.g., use of Mapbox & OpenRouteService) have been refined.

---

## V. Database Access Patterns

### A. Collections Overview (Implemented)

The implemented schema uses three main collections:

- **`users`**
  - Stores account information (email, optional name).
  - Embeds a small `history[]` array with summaries of recent trips.

- **`trips`**
  - Stores detailed trip requests, quotes, and selection status.
  - Embeds optional geospatial snapshots and route geometry.

- **`referral_logs`**
  - Stores click-through events when users proceed to a provider.
  - Captures provider metadata, fare at booking time, and device type.

There is **no `locations` collection**; instead, we rely on **Mapbox** for location search and geocoding (see Section C).

### B. Schema Design (Implemented)

#### 1. Users Collection

**TypeScript Interface (Actual Implementation):**

```3:17:models/User.ts
export interface IUserHistoryEntry {
  tripId: ObjectId;
  originName: string;
  destinationName: string;
  requestedAt: Date;
}

export interface IUser {
  _id?: ObjectId;
  name?: string;
  email: string;
  history: IUserHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}
```

**Document Purpose:**
- Stores user profile data (`email`, optional `name`).
- Embeds a **short history** list with recent trips (`history[]`).
- Each history entry references a trip by `_id` and stores a textual summary.

**Example User Document (JSON-style):**

```json
{
  "_id": ObjectId("643f1a1234567890abcd0001"),
  "email": "kodi@example.com",
  "name": "Kodi Magadia",
  "history": [
    {
      "tripId": ObjectId("665f1a1234567890abcd0001"),
      "originName": "Ateneo de Manila University",
      "destinationName": "Bonifacio Global City",
      "requestedAt": ISODate("2025-11-10T08:30:00Z")
    }
  ],
  "createdAt": ISODate("2025-11-01T10:00:00Z"),
  "updatedAt": ISODate("2025-11-10T08:31:00Z")
}
```

**Design Notes:**
- Keeps the **user dashboard fast** by embedding 10 most recent trips directly in the user document (capped with `$slice: -10`).
- The **full trip details** still live in the `trips` collection.

#### 2. Trips Collection

**TypeScript Interfaces (Actual Implementation):**

```3:47:models/Trip.ts
export type TripStatus = 'SEARCHED' | 'BOOKED' | 'COMPLETED';

export interface IQuote {
  provider: string;
  fare?: number;
  minFare: number;
  maxFare: number;
  eta: number;
  surgeMultiplier: number;
  isSurge: boolean;
  category: '4-wheel' | '2-wheel';
}

export interface TripLocation extends TripCoordinate {
  label: string;
}

export interface TripCore {
  origin: string;
  destination: string;
  distanceKm: number;
  durationMinutes: number;
  originLocation?: TripLocation;
  destinationLocation?: TripLocation;
  routeGeometry?: TripRouteGeometry;
  routeSource?: RouteSource;
  status: TripStatus;
  quotes: IQuote[];
  selectedQuote?: IQuote;
  userId: string;
}
```

```53:57:models/Trip.ts
export interface TripDbDoc extends TripCore {
  _id?: ObjectId;
  createdAt: Date;
  updatedAt?: Date;
}
```

**Document Purpose:**
- Represents a **trip search request** and its associated provider quotes.
- Stores:
  - Human-readable **origin/destination labels**.
  - Optional **geocoded locations** with `lat`/`lng`.
  - **Route geometry** (array of coordinates) and source (`ORS` or `MAPBOX`).
  - An array of **simulated provider quotes** (`quotes[]`).
  - A single **`selectedQuote`** when the user chooses a provider.
  - **Status**: `'SEARCHED'` or `'BOOKED'` (COMPLETED is used only in UI simulation).

**Example Trip Document (simplified):**

```json
{
  "_id": ObjectId("665f1a1234567890abcd0001"),
  "userId": "643f1a1234567890abcd0001",
  "origin": "Ateneo de Manila University",
  "destination": "Bonifacio Global City",
  "distanceKm": 12.5,
  "durationMinutes": 28,
  "originLocation": {
    "label": "Ateneo de Manila University",
    "lat": 14.6397,
    "lng": 121.0783
  },
  "destinationLocation": {
    "label": "Bonifacio Global City",
    "lat": 14.5491,
    "lng": 121.0463
  },
  "quotes": [
    {
      "provider": "GrabPH",
      "minFare": 250,
      "maxFare": 275,
      "eta": 6,
      "surgeMultiplier": 1.3,
      "isSurge": true,
      "category": "4-wheel"
    },
    {
      "provider": "JoyRideMC",
      "minFare": 220,
      "maxFare": 235,
      "eta": 5,
      "surgeMultiplier": 1.1,
      "isSurge": true,
      "category": "2-wheel"
    }
  ],
  "selectedQuote": {
    "provider": "GrabPH",
    "minFare": 250,
    "maxFare": 275,
    "eta": 6,
    "surgeMultiplier": 1.3,
    "isSurge": true,
    "category": "4-wheel"
  },
  "status": "BOOKED",
  "createdAt": ISODate("2025-11-10T08:30:00Z"),
  "updatedAt": ISODate("2025-11-10T08:31:00Z")
}
```

#### 3. Referral Logs Collection

**TypeScript Interface (Actual Implementation):**

```3:16:models/ReferralLog.ts
export interface IReferralLog {
  _id?: ObjectId;
  userId: string;
  tripId: ObjectId;
  providerCode: string;
  providerName: string;
  bookedMinFare: number;
  bookedMaxFare: number;
  deviceType: DeviceType;
  createdAt: Date;
  updatedAt: Date;
}
```

**Document Purpose:**
- Records **handoff events** when the user clicks “Book” to continue in a provider’s app.
- Includes:
  - `userId` and `tripId` linking back to the user and trip.
  - `providerCode` (e.g., `GrabPH`) and `providerName` (e.g., `Grab`).
  - Fare band (`bookedMinFare`, `bookedMaxFare`) at the time of selection.
  - `deviceType` (mobile, tablet, desktop) derived from the User-Agent header.

**Example Referral Log Document:**

```json
{
  "_id": ObjectId("66af1a1234567890abcd0001"),
  "userId": "643f1a1234567890abcd0001",
  "tripId": ObjectId("665f1a1234567890abcd0001"),
  "providerCode": "GrabPH",
  "providerName": "Grab",
  "bookedMinFare": 250,
  "bookedMaxFare": 275,
  "deviceType": "mobile",
  "createdAt": ISODate("2025-11-10T08:31:00Z"),
  "updatedAt": ISODate("2025-11-10T08:31:00Z")
}
```

---

### C. Design Decisions & Deviations from Original Proposal

#### Why We Do Not Have a `locations` Collection

- The original proposal suggested a separate `locations` collection with snapshots embedded in trips.
- The implementation instead uses **Mapbox** (`lib/mapbox.ts`) to:
  - Search places by text query,
  - Geocode origin and destination to coordinates,
  - Provide up-to-date labels and addresses.
- Trips embed optional **`originLocation`** and **`destinationLocation`** when geocoding succeeds, which gives the same benefit (fast reads) without manually managing a locations collection.

#### Why We Use `selectedQuote` Instead of `chosenProvider`

- The proposal used a simple `chosenProvider` string.
- The implemented model stores a full **`selectedQuote: IQuote`**:
  - This preserves **min/max fare**, **ETA**, **surge multiplier**, and **category**.
  - It enables analytics such as savings vs. cheapest quote and surge impact.
- This aligns better with real ride-hailing flows, where a user chooses a specific **offer**, not just a brand.

#### Why `BOOKED` Is the Terminal Persisted Status

- The **status enum** in `TripStatus` includes `'SEARCHED' | 'BOOKED' | 'COMPLETED'`.
- In the database, **only `SEARCHED` and `BOOKED`** are used.
- The front-end simulates a ride lifecycle (e.g., DRIVER_ASSIGNED, ON_TRIP, COMPLETED) for UX purposes, but no additional statuses are persisted.
- **Reason:**
  - There are no real provider APIs or callbacks to tell us when the ride actually completes.
  - Using `BOOKED` as the terminal state is **honest about system boundaries**.
  - All analytics treat **BOOKED trips as completed rides**; this is documented in the analytics code comments.

#### Field Naming Conventions

- The proposal used `user_history` and `fullName`.
- Implementation uses:
  - `history` for embedded history array,
  - `name` instead of `fullName`,
  - `createdAt` and `updatedAt` consistently across collections.
- These align with common Node.js / MongoDB conventions and reduce verbosity without changing the semantics.

---

## VI. Access Patterns (Implemented)

Each access pattern below lists:
- A natural language description,
- The API route that implements it,
- The CRUD classification,
- The corresponding MongoDB operation(s),
- Where it is used in the UI.

### Pattern 1: Create New Trip (Search & Quote Generation)

- **Description:** User enters origin and destination; system geocodes, calculates distance/duration, computes surge-aware quotes, and inserts a new trip.
- **API Route:** `POST /api/trips/search`
- **Type:** Write
- **MongoDB Code:**

```153:170:app/api/trips/search/route.ts
const createdAt = new Date();
const { quotes } = await getAllQuotes(
  distanceKm,
  durationMinutes,
  resolvedOriginLabel,
  { hour: createdAt.getHours(), dayOfWeek: createdAt.getDay() }
);

const tripDoc: TripDbDoc = {
  origin: resolvedOriginLabel,
  destination: resolvedDestinationLabel,
  distanceKm,
  durationMinutes,
  quotes,
  status: 'SEARCHED',
  userId: body.userId,
  createdAt,
};

const result = await tripsCollection.insertOne(tripDoc);
return NextResponse.json({ tripId: String(result.insertedId) });
```

- **Usage:** Triggered from the home page (`/`) when the user searches for rides.

### Pattern 2: Select Provider & Update History

- **Description:** User selects a provider; the system marks the trip as BOOKED, stores the selected quote, and pushes a summary entry to the user’s history.
- **API Route:** `POST /api/trips/[id]/select`
- **Type:** Update
- **MongoDB Code (Trip Update):**

```52:71:app/api/trips/[id]/select/route.ts
const selectedQuote = trip.quotes.find((q: IQuote) => q.provider === provider);
// ...
const updatedAt = new Date();

await tripsCollection.updateOne(
  { _id: trip._id },
  {
    $set: {
      selectedQuote,
      status: 'BOOKED',
      updatedAt,
    },
  }
);
```

- **MongoDB Code (User History Update):**

```76:103:app/api/trips/[id]/select/route.ts
const summaryEntry = {
  tripId: trip._id,
  originName: trip.origin,
  destinationName: trip.destination,
  requestedAt: trip.createdAt ?? new Date(),
};

await usersCollection.updateOne(
  { _id: new ObjectId(finalUserId) },
  {
    $set: { updatedAt },
    $push: {
      history: {
        $each: [summaryEntry],
        $slice: -10,
      },
    },
    $setOnInsert: { createdAt: new Date() },
  },
  { upsert: false }
);
```

- **Usage:** Triggered from the trip quotes page (`/trip/[id]`) when user clicks “Select”.

### Pattern 3: Log Referral (Handoff to Provider)

- **Description:** When the user decides to proceed with booking, the app logs a referral event including provider and fare information, as well as device type.
- **API Route:** `POST /api/trips/[id]/handoff`
- **Type:** Write
- **MongoDB Code:**

```93:106:app/api/trips/[id]/handoff/route.ts
const now = new Date();
await referralLogsCollection.insertOne({
  userId: finalUserId,
  tripId: trip._id,
  providerCode: selectedQuote.provider,
  providerName: PROVIDER_LABELS[selectedQuote.provider] || selectedQuote.provider,
  bookedMinFare: selectedQuote.minFare,
  bookedMaxFare: selectedQuote.maxFare,
  deviceType: deviceType,
  createdAt: now,
  updatedAt: now,
});
```

- **Usage:** Triggered from the handoff screen (`/handoff/[provider]/[tripId]`) when user presses “Book”.

### Pattern 4: Read User History (Recent Trips)

- **Description:** Fetch recent trips for the current user to show in the history page.
- **API Route:** `GET /api/history?userId=...`
- **Type:** Read
- **MongoDB Code:**

```25:30:app/api/history/route.ts
const historyDocs = await tripsCollection
  .find({ userId })
  .sort({ createdAt: -1 })
  .limit(20)
  .toArray();
```

- **Usage:** Powers the `/history` page, which lists searches and bookings with provider and fare details.

### Pattern 5: Read Embedded User History

- **Description:** Retrieve the embedded `history[]` from the users collection for a given user.
- **API Route:** `GET /api/users/[id]/history`
- **Type:** Read
- **MongoDB Code:**

```18:27:app/api/users/[id]/history/route.ts
const usersCollection = await getUsersCollection();
const user = await usersCollection.findOne({ _id: new ObjectId(id) });

return NextResponse.json({
  userId: user._id.toString(),
  history: user.history,
});
```

- **Usage:** Used by the front-end to show a quick summary of a user’s last trips.

### Pattern 6: Global Analytics – Surge Patterns and Top Routes

- **Description:** Compute platform-level analytics such as:
  - How often each provider uses surge pricing,
  - Surge behavior by time of day and location type,
  - Top routes by volume and average fare.
- **API Route:** `GET /api/analytics/global`
- **Type:** Read / Aggregation
- **MongoDB Code (examples):**

Provider surge frequency:

```55:72:app/api/analytics/global/route.ts
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
```

Top routes:

```226:248:app/api/analytics/global/route.ts
const topRoutesAggregation = await tripsCollection
  .aggregate([
    { $match: {
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
  ])
  .toArray();
```

### Pattern 7: User-Level Analytics – Savings and Referrals

- **Description:** Compute per-user analytics including:
  - Provider preferences,
  - Savings vs. the cheapest available option,
  - Referral distribution by provider and device type,
  - Surge impact on fare.
- **API Route:** `GET /api/analytics/summary?userId=...`
- **Type:** Read / Aggregation
- **MongoDB Code (examples):**

Provider stats:

```31:42:app/api/analytics/summary/route.ts
const providerStats = await tripsCollection
  .aggregate([
    { $match: { status: 'BOOKED', userId } },
    {
      $group: {
        _id: "$selectedQuote.provider",
        count: { $sum: 1 },
        avgFare: { $avg: "$selectedQuote.minFare" },
      },
    },
    { $sort: { count: -1 } },
  ])
  .toArray();
```

Savings vs. cheapest option:

```58:88:app/api/analytics/summary/route.ts
const savingsStats = await tripsCollection
  .aggregate([
    { 
      $match: { 
        status: 'BOOKED', 
        userId,
        selectedQuote: { $exists: true },
      },
    },
    {
      $addFields: {
        cheapestFare: { $min: "$quotes.minFare" },
        selectedFare: "$selectedQuote.minFare",
      },
    },
    {
      $addFields: {
        overpay: { 
          $max: [ 0, { $subtract: ["$selectedFare", "$cheapestFare"] } ],
        },
      },
    },
    {
      $group: {
        _id: null,
        totalTrips: { $sum: 1 },
        tripsWithOverpay: {
          $sum: { $cond: [ { $gt: ["$overpay", 0] }, 1, 0 ] },
        },
        totalOverpay: { $sum: "$overpay" },
      },
    },
  ])
  .toArray();
```

---

## VII. Sample Queries (Working Examples)

Below are summarized versions of the **working MongoDB operations** from the codebase, rewritten in a style close to the original proposal.

### Query 1: Create New Trip Document

**Location:** `app/api/trips/search/route.ts`  
**Operation Type:** `insertOne`

Conceptual shell-equivalent:

```javascript
db.trips.insertOne({
  userId: "643f1a1234567890abcd0001",
  origin: "Ateneo de Manila University",
  destination: "Bonifacio Global City",
  distanceKm: 12.5,
  durationMinutes: 28,
  originLocation: { label: "Ateneo de Manila University", lat: 14.6397, lng: 121.0783 },
  destinationLocation: { label: "Bonifacio Global City", lat: 14.5491, lng: 121.0463 },
  quotes: [
    { provider: "GrabPH", minFare: 250, maxFare: 275, eta: 6, surgeMultiplier: 1.3, isSurge: true, category: "4-wheel" },
    { provider: "JoyRideMC", minFare: 220, maxFare: 235, eta: 5, surgeMultiplier: 1.1, isSurge: true, category: "2-wheel" }
  ],
  status: "SEARCHED",
  createdAt: new Date()
});
```

### Query 2: Select Provider and Update History

**Location:** `app/api/trips/[id]/select/route.ts`  
**Operation Type:** `updateOne` (trips) + `updateOne` (users)

Conceptual shell-equivalent:

```javascript
db.trips.updateOne(
  { _id: ObjectId("665f1a1234567890abcd0001") },
  {
    $set: {
      selectedQuote: {
        provider: "GrabPH",
        minFare: 250,
        maxFare: 275,
        eta: 6,
        surgeMultiplier: 1.3,
        isSurge: true,
        category: "4-wheel"
      },
      status: "BOOKED",
      updatedAt: new Date()
    }
  }
);

db.users.updateOne(
  { _id: ObjectId("643f1a1234567890abcd0001") },
  {
    $set: { updatedAt: new Date() },
    $push: {
      history: {
        $each: [{
          tripId: ObjectId("665f1a1234567890abcd0001"),
          originName: "Ateneo de Manila University",
          destinationName: "Bonifacio Global City",
          requestedAt: ISODate("2025-11-10T08:30:00Z")
        }],
        $slice: -10
      }
    }
  }
);
```

### Query 3: Create Referral Log

**Location:** `app/api/trips/[id]/handoff/route.ts`  
**Operation Type:** `insertOne`

Shell-equivalent:

```javascript
db.referral_logs.insertOne({
  userId: "643f1a1234567890abcd0001",
  tripId: ObjectId("665f1a1234567890abcd0001"),
  providerCode: "GrabPH",
  providerName: "Grab",
  bookedMinFare: 250,
  bookedMaxFare: 275,
  deviceType: "mobile",
  createdAt: new Date(),
  updatedAt: new Date()
});
```

### Query 4: Global Provider Surge Statistics

**Location:** `app/api/analytics/global/route.ts`  
**Operation Type:** `aggregate`

Shell-equivalent:

```javascript
db.trips.aggregate([
  { $match: { quotes: { $exists: true, $ne: [] } } },
  { $unwind: "$quotes" },
  {
    $group: {
      _id: "$quotes.provider",
      totalQuotes: { $sum: 1 },
      surgeQuotes: { $sum: { $cond: [ { $gt: ["$quotes.surgeMultiplier", 1] }, 1, 0 ] } },
      avgMultiplier: { $avg: "$quotes.surgeMultiplier" },
      maxMultiplier: { $max: "$quotes.surgeMultiplier" }
    }
  },
  { $sort: { totalQuotes: -1 } }
]);
```

### Query 5: User Savings vs. Cheapest Option

**Location:** `app/api/analytics/summary/route.ts`  
**Operation Type:** `aggregate`

Shell-equivalent (simplified):

```javascript
db.trips.aggregate([
  { $match: { status: "BOOKED", userId: "643f1a1234567890abcd0001", selectedQuote: { $exists: true } } },
  {
    $addFields: {
      cheapestFare: { $min: "$quotes.minFare" },
      selectedFare: "$selectedQuote.minFare"
    }
  },
  {
    $addFields: {
      overpay: { $max: [0, { $subtract: ["$selectedFare", "$cheapestFare"] }] }
    }
  },
  {
    $group: {
      _id: null,
      totalTrips: { $sum: 1 },
      tripsWithOverpay: { $sum: { $cond: [ { $gt: ["$overpay", 0] }, 1, 0 ] } },
      totalOverpay: { $sum: "$overpay" }
    }
  }
]);
```

---

## VIII. Application Architecture (Implemented)

### Tech Stack

- **Next.js 14** (App Router, server components + client components)
- **TypeScript**
- **MongoDB Atlas** with the official Node.js driver
- **Mapbox**:
  - SearchBox and Forward Geocoding for location search
  - Directions API as fallback for routing
- **OpenRouteService (ORS)**:
  - Primary routing (distance/duration, route geometry)
- **Leaflet** + Mapbox tiles:
  - Interactive map visualizations (search results, handoff, progress)
- **Tailwind CSS** + **shadcn/ui**:
  - UI components and responsive design

### Architecture Components

- **API Layer (`app/api/*`):**
  - Organizes endpoints by feature: `trips`, `analytics`, `history`, `auth`, `places`.
  - Uses `lib/mongodb.ts` for connection pooling and typed collections.

- **Domain Models (`models/*.ts`):**
  - Typed interfaces (`IUser`, `TripDbDoc`, `IReferralLog`) shared between API and server-side logic.

- **Integration Layer (`lib/*`):**
  - `lib/mapbox.ts`: location search and routing fallback.
  - `lib/openrouteservice.ts`: primary routing and geometry decoding.
  - `lib/route-planner.ts`: coordinates ORS and Mapbox to choose the best route.
  - `lib/providers/adapters.ts`: provider-specific fare computation with surge modeling.
  - `lib/providers/surge-calculator.ts`: surge probability and multiplier per provider.
  - `lib/serializers.ts`: serialization for trips sent to the client.

- **UI Layer (`app/*`, `components/*`):**
  - Pages: `/`, `/trip/[id]`, `/handoff/[provider]/[tripId]`, `/trip/[id]/progress`, `/history`, `/analytics`.
  - Shared components: `RideMap`, provider logos, history and analytics visualizations.

### External Services

- **Mapbox:**
  - Location autocomplete and geocoding (`searchPlaces`, `geocodePlace`).
  - Directions fallback when ORS fails, with full route geometry.

- **OpenRouteService:**
  - Primary route engine for distance and duration.
  - Flexible; we parse and normalize its geometry format.

- **MongoDB Atlas:**
  - Stores all application data (`users`, `trips`, `referral_logs`).

### Why This Architecture

- Balances **realistic external integrations** (Mapbox, ORS) with the constraints of an academic project (no real provider APIs).
- Keeps **MongoDB schemas clean and focused** on the core data: users, trips, and referrals.
- Supports both **operational queries** (reads/writes supporting UI) and **analytical queries** (aggregations) using the same collections.

---

## IX. Analytics Implementation

### User-Level Analytics (`/history`, `/analytics`)

- **History page (`/history`):**
  - Recent trips with provider logos, fares, statuses, and “favorite provider”.
  - Summary cards:
    - Total trips,
    - Favorite provider,
    - Average fare,
    - Savings (overpay) statistics,
    - Referral counts and “handoffs”.
  - Powered by `GET /api/history` and `GET /api/analytics/summary`.

### Platform-Level Analytics (`/analytics`)

- **Analytics page (`/analytics`):**
  - Provider performance comparison (market share, surge frequency, average and max multipliers).
  - Surge patterns by **time of day** and **location type** (Airport / CBD / Residential).
  - Top routes by volume with average fare and distance.
  - Key insights: automatically generated narrative ("Rush hour has X% more surge", "Airport pickups average Yx surge").
  - Powered by `GET /api/analytics/global`.

### Advanced Features Beyond Proposal

- Surge pricing analysis across providers, time slots, and location types.
- Savings calculator: how much more users pay compared to the cheapest available quote.
- Route popularity tracking and association with preferred providers.
- Referral analytics broken down by provider and device type (mobile vs. desktop).
- Ride lifecycle simulation and feedback modal, which enriches the UX side of the project.

---

## X. Features Implemented

### Core Features

- **Trip search with multi-provider quotes**
  - Distance/duration from ORS/Mapbox or heuristic estimates.
  - Min/max fares and ETAs with surge multipliers.

- **Provider selection and booking simulation**
  - Selecting a quote sets `selectedQuote` and `status: 'BOOKED'`.
  - Embedded user history is updated at selection time.

- **Referral tracking at handoff**
  - Logs `userId`, `tripId`, `providerCode`, fare range, and `deviceType`.

- **User trip history**
  - Recent trips from `trips` collection (up to 20).
  - Short summaries embedded inside `users.history`.

- **Analytics dashboards**
  - Per-user analytics (favorites, savings, referrals, surge impact).
  - Global analytics (surge patterns, top routes, provider stats).

### Enhanced Features (Beyond Proposal)

- Surge pricing analysis by:
  - Provider,
  - Time of day,
  - Location category.
- Savings analysis per user to highlight benefit of comparing fares.
- Map-based route visualization with live route geometry.
- Device-type analytics for referral events.
- UI lifecycle simulation (ride progress, driver card, feedback).

---

## XI. Conclusion

This updated proposal reflects the **actual implemented system**, which:

- Remains faithful to the **original problem statement and business process**,  
- Implements the **core collections and access patterns** discussed in class,  
- And adds several **realistic enhancements**:
  - External geocoding and routing,
  - Surge-aware pricing simulations,
  - Rich analytics at both user and platform levels.

All major deviations from the original schema (e.g., absence of `locations` collection, use of `selectedQuote`, and BOOKED as terminal status) are **deliberate design decisions**, each justified in terms of technical feasibility, data modeling best practices, and the course’s learning goals.

This document, along with the audit and summary reports, is ready for submission as the final updated design for the CSCI 112 capstone.



