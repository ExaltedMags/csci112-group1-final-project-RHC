## CHANGES SUMMARY – PROPOSAL VS. IMPLEMENTATION

Integrated Ride-Hailing Application System  
CSCI 112 – NoSQL Capstone  
Group 1 – Transportation / Fintech

---

### 1. High-Level Overview

The original proposal described a **multi-provider ride comparison platform** backed by MongoDB, with collections for `users`, `trips`, `user_history`, `locations`, and `referral_logs`.  

The final implementation:
- Preserves the **core idea and data relationships** (users ↔ trips ↔ referrals),
- Uses MongoDB for all main entities,
- Integrates real geocoding and routing (Mapbox, OpenRouteService),
- And delivers **richer analytics and a more sophisticated UI** than originally specified.

---

### 2. What Changed in the Data Model

#### 2.1 Collections

- **Kept:**
  - `users` – profile + embedded recent history.
  - `trips` – full trip requests, provider quotes, and selection state.
  - `referral_logs` – click-through tracking when users hand off to providers.

- **Removed / Not Implemented:**
  - `locations` collection – replaced by Mapbox geocoding and embedded snapshots.

#### 2.2 Key Schema Differences

- **Users**
  - Proposal: `fullName`, `phoneNumber`, `preferences`, `user_history[]`.
  - Implementation: `name?`, `email`, `history[]`, timestamps.
  - **Reason:** Focus on fields actually used by the app; history array kept small and embedded for quick dashboard reads.

- **Trips**
  - Proposal: `origin`/`destination` as objects `{ locationId, name, lat, lng }`, `chosenProvider`, `requestedAt`.
  - Implementation:
    - `origin`/`destination` as labels (strings),
    - Optional `originLocation`/`destinationLocation` snapshots with `lat`/`lng`,
    - `selectedQuote` (full quote object) instead of `chosenProvider`,
    - `createdAt` / `updatedAt` timestamps.
  - **Reason:** Better alignment with live geocoding, improved analytics, and clearer separation between search and selection.

- **Referral Logs**
  - Proposal: `{ userId, tripId, provider, clickedAt, deviceType }`.
  - Implementation: Adds `providerCode`, `providerName`, `bookedMinFare`, `bookedMaxFare`, `createdAt`, `updatedAt`.
  - **Reason:** Captures richer context at handoff time (which provider, at what fare level, on which device) to support more informative analytics.

---

### 3. What Changed in Behavior and Status Handling

#### 3.1 Trip Status Lifecycle

- **Proposal (implicit):**
  - `pending` → `completed`, or `SEARCHED` → `BOOKED` → `COMPLETED`.

- **Implementation:**
  - Database persists `status: 'SEARCHED'` (after search) and `status: 'BOOKED'` (after provider selection).
  - `COMPLETED` and finer-grained states (DRIVER_ASSIGNED, ON_TRIP, etc.) are **used only in UI simulation**, not persisted to MongoDB.

**Why:**
- Without real provider APIs or callbacks, the system cannot reliably know when a ride has completed.
- Using `BOOKED` as the **terminal persisted state** is honest and reduces fake writes.
- Analytics queries treat **BOOKED trips as completed rides**, and this is explicitly documented.

#### 3.2 Referral Timing

- **Proposal:** Log referral when user proceeds to provider (selection time).
- **Implementation:** Logs referral at **handoff time** (when user clicks “Book” on the handoff screen), after selection has already been made.

**Why:**
- The handoff click is the **actual referral event**—similar to when a user is redirected to a partner site.
- It more accurately models “click-through” as understood in analytics and marketing contexts.

---

### 4. What Changed in Access Patterns and Queries

#### 4.1 Access Patterns

- **User creation / login**
  - Proposal: simple `insertOne`.
  - Implementation: **find-or-create** pattern in `POST /api/auth/demo-login` using `findOne` + conditional `insertOne` + optional `updateOne` (for name).

- **Trip creation**
  - Proposal: insert with embedded origin/destination data.
  - Implementation: `POST /api/trips/search`:
    - Uses Mapbox + OpenRouteService to compute realistic **distance, duration**, and optionally **route geometry**.
    - Computes quotes via **provider adapters** and a surge calculator.
    - Inserts full `TripDbDoc` into `trips`.

- **Provider selection and history update**
  - Implementation in `POST /api/trips/[id]/select`:
    - Updates trip with `selectedQuote` and `status: 'BOOKED'`.
    - Pushes a compact summary into `users.history[]` (capped to last 10).

- **Referral logging**
  - Implementation in `POST /api/trips/[id]/handoff`:
    - Inserts into `referral_logs` with provider, fare band, and device type based on User-Agent.

#### 4.2 Analytics Queries

- **Original proposal:** simple aggregation for “top routes” by origin/destination.

