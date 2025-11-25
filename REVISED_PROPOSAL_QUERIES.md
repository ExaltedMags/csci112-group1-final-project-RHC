# Revised MongoDB Queries for Proposal

These queries match the **actual implementation** and can be used to update the proposal document.

---

## 1. Create New Trip Document

```javascript
db.trips.insertOne({
  userId: "user123",
  origin: "Makati City",
  destination: "BGC Taguig",
  originLocation: {
    label: "Makati City",
    lat: 14.5547,
    lng: 121.0244
  },
  destinationLocation: {
    label: "BGC Taguig",
    lat: 14.5506,
    lng: 121.0508
  },
  quotes: [
    {
      provider: "grab",
      minFare: 150,
      maxFare: 200,
      eta: 15,
      surgeMultiplier: 1.0,
      isSurge: false,
      category: "4-wheel"
    },
    {
      provider: "angkas",
      minFare: 80,
      maxFare: 120,
      eta: 12,
      surgeMultiplier: 1.0,
      isSurge: false,
      category: "2-wheel"
    }
  ],
  selectedQuote: null,
  status: "SEARCHED",
  distanceKm: 5.2,
  durationMinutes: 18,
  createdAt: new Date()
})
```

**Implementation**: `app/api/trips/search/route.ts` (POST)

---

## 2. Add Trip to User History + Mark Trip as BOOKED

```javascript
// Part A: Update user history (happens at selection time)
db.users.updateOne(
  { _id: ObjectId("user123") },
  {
    $push: {
      history: {
        tripId: ObjectId("trip456"),
        originName: "Makati City",
        destinationName: "BGC Taguig",
        requestedAt: new Date()
      }
    }
  }
)

// Part B: Mark trip as BOOKED (happens at selection time)
db.trips.updateOne(
  { _id: ObjectId("trip456") },
  {
    $set: {
      selectedQuote: {
        provider: "grab",
        minFare: 150,
        maxFare: 200,
        eta: 15,
        surgeMultiplier: 1.0,
        isSurge: false,
        category: "4-wheel"
      },
      status: "BOOKED"
    }
  }
)
```

**Implementation**: `app/api/trips/[id]/select/route.ts` (POST)

**Note**: User history is updated at **selection time** (when status becomes BOOKED), not at completion time.

---

## 3. Update Trip Status to COMPLETED

```javascript
db.trips.updateOne(
  { _id: ObjectId("trip456") },
  { $set: { status: "COMPLETED" } }
)
```

**Implementation**: ❌ **Not currently implemented in API** (only shown in UI simulation)

**Note**: To implement this, add a POST endpoint `/api/trips/[id]/complete` that performs this update.

---

## 4. Create Referral Log

```javascript
db.referral_logs.insertOne({
  userId: "user123",
  tripId: ObjectId("trip456"),
  providerCode: "grab",
  providerName: "Grab",
  bookedMinFare: 150,
  bookedMaxFare: 200,
  deviceType: "mobile", // or "tablet", "desktop"
  createdAt: new Date(),
  updatedAt: new Date()
})
```

**Implementation**: `app/api/trips/[id]/handoff/route.ts` (POST)

**Note**: Referral log is created at **handoff time** (when user clicks "Book" button to redirect to provider), not at selection time.

---

## 5. Create User Profile

```javascript
db.users.insertOne({
  email: "user@example.com",
  name: "John Doe", // optional
  history: [],
  createdAt: new Date(),
  updatedAt: new Date()
})
```

**Implementation**: `app/api/auth/demo-login/route.ts` (POST)

**Note**: The actual implementation uses a find-or-create pattern (finds existing user by email first).

---

## 6. Read User Profile

```javascript
db.users.findOne({ _id: ObjectId("user123") })
```

**Implementation**: 
- `app/api/users/[id]/history/route.ts` (GET) - finds by ID
- `app/api/auth/demo-login/route.ts` (POST) - finds by email

---

## 7. Aggregation for Dashboard Analytics

### A. Provider Statistics (Currently Implemented)

```javascript
db.trips.aggregate([
  { $match: { status: "BOOKED", userId: "user123" } },
  {
    $group: {
      _id: "$selectedQuote.provider",
      count: { $sum: 1 },
      avgFare: { $avg: "$selectedQuote.minFare" }
    }
  },
  { $sort: { count: -1 } }
])
```

**Implementation**: `app/api/analytics/summary/route.ts` (GET)

### B. Top Routes (Not Currently Implemented - Optional Addition)

```javascript
db.trips.aggregate([
  { $match: { status: "COMPLETED", userId: "user123" } },
  {
    $group: {
      _id: {
        origin: "$origin",
        destination: "$destination"
      },
      count: { $sum: 1 }
    }
  },
  { $sort: { count: -1 } },
  { $limit: 5 }
])
```

**Implementation**: ❌ **Not currently implemented**

**Note**: To implement this, add this aggregation to `app/api/analytics/summary/route.ts`.

### C. Savings Analytics (Currently Implemented)

```javascript
db.trips.aggregate([
  {
    $match: {
      status: "BOOKED",
      userId: "user123",
      selectedQuote: { $exists: true }
    }
  },
  {
    $addFields: {
      cheapestFare: { $min: "$quotes.minFare" },
      selectedFare: "$selectedQuote.minFare"
    }
  },
  {
    $addFields: {
      overpay: {
        $max: [0, { $subtract: ["$selectedFare", "$cheapestFare"] }]
      }
    }
  },
  {
    $group: {
      _id: null,
      totalTrips: { $sum: 1 },
      tripsWithOverpay: {
        $sum: { $cond: [{ $gt: ["$overpay", 0] }, 1, 0] }
      },
      totalOverpay: { $sum: "$overpay" }
    }
  }
])
```

**Implementation**: `app/api/analytics/summary/route.ts` (GET)

### D. Referral Statistics by Provider (Currently Implemented)

```javascript
db.referral_logs.aggregate([
  { $match: { userId: "user123" } },
  {
    $group: {
      _id: "$providerCode",
      count: { $sum: 1 }
    }
  },
  { $sort: { count: -1 } }
])
```

**Implementation**: `app/api/analytics/summary/route.ts` (GET)

### E. Referral Statistics by Device Type (Currently Implemented)

```javascript
db.referral_logs.aggregate([
  { $match: { userId: "user123" } },
  {
    $group: {
      _id: "$deviceType",
      count: { $sum: 1 }
    }
  },
  { $sort: { count: -1 } }
])
```

**Implementation**: `app/api/analytics/summary/route.ts` (GET)

---

## Key Differences from Original Proposal

1. **Field Names**:
   - `selectedQuote` (object) instead of `chosenProvider` (string)
   - `history` instead of `user_history`
   - `origin`/`destination` (strings) + optional `originLocation`/`destinationLocation` objects

2. **Status Values**: `"SEARCHED"`, `"BOOKED"`, `"COMPLETED"` (uppercase)

3. **Timing**:
   - User history added at **selection time** (BOOKED), not completion
   - Referral log created at **handoff time**, not selection

4. **Additional Fields**:
   - ReferralLog includes `providerCode`, `providerName`, `bookedMinFare`, `bookedMaxFare`
   - Trip includes `distanceKm`, `durationMinutes`, `routeGeometry`, `routeSource`

5. **Missing Features**:
   - No API endpoint to set trip status to COMPLETED
   - Top routes aggregation not implemented (but can be added easily)

