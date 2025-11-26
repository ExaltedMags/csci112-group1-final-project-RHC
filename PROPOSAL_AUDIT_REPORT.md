## CSCI 112 Final Project – Proposal vs. Implementation Audit Report

Integrated Ride-Hailing Application System  
Group 1 – Transportation / Fintech Capstone

---

### 1. Purpose and Scope

This report compares the **original schema and query proposal** (see `CSCI 112 Final Project - Group 1 (1).pdf`) with the **actual implementation** in the `csci112-group1-final-project-RHC` codebase.  

It focuses on:
- **Collections and schemas** (fields, types, embedding vs. referencing)
- **API endpoints and MongoDB access patterns**
- **Analytics and aggregation logic**
- **Architectural deviations** from the proposal and the rationale for each

This document is intended as a formal deliverable for CSCI 112, demonstrating that the system design is well understood and that deviations from the proposal are justified and documented.

---

### 2. Collections and Schema Comparison

#### 2.1 Collections Overview

| Collection | Proposal (PDF) | Implementation (Codebase) | Status |
|-----------|----------------|----------------------------|--------|
| `users` | Stores profile, preferences, and embedded `user_history` array | Stores profile and embedded `history` array | Implemented (field names differ) |
| `trips` | Stores trip details: origin/destination snapshots, quotes, `chosenProvider`, `requestedAt`, `status` | Stores trip details: origin/destination labels + optional geo snapshots, quotes, `selectedQuote`, timestamps | Implemented with richer structure |
| `referral_logs` | Tracks click-throughs: `userId`, `tripId`, `provider`, `clickedAt`, `deviceType` | Tracks handoff events with provider and fare context | Implemented with extended fields |
| `locations` | Lookup collection for stable places; trips embed small snapshot | **Not implemented** | Replaced by external geocoding (Mapbox) |

#### 2.2 `users` Collection

**Proposal (conceptual):**
- Fields: `_id`, `email`, `fullName`, `phoneNumber`, `preferences`, `user_history[]`
- `user_history` holds short summaries of recent trips/searches.

**Implementation (TypeScript interface):**

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

**Key differences:**
- History field is named **`history`** (not `user_history`).
- Only stores **trip ID and origin/destination labels plus requestedAt**, not full fare details.
- **`phoneNumber` and `preferences`** are not present in the implementation.

**Impact:**  
The user model is **simpler than proposed**, focusing on what the application actually needs at runtime (name, email, and recent trips). The omission of `preferences` and `phoneNumber` has no impact on current features.

#### 2.3 `trips` Collection

**Proposal (conceptual example):**
- Fields:
  - `_id` (e.g., `"trip_001"`)
  - `userId`
  - `origin` and `destination` objects: `{ locationId, name, lat, lng }`
  - `quotes[]` with provider offers
  - `chosenProvider` (string)
  - `requestedAt` (ISODate)
  - `status` (e.g., `"pending"`, `"completed"`)

**Implementation (TypeScript interfaces and document type):**

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

**Key differences:**
- **Origin/Destination:**
  - Proposal: embedded objects with `locationId`, `name`, `lat`, `lng`.
  - Implementation: top-level **string labels** (`origin`, `destination`) plus **optional** `originLocation`/`destinationLocation` snapshots when geocoding succeeds.
- **Provider selection:**
  - Proposal: `chosenProvider` string.
  - Implementation: **`selectedQuote: IQuote`**, which stores provider, min/max fare, ETA, surge multiplier, and category.
- **Routing:**
  - Proposal: routing not explicitly modeled.
  - Implementation: `routeGeometry` (array of coordinates) and `routeSource` (`'ORS' | 'MAPBOX'`) to support map visualization and analytics.
- **Timestamps:**
  - Proposal: `requestedAt`.
  - Implementation: `createdAt`/`updatedAt` timestamps.

**Impact:**  
The implemented `trips` schema is **richer and more analytics-friendly**. The `selectedQuote` design preserves all relevant fare information for downstream analytics, while `routeGeometry` greatly improves the UX (live route display) and enables spatial analysis.

#### 2.4 `referral_logs` Collection

**Proposal (conceptual):**
- Fields: `_id`, `userId`, `tripId`, `provider`, `clickedAt`, `deviceType`.

**Implementation (TypeScript interface):**

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