- **Final implementation adds:**
  - **Global analytics (`/api/analytics/global`):**
    - Surge frequency and intensity by provider,
    - Surge patterns by time slot (Rush Hour, Late Night, Off-Peak),
    - Surge by location type (Airport, CBD, Residential),
    - Top routes by volume, average fare, and most popular provider.

  - **User analytics (`/api/analytics/summary`):**
    - Provider statistics (count, average fare),
    - **Savings vs. cheapest quote** (how often and by how much the user “overpays”),
    - Referrals by provider and by device type,
    - Surge impact (total and average “surge fee” paid).

**Why:**  
These analytics leverage the rich `quotes[]` and `selectedQuote` data to **go beyond the original proposal**, making the dashboard more informative and consistent with real ride-hailing metrics.

---

### 5. Key Improvements Over the Original Design

1. **Richer Trip Model**
   - Route geometry and `routeSource` allow **map visualizations** and more realistic analytics.
   - `selectedQuote` preserves full fare and surge data, which is crucial for understanding user behavior.

2. **External Geocoding and Routing**
   - Replacing the `locations` collection with **Mapbox** and **OpenRouteService**:
     - Reduces schema complexity.
     - Provides more accurate and up-to-date location and routing information.

3. **Surge-Aware Pricing and Analytics**
   - Custom surge modeling per provider (GrabPH, Angkas, JoyRideMC).
   - Aggregations that show **where and when surge is most intense**, and for which providers.

4. **Enhanced Referral and Device Analytics**
   - Logging device type and fare band at handoff time supports:
     - Analysis of which channels (mobile vs. desktop) lead to more referrals,
     - Understanding the typical fare level when users choose to book.

5. **User-Centric Savings Insight**
   - The “savings” analytics highlight the **benefit of comparing multiple providers**, aligning directly with the project’s motivation.

6. **Realistic Ride Lifecycle Simulation**
   - Even though statuses are not persisted beyond BOOKED, the front-end simulates:
     - Driver assignment,
     - Driver arrival,
     - Trip in progress and completion,
     - Post-ride feedback.
   - This provides a more engaging demonstration of the app’s **intended end-to-end experience**.

---

### 6. Why Each Major Change Was Made

| Change | Reason |
|--------|--------|
| No `locations` collection | Mapbox already provides high-quality place data; embedding light snapshots in trips is enough. |
| `selectedQuote` instead of `chosenProvider` | Keeps all fare and surge details of the chosen option; unlocks better analytics and UI. |
| BOOKED as terminal persisted status | Honest representation of system control; no fake COMPLETED events without provider callbacks. |
| Extended `referral_logs` schema | Enables fare-aware and device-aware analytics at referral time. |
| Simulated providers and surge | Public APIs are not available; simulation prioritizes **data modeling skills**, as required by CSCI 112. |

---

### 7. Demo Day Talking Points

These are concise points the team can use when presenting the project:

1. **Problem & Value**
   - “Commuters in Metro Manila must manually compare Grab, Angkas, and JoyRide fares. Our app shows all options in one place, with surge-aware pricing and clear comparisons.”

2. **Data Model and NoSQL Design**
   - “We modeled users, trips, and referral logs in MongoDB. Trips store quotes from multiple providers plus the selected quote. Users embed a short history array for fast dashboard reads, while full trips remain in a separate collection for analytics.”

3. **External Integrations**
   - “We integrate Mapbox and OpenRouteService for real geocoding and routing. This allows us to store realistic distances, durations, and even route geometry for map visualization.”

4. **Analytics**
   - “We go beyond basic counts. Our analytics reveal surge patterns by provider, time of day, and location type, plus user-level savings compared to the cheapest available quote.”

5. **Honest Boundaries**
   - “We intentionally treat BOOKED as the terminal status in the database. Without real provider APIs, we don’t fake COMPLETED events. The lifecycle is simulated in the UI only, which we clearly document.”

6. **Improvements Over the Proposal**
   - “Compared to our original design, we removed an unnecessary `locations` collection, added route geometry, implemented surge modeling, and built a more detailed analytics layer. All these decisions were driven by **simplifying writes, improving reads, and enabling meaningful queries**.”

7. **Course Relevance**
   - “Every feature we demo is backed by concrete MongoDB access patterns—`insertOne`, `updateOne`, `find`, and several aggregation pipelines. The project demonstrates not just a UI, but a careful NoSQL schema tailored to our read and write patterns.”

---

### 8. Final Note

The implementation is **functionally complete** relative to the original goals:
- Users can search for trips, compare provider quotes, select a ride, and see their history.
- The system tracks referrals and provides both **user-level** and **platform-level** analytics.

All significant differences between proposal and implementation are documented and justified. This summary, together with `PROPOSAL_AUDIT_REPORT.md` and `UPDATED_PROPOSAL.md`, forms a complete story for the professor about how the design evolved and why the final architecture is stronger than the initial plan.



