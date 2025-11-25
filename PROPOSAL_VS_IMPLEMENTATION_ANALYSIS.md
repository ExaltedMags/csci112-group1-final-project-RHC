# Proposal Queries vs. Implementation Analysis

## Data Model Summary

### User Model (`models/User.ts`)
- **Fields**: `name`, `email`, `history[]`, `createdAt`, `updatedAt`
- **History Entry**: `{ tripId, originName, destinationName, requestedAt }`
- **Missing from proposal**: `phoneNumber`, `preferences` object

### Trip Model (`models/Trip.ts`)
- **Fields**: 
  - `origin` (string label)
  - `destination` (string label)
  - `originLocation?: { label, lat, lng }`
  - `destinationLocation?: { label, lat, lng }`
  - `quotes: IQuote[]`
  - `selectedQuote?: IQuote` (not `chosenProvider`)
  - `status: 'SEARCHED' | 'BOOKED' | 'COMPLETED'`
  - `userId` (string)
  - `createdAt`
- **Missing from proposal**: `locationId` concept, `requestedAt` field (we use `createdAt`)

### ReferralLog Model (`models/ReferralLog.ts`)
- **Fields**: `userId`, `tripId`, `providerCode`, `providerName`, `bookedMinFare`, `bookedMaxFare`, `deviceType`, `createdAt`, `updatedAt`
- **Matches proposal**: Has `deviceType` field ✓

---

## Query-by-Query Analysis

### **Query 1 – Create New Trip Document**

**Proposal Query:**
```javascript
db.trips.insertOne({
  userId,
  origin: { locationId, name, lat, lng },
  destination: { ... },
  quotes: [...],
  chosenProvider: null,
  requestedAt,
  status: "pending"
})
```

**Current Implementation:**
- **Location**: `app/api/trips/search/route.ts` (POST handler, line 187)
- **Code**: `Trip.create(tripData)` where `tripData` includes:
  - `origin` (string label)
  - `destination` (string label)
  - `originLocation?: { label, lat, lng }` (optional)
  - `destinationLocation?: { label, lat, lng }` (optional)
  - `quotes: IQuote[]`
  - `status: 'SEARCHED'` (not "pending")
  - `userId` (string)
  - `createdAt` (auto-set, not `requestedAt`)

**Differences vs Proposal:**
- ❌ No `locationId` field (we use string labels + optional lat/lng objects)
- ❌ `origin`/`destination` are strings, not objects with `{ locationId, name, lat, lng }`
- ❌ No `chosenProvider` field (we use `selectedQuote?: IQuote` later)
- ❌ Status is `"SEARCHED"` not `"pending"`
- ❌ Uses `createdAt` instead of `requestedAt`
- ✅ `quotes` array is present
- ✅ `userId` is stored

**Recommendation:**
**Update proposal query** to match actual schema:
```javascript
db.trips.insertOne({
  userId: "user123",
  origin: "Makati City",
  destination: "BGC Taguig",
  originLocation: { label: "Makati City", lat: 14.5547, lng: 121.0244 },
  destinationLocation: { label: "BGC Taguig", lat: 14.5506, lng: 121.0508 },
  quotes: [
    { provider: "grab", minFare: 150, maxFare: 200, eta: 15, ... },
    { provider: "angkas", minFare: 80, maxFare: 120, eta: 12, ... }
  ],
  selectedQuote: null, // or undefined
  status: "SEARCHED",
  distanceKm: 5.2,
  durationMinutes: 18,
  createdAt: new Date()
})
```

---

### **Query 2 – Add Trip Details to User History + Mark Trip Completed**

**Proposal Query:**
```javascript
// Part A: Update user history
db.users.updateOne(
  { _id },
  { $push: { user_history: { tripId, originName, destinationName, chosenProvider, totalFare, requestedAt } } }
)

// Part B: Mark trip completed
db.trips.updateOne(
  { _id },
  { $set: { chosenProvider: "grab", status: "completed" } }
)
```

**Current Implementation:**

**Part A (User History):**
- **Location**: `app/api/trips/[id]/select/route.ts` (POST handler, lines 50-73)
- **Code**: Updates user history when provider is **selected** (not when completed)
- **Fields stored**: `{ tripId, originName, destinationName, requestedAt }`
- **Missing**: `chosenProvider`, `totalFare` in history entry