**Key differences:**
- Provider stored as both **`providerCode`** and **`providerName`**.
- Logs capture **fare context** (`bookedMinFare`, `bookedMaxFare`) at the time of handoff.
- Uses `createdAt`/`updatedAt` instead of `clickedAt`.

**Impact:**  
The implemented schema supports **richer referral analytics**, allowing the team to analyze typical booked fare levels by provider and device type, beyond simply counting clicks.

#### 2.5 `locations` Collection

**Proposal:**  
- Separate `locations` collection, with trips embedding small snapshots.

**Implementation:**  
- **No `locations` collection.**
- Origin/destination labels and coordinates come from **Mapbox** geocoding APIs at search time and are optionally embedded into the trip document (`originLocation`, `destinationLocation`).

**Impact:**  
Removes the need to pre-manage or cache locations in MongoDB. The responsibility for up-to-date, accurate location data is delegated to Mapbox.

---

### 3. API Endpoints vs. Proposed Operations

#### 3.1 Authentication and Users

**Endpoint:** `POST /api/auth/demo-login`  
**Implementation:**

```6:37:app/api/auth/demo-login/route.ts
const insertDoc = {
  email: normalizedEmail,
  name: name?.trim() || undefined,
  history: [],
  createdAt: now,
  updatedAt: now,
};

const result = await usersCollection.insertOne(insertDoc);
user = { ...insertDoc, _id: result.insertedId };
```

**Proposal expectation:**
- A simple user creation query with preferences and profile details.

**Notes:**
- The implementation uses a **“find or create”** pattern, which is more robust than a one-off insert.
- Preferences (`defaultPaymentMethod`, `defaultProvider`) from the proposal are **not persisted**, because they are not required by the current UI.

#### 3.2 Trip Creation

**Endpoint:** `POST /api/trips/search`  
**Core logic (simplified):**

```51:71:app/api/trips/search/route.ts
const originLabel = body.originPlace?.label ?? body.origin;
const destinationLabel = body.destinationPlace?.label ?? body.destination;
// ...
if (!originLabel || !destinationLabel) {
  return NextResponse.json({ error: 'Origin and destination are required' }, { status: 400 });
}
```

```116:170:app/api/trips/search/route.ts
if (originLatLng && destinationLatLng) {
  const bestRoute = await getBestRoute(originLatLng, destinationLatLng, { loggerPrefix: '[trips-search]' });
  // distanceKm, durationMinutes, geometry, source set from ORS/Mapbox
}
// Fallback to synthetic estimate if routing fails

const createdAt = new Date();
const { quotes } = await getAllQuotes(distanceKm, durationMinutes, resolvedOriginLabel, { hour: createdAt.getHours(), dayOfWeek: createdAt.getDay() });

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
// optional originLocation / destinationLocation / routeGeometry / routeSource
const result = await tripsCollection.insertOne(tripDoc);
```

**Proposal expectation:**
- `insertOne` with embedded origin/destination objects and `requestedAt`.

**Notes:**
- The implementation **adds external route planning (ORS/Mapbox)** and **surge-aware provider quotes**, which were not explicitly spelled out in the original proposal but align with its business goals.

#### 3.3 Provider Selection

**Endpoint:** `POST /api/trips/[id]/select`  
**Implementation:**