**Part B (Mark Trip Completed):**
- **Location**: ❌ **NOT IMPLEMENTED** - No API endpoint updates trip status to `"COMPLETED"`
- **Frontend**: `app/trip/[id]/progress/progress-view.tsx` shows COMPLETED status in UI lifecycle, but doesn't persist to DB

**Differences vs Proposal:**
- ❌ User history is updated at **selection time** (BOOKED), not completion time
- ❌ History entry missing `chosenProvider` and `totalFare` fields
- ❌ History field is `history` not `user_history`
- ❌ Trip status is never set to `"COMPLETED"` in database
- ❌ We use `selectedQuote.provider` not `chosenProvider` field
- ✅ `originName`, `destinationName`, `requestedAt` are stored

**Recommendation:**
**Option A (Update Proposal):** Reflect that history is added at selection time, and completion status update is not implemented:
```javascript
// At selection time (when status becomes BOOKED):
db.users.updateOne(
  { _id },
  { $push: { history: { tripId, originName, destinationName, requestedAt } } }
)

db.trips.updateOne(
  { _id },
  { $set: { selectedQuote: { provider: "grab", ... }, status: "BOOKED" } }
)

// Note: Status update to "COMPLETED" is not currently implemented in the API
```

**Option B (Update App):** Add minimal code to mark trip as COMPLETED:
- Add a POST endpoint `/api/trips/[id]/complete` that sets `status: "COMPLETED"`
- Call this endpoint when the progress view reaches the COMPLETED step
- Optionally update user history entry to include `selectedProvider` and `totalFare` at completion time

---

### **Query 3 – Update Trip Status**

**Proposal Query:**
```javascript
db.trips.updateOne({ _id }, { $set: { status: "Completed" } })
```

**Current Implementation:**
- **Location**: `app/api/trips/[id]/select/route.ts` (line 47) - sets status to `"BOOKED"`
- **Missing**: No endpoint updates status to `"COMPLETED"`

**Differences vs Proposal:**
- ❌ Status values are uppercase: `"SEARCHED"`, `"BOOKED"`, `"COMPLETED"` (not `"Completed"`)
- ❌ No API endpoint exists to set status to `"COMPLETED"`

**Recommendation:**
**Update proposal query** to match actual status enum:
```javascript
db.trips.updateOne({ _id }, { $set: { status: "COMPLETED" } })
```

**Optional app update**: Add `/api/trips/[id]/complete` endpoint to persist COMPLETED status.

---

### **Query 4 – Create Referral Log**

**Proposal Query:**
```javascript
db.referral_logs.insertOne({
  userId,
  tripId,
  provider,
  clickedAt,
  deviceType
})
```

**Current Implementation:**
- **Location**: `app/api/trips/[id]/handoff/route.ts` (POST handler, lines 86-94)
- **Code**: `ReferralLog.create({ userId, tripId, providerCode, providerName, bookedMinFare, bookedMaxFare, deviceType })`
- **Timing**: Created at **handoff time** (when user clicks "Book" button), not at selection time

**Differences vs Proposal:**
- ❌ Field is `providerCode` and `providerName` (not just `provider`)
- ❌ Includes `bookedMinFare` and `bookedMaxFare` (not in proposal)
- ❌ Uses `createdAt` (from timestamps) not `clickedAt`
- ✅ Has `deviceType` field ✓
- ✅ Has `userId` and `tripId` ✓

**Recommendation:**
**Update proposal query** to match actual schema:
```javascript
db.referral_logs.insertOne({
  userId: "user123",
  tripId: ObjectId("..."),
  providerCode: "grab",
  providerName: "Grab",
  bookedMinFare: 150,
  bookedMaxFare: 200,
  deviceType: "mobile", // or "tablet", "desktop"
  createdAt: new Date()
})
```

---

### **Query 5 – Create User Profile**

**Proposal Query:**
```javascript
db.users.insertOne({
  email,
  fullName,
  phoneNumber,
  preferences: {...},
  user_history: []
})
```

**Current Implementation:**
- **Location**: `app/api/auth/demo-login/route.ts` (POST handler, lines 25-29)
- **Code**: `User.create({ email, name, history: [] })`
- **Note**: Uses find-or-create pattern (finds existing user by email first)

**Differences vs Proposal:**
- ❌ Field is `name` not `fullName`
- ❌ No `phoneNumber` field
- ❌ No `preferences` object
- ❌ History field is `history` not `user_history`

**Recommendation:**
**Update proposal query** to match actual schema:
```javascript
db.users.insertOne({
  email: "user@example.com",
  name: "John Doe", // optional
  history: []
})
// Note: createdAt and updatedAt are auto-added by timestamps
```