```52:71:app/api/trips/[id]/select/route.ts
const selectedQuote = trip.quotes.find((q: IQuote) => q.provider === provider);
// ...
const updatedAt = new Date();
trip.selectedQuote = selectedQuote;
trip.status = 'BOOKED';
trip.updatedAt = updatedAt;

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

**Proposal expectation:**
- `updateOne` to set `chosenProvider` and update `status` (e.g., to `"completed"` later).

**Notes:**
- Status is set to **`'BOOKED'`** and persisted.  
- `COMPLETED` exists in the enum but is only used in **UI simulation**, not persisted by any endpoint.

#### 3.4 Referral Logging

**Endpoint:** `POST /api/trips/[id]/handoff`  
**Implementation:**

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

**Proposal expectation:**
- Insert at the time of click-through with `{userId, tripId, provider, clickedAt, deviceType}`.

**Notes:**
- **Semantic behavior matches**: a new referral log is created when the user clicks “Book” (handoff).
- Implementation **extends** the schema to include fare context and provider labels.

#### 3.5 History and Analytics Endpoints

- `GET /api/history`: Returns recent trips + basic provider aggregation.
- `GET /api/users/[id]/history`: Returns embedded `history` array from `users` collection.
- `GET /api/analytics/summary`: Per-user analytics (provider stats, savings, referrals, surge impact).
- `GET /api/analytics/global`: Global platform analytics (surge patterns and top routes).

These endpoints go **beyond** the original proposal by providing more advanced analytics.

---

### 4. Access Patterns and MongoDB Operations

This section maps real application flows to MongoDB operations.

#### 4.1 User Login / Profile Creation

- **Pattern:** Find or create user by email.
- **Endpoint:** `POST /api/auth/demo-login`.
- **Operations:** `findOne`, `insertOne`, and conditional `updateOne`.

#### 4.2 Create New Trip / Quote Comparison

- **Pattern:** Insert a new trip document when the user performs a search.
- **Endpoint:** `POST /api/trips/search`.
- **Operation:** `insertOne` into `trips` with `status: 'SEARCHED'` and precomputed quotes.

#### 4.3 Select Provider and Update User History

- **Pattern:** Mark a trip as BOOKED and add a short entry to embedded user history.
- **Endpoint:** `POST /api/trips/[id]/select`.
- **Operations:**
  - `updateOne` on `trips` (fields: `selectedQuote`, `status`, `updatedAt`).
  - `updateOne` on `users` with `$push` into `history` (capped by `$slice: -10`).

#### 4.4 Log Referral (Handoff)

- **Pattern:** Log a referral event with device type and fare context.
- **Endpoint:** `POST /api/trips/[id]/handoff`.
- **Operation:** `insertOne` into `referral_logs`.

#### 4.5 Read User History

- **Pattern:** Show recent trips for a user.
- **Endpoints:**
  - `GET /api/history` – uses `trips` collection for up to 20 recent trips.
  - `GET /api/users/[id]/history` – reads embedded `history` array from `users`.
- **Operations:** `find`, `sort`, `limit`, and `findOne`.

#### 4.6 Analytics Patterns

**Global analytics** – `GET /api/analytics/global`:

- **Surge frequency by provider:** `aggregate` with `$unwind: '$quotes'` and `$group` by `quotes.provider`.
- **Surge by time of day:** `$addFields` for `hourOfDay`, classification into `Rush Hour`, `Late Night`, `Off-Peak`.
- **Surge by location type:** Classification into `Airport`, `CBD`, `Residential` based on origin text.
- **Top routes by volume:** `$match` on `status: 'BOOKED'`, group by `originLocation.label`/`destinationLocation.label`, compute `avgFare`, `avgDistance`, and most popular provider.

**User analytics** – `GET /api/analytics/summary`:

- Provider stats per user (count, average fare).
- Savings vs. cheapest available option.
- Referral counts per provider and per device type.
- Surge impact metrics (how much extra was paid due to surge).

---

### 5. Feature-Level Comparison

#### 5.1 Implemented vs. Proposed Features

| Feature | Proposal | Implementation | Notes |
|---------|----------|----------------|-------|
| Trip search with multi-provider quotes | Yes | Yes | Implemented with surge modeling and realistic PH fare matrices. |
| Provider selection and booking | Yes | Yes | BOOKED status persisted; lifecycle simulated. |
| Referral logging | Yes | Yes | Logged at handoff with device type and fare context. |
| Embedded user history | Yes | Yes | `history[]` in `users` documents. |
| Locations collection | Yes | **No** | Replaced by external Mapbox geocoding. |
| Basic analytics (e.g., top routes) | Yes | Yes (global & per-user) | Implemented with more detail than proposal. |
| Real-time provider APIs | Implicitly assumed | **Simulated providers** | Public booking APIs unavailable; quotes are modeled rather than fetched live. |

#### 5.2 Advanced Features Beyond Proposal

- Surge pricing analytics (provider-level, time-of-day, location-based).
- Savings analysis (how much over the cheapest option the user paid).
- Route geometry visualization with ORS/Mapbox.
- Referral breakdowns by device type and provider.
- Detailed lifecycle simulation with driver card and progress bar.

---

### 6. Deviations and Design Rationale

Below are the **most important deviations** from the original proposal and the **justification** for each.

#### 6.1 No `locations` Collection

- **Proposal:** A dedicated `locations` collection, with trips embedding a snapshot.
- **Implementation:** No such collection; locations come from Mapbox.
- **Reasoning:**
  - Using Mapbox for geocoding eliminates the need to manage location data manually.
  - Location accuracy and naming conventions are maintained by an external, production-grade service.
  - Trips still embed **lightweight snapshots** (`originLocation`, `destinationLocation`) when geocoding succeeds, so reads remain simple.

#### 6.2 `selectedQuote` vs. `chosenProvider`

- **Proposal:** `chosenProvider` as a string.
- **Implementation:** `selectedQuote` storing the full `IQuote` object.
- **Reasoning:**
  - Preserves all fare-related fields: Min/Max fare, ETA, surge multiplier, category.
  - Supports richer analytics without re-deriving which quote was chosen.
  - Reflects real-world ride-hailing apps, where a “selected option” is a detailed quote, not just a provider name.

#### 6.3 BOOKED as Terminal Persisted Status (COMPLETED in UI Only)

- **Proposal:** Status transitions such as `pending` → `completed` (and/or `SEARCHED → BOOKED → COMPLETED`).
- **Implementation:** Database uses `SEARCHED` and `BOOKED`. The UI simulates progression through additional ride states (e.g., DRIVER_ASSIGNED, ON_TRIP, COMPLETED) without persisting them back to MongoDB.
- **Reasoning:**
  - Without real provider APIs, the application cannot know when a trip truly completes.
  - **BOOKED is the last event we control** and is therefore the honest terminal state in the database.
  - UI simulation still demonstrates lifecycle concepts without fabricating events in the database.
  - All analytics use **BOOKED trips as a proxy** for completed rides, which is clearly documented in the code comments.

#### 6.4 Extended Referral Log Schema

- **Proposal:** Minimal referral log with `provider`, `clickedAt`, `deviceType`.
- **Implementation:** Adds `providerCode`, `providerName`, and `bookedMinFare`/`bookedMaxFare`.
- **Reasoning:**
  - Enables analysis of how **expensive** referrals are by provider or device type.
  - `providerCode` (e.g., `GrabPH`) is used internally, while `providerName` (e.g., `Grab`) is used for readable analytics and UI.
  - Fare context makes the analytics dashboard more meaningful for platform-level decisions.

#### 6.5 Simulated Provider APIs and Surge Logic

- **Proposal:** Assumes public APIs for Grab, Angkas, and JoyRide.
- **Implementation:** Simulated providers with PH-specific fare matrices and surge modeling.
- **Reasoning:**
  - Real public booking APIs are not available for this academic project.
  - Simulation allows the team to focus on **data modeling and analytics**, which is the core of CSCI 112.
  - Surge calculator encodes realistic patterns (rush hour, CBD vs. residential, airport, weekday vs. weekend).

---

### 7. Potential Confusions and How They Are Addressed

1. **Status enum includes `COMPLETED`, but DB never writes it.**
   - Clarification: `COMPLETED` is used only in **front-end ride lifecycle simulation**. The DB uses `BOOKED` as terminal for analytics.

2. **Proposal mentions `locations` collection, but none exists.**
   - Clarification: Mapbox geocoding plus embedded location snapshots implement the same concept without a dedicated collection.

3. **User preferences are missing.**
   - Clarification: They were not needed for the implemented flows. They can be added later without breaking the current schema.

4. **Referral logs include fare fields that were not in the proposal.**
   - Clarification: These are additive and do not violate the original intent. They support more informative analytics.

---

### 8. Conclusion

Overall, the implementation **matches the spirit and most of the structure** of the original proposal:

- The **core collections** (`users`, `trips`, `referral_logs`) exist and follow the proposed relationship patterns (one-to-many between users and trips, and users and referral logs; embedded short history in users).
- The application implements **all major use cases**: trip search, provider comparison, selection, referral logging, user history, and analytics.
- Deviations from the proposal (e.g., removal of `locations` collection, use of `selectedQuote`, BOOKED as terminal status, simulated providers) are **well-justified design decisions** that improve realism, maintainability, and analytical richness.

This report can be used by instructors to verify that the group has:
- Thought carefully about NoSQL schema design,
- Understood and implemented appropriate access patterns,
- And documented the evolution from initial proposal to final working system.