**Optional app update**: If phoneNumber and preferences are needed, add them to the User schema.

---

### **Query 6 – Read User Profile**

**Proposal Query:**
```javascript
db.users.findOne({ _id })
```

**Current Implementation:**
- **Location**: Multiple places:
  - `app/api/users/[id]/history/route.ts` (GET handler, line 14) - finds user and returns history
  - `app/api/auth/demo-login/route.ts` (line 21) - finds user by email
- **Code**: `User.findById(id)` or `User.findOne({ email })`

**Differences vs Proposal:**
- ✅ Matches proposal (standard Mongoose findById/findOne)

**Recommendation:**
**No changes needed** - implementation matches proposal intent.

---

### **Query 7 – Aggregation for Dashboard Analytics (Top Routes)**

**Proposal Query:**
```javascript
db.trips.aggregate([
  { $match: { status: "completed" } },
  { $group: { 
      _id: { origin: "$origin.name", destination: "$destination.name" },
      count: { $sum: 1 }
    }
  },
  { $sort: { count: -1 } },
  { $limit: 5 }
])
```

**Current Implementation:**
- **Location**: `app/api/analytics/summary/route.ts` (GET handler)
- **Existing aggregations**:
  1. Provider stats (count, avgFare) - lines 29-39
  2. Savings analytics - lines 53-96
  3. Referral stats by provider - lines 99-113
  4. Referral stats by device type - lines 116-130
- **Missing**: Top routes aggregation (grouping by origin/destination pairs)

**Differences vs Proposal:**
- ❌ No "top routes" aggregation exists
- ❌ Status is `"COMPLETED"` (uppercase) not `"completed"`
- ❌ `origin` and `destination` are strings, not objects with `.name` property
- ✅ Other analytics exist (provider stats, savings, referrals)

**Recommendation:**
**Option A (Update Proposal):** Document existing analytics instead:
```javascript
// Provider stats aggregation (currently implemented):
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

**Option B (Update App):** Add top routes aggregation to analytics endpoint:
```javascript
// Add to app/api/analytics/summary/route.ts
const topRoutes = await Trip.aggregate([
  { $match: { status: "COMPLETED", userId } },
  {
    $group: {
      _id: { origin: "$origin", destination: "$destination" },
      count: { $sum: 1 }
    }
  },
  { $sort: { count: -1 } },
  { $limit: 5 }
]);
```

---

## Summary of Mismatches

### Schema Differences:
1. **Trip model**: Uses `origin`/`destination` (strings) + optional `originLocation`/`destinationLocation` objects, not `origin: { locationId, name, lat, lng }`
2. **Trip model**: Uses `selectedQuote` (IQuote object) not `chosenProvider` (string)
3. **Trip model**: Status values are `"SEARCHED"`, `"BOOKED"`, `"COMPLETED"` (uppercase)
4. **User model**: History field is `history` not `user_history`
5. **User model**: Missing `phoneNumber` and `preferences` fields
6. **ReferralLog**: Has additional fields (`providerCode`, `providerName`, `bookedMinFare`, `bookedMaxFare`) beyond proposal

### Logic Differences:
1. **User history**: Added at **selection time** (BOOKED), not completion time
2. **Referral logging**: Happens at **handoff time**, not selection time
3. **Trip completion**: Status is never set to `"COMPLETED"` in database (only in UI simulation)
4. **Top routes analytics**: Not implemented

### Missing Features:
1. No API endpoint to mark trip as COMPLETED
2. No top routes aggregation query
3. User history entry doesn't include `chosenProvider` or `totalFare`

---

## Recommended Action Plan

### For Proposal Update (Recommended):
Update all 7 queries in the proposal to match the actual implementation:
- Use actual field names (`selectedQuote` not `chosenProvider`, `history` not `user_history`)
- Use actual status values (`"SEARCHED"`, `"BOOKED"`, `"COMPLETED"`)
- Reflect actual timing (history at selection, referral at handoff)
- Document existing analytics instead of top routes (or add top routes as a future enhancement)

### For App Updates (Optional):
If you want the app to more closely match the original proposal:
1. **Add trip completion endpoint**: `/api/trips/[id]/complete` to set `status: "COMPLETED"`
2. **Add top routes aggregation**: Add to `/api/analytics/summary/route.ts`
3. **Enhance user history**: Optionally add `selectedProvider` and `totalFare` to history entries at completion time

