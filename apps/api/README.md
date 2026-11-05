# LifeLink CityHealth API

Live Bed and Equipment Availability with ABHA.  
College prototype (Distributed Systems, KIIT University).  
Synthetic data only. **Not a medical device; the apps always show "In an emergency call 112".**

---

## 1. Architectural Principles & Distributed Systems Decisions

This service implements a resilient modular monolith designed to maintain data consistency and high availability across distributed clients (patient mobile app, hospital dashboards, city administration).

| Distributed Concept | Implementation | Viva Explanation / Rationale |
| :--- | :--- | :--- |
| **Row-Level Pessimistic Locking** | `SELECT ... FOR UPDATE` on `bed_inventory` & `bed_requests` | When 50 patients or staff contend for the final bed in a critical ward (e.g. ICU), normal `UPDATE` statements produce race conditions and overbooking. Pessimistic row locks serialize access at the database storage engine. |
| **Derived Availability Invariant** | `free = total - occupied - reserved - cleaning - maintenance` | `free` beds are strictly derived at query time and never stored as a denormalized counter. DB `CHECK` constraints prevent negative values or over-allocations, returning HTTP 409 `INVALID_BED_STATE`. |
| **Autonomous Lease Reclamation** | `pg_try_advisory_lock` in background hold expiry worker | Patient bed reservations hold for exactly 15 minutes. Every 30 seconds, a background worker acquires the advisory lock `'BED_HOLD_EXPIRY_JOB'` and expires overdue holds without duplicate releasing or distributed deadlocks across multiple replicas. |
| **Optimistic Concurrency Control** | `version` integer column on `bed_inventory` | Prevents stale hospital station dashboards from overwriting newer bed updates made by triage nurses. Telemetry events broadcast the updated version number. |
| **Single-Flight Request Coalescing** | In-flight promise map on geospatial search | Under sudden traffic spikes (e.g. city-wide emergency), hundreds of concurrent queries for the same coordinates could cause a cache stampede on PostGIS. Single-flight guarantees that only one PostGIS query executes, sharing the result with all pending requests. |
| **Exactly-Once Semantics** | `Idempotency-Key` header & `idempotency_keys` table | On unreliable mobile and 4G networks, client retries of mutating requests (e.g. bed booking or staff counter adjustments) can cause duplicate resource allocation. Retries with the identical key return the exact cached response without re-executing logic. |
| **Distributed Pub/Sub & WebSockets** | Socket.IO + `@socket.io/redis-adapter` with SSE Fallback | Realtime room broadcasts (`hospital:{id}`, `city`, `user:{id}`). If clients operate behind cellular proxies that block WebSocket upgrade requests, the system provides a resilient unidirectional Server-Sent Events stream (`GET /api/v1/events`). |
| **Resilient Cache Fallback** | Redis 7 + direct PostgreSQL fallback | The cache tier is never a Single Point of Failure (SPOF). If Redis crashes or experiences network partitioning, the API seamlessly routes reads directly to PostgreSQL, logging degraded status rather than returning HTTP 500 errors. |
| **Token Family Reuse Detection** | Rotating Refresh Tokens with `family_id` | Refresh tokens are rotated on every use. If an already-revoked refresh token is replayed (indicating a token theft or replay attack across distributed nodes), the entire token family is immediately revoked, protecting user identities. |
| **Immutable Append-Only Ledgers** | Database triggers preventing `UPDATE` and `DELETE` | `bed_ledger`, `equipment_status_log`, and `audit_log` cannot be modified or deleted. Any inventory adjustment is recorded as a mathematical delta, allowing full state reconstruction and non-repudiation. |
| **Multi-Tenant Isolation** | `requireTenant` middleware & JWT tenant claims | Hospital staff and admins are strictly scoped to their assigned `hospital_id`. The tenant ID is extracted from the cryptographic JWT signature, never from untrusted client request bodies. |
| **Masked ABHA Privacy** | Conditional ABHA projection in queries | Hospital staff see masked ABHA numbers (e.g. `**-****-****-1234`) and verified legal names ONLY if the patient explicitly opted into `shareAbha = true`. |

---

## 2. Prerequisites & Quick Start

- **Node.js**: `20.x` or higher
- **Docker & Docker Compose** (PostgreSQL 16 with PostGIS & Redis 7)

### Step 1: Launch Infrastructure with Docker Compose
```bash
docker compose -f infra/docker-compose.yml up -d
```
This starts:
- PostgreSQL 16 with PostGIS on port `5432` (healthchecked)
- Redis 7 on port `6379` (healthchecked)
- CityHealth API on port `8080` (healthchecked)

### Step 2: Install Dependencies Locally (For Development)
```bash
cd apps/api
npm install
```

### Step 3: Run Database Migrations
```bash
npm run migrate:up
```

### Step 4: Seed Synthetic Data (Bhubaneswar Network)
```bash
npm run seed
```
This populates:
- 25 synthetic hospitals positioned around Bhubaneswar coordinates `(20.2961, 85.8245)`
- Full bed inventory across 10 ward types (ICU, NICU, PICU, HDU, CCU, GENERAL, SEMI_PRIVATE, PRIVATE, EMERGENCY, ISOLATION)
- Medical equipment inventory (Ventilators, CT, MRI, Dialysis, Incubators, Operation Theatres)
- Standard emergency conditions (Stroke, Premature Baby, Dengue Severe, Cardiac Arrest, Poly-Trauma, etc.)
- 1 City Admin from `SEED_ADMIN_EMAIL` (`cityadmin.bhubaneswar@gmail.com`)
- Pre-registered hospital staff and admins for AIIMS and KIMS

### Step 5: Start Development Server
```bash
npm run dev
```
The server will be live on `http://localhost:8080`.

---

## 3. Running Test Suite

Run the full Jest integration test suite covering authentication, token rotation, reuse detection, tenant isolation, idempotency, row-level locking, high-concurrency bed allocation, equipment telemetry, PostGIS discovery, and realtime broadcasting:
```bash
npm test
```

---

## 4. API Endpoints Reference

### Health & Readiness
- `GET /health` - Liveness probe (uptime)
- `GET /ready` - Readiness probe (checks PostgreSQL & Redis)

### Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/google` - Sign in via Google ID token `{ idToken, clientType: "web" | "android" | "ios" }`
- `POST /api/v1/auth/refresh` - Refresh access token `{ refreshToken }` (with reuse detection)
- `POST /api/v1/auth/logout` - Revoke active refresh token family
- `GET /api/v1/auth/users/me` - Authenticated user profile

### Administration (`/api/v1/admin`)
- `POST /api/v1/admin/staff` - Pre-register hospital staff by Gmail (City Admin & Hospital Admin)
- `GET /api/v1/admin/users` - Paginated user directory with role and status filtering (City Admin only)
- `PATCH /api/v1/admin/users/:id/status` - Suspend or activate user accounts (City Admin only)

### Hospitals (`/api/v1/hospitals`)
- `GET /api/v1/hospitals` - PostGIS spatial hospital discovery (`lat`, `lng`, `radiusKm`, `type`, `specialty`, `q`, `sort`, `page`, `limit`) with 30s Redis cache
- `GET /api/v1/hospitals/:id` - Detailed hospital view with live bed breakdown and equipment summary
- `POST /api/v1/hospitals` - Onboard new hospital (City Admin only, seeds 10 ward inventory rows)
- `PATCH /api/v1/hospitals/:id` - Update hospital profile (Hospital staff or City Admin)
- `PATCH /api/v1/hospitals/:id/verify` - Verify or suspend hospital status (City Admin only)

### Bed Inventory & Reservations (`/api/v1/hospitals/:id/beds`, `/api/v1/bed-requests`)
- `GET /api/v1/hospitals/:id/beds` - Live ward inventory with derived free beds
- `POST /api/v1/hospitals/:id/beds/:wardType/adjust` - Atomic counter adjustment with `SELECT ... FOR UPDATE` (Requires `Idempotency-Key`)
- `PUT /api/v1/hospitals/:id/beds/:wardType` - Direct counter replacement (Hospital staff)
- `POST /api/v1/hospitals/:id/beds/:wardType/expected-discharges` - Record expected patient discharge timestamps
- `POST /api/v1/bed-requests` - Patient bed reservation (15-min hold, 409 if full, requires `Idempotency-Key`)
- `GET /api/v1/bed-requests/my` - Patient's own reservations
- `GET /api/v1/bed-requests/hospital/:id` - Hospital's incoming bed requests (displays masked ABHA if shared)
- `POST /api/v1/bed-requests/:id/decide` - Hospital staff decision (`APPROVE` or `REJECT`)
- `POST /api/v1/bed-requests/:id/cancel` - Patient cancels active reservation (bed returned to free pool)
- `POST /api/v1/bed-requests/:id/admit` - Staff formally admits patient (converts hold into admission)
- `GET /api/v1/city-summary` - City-wide aggregated bed summary for municipal authorities

### Medical Equipment (`/api/v1/hospitals/:id/equipment`, `/api/v1/equipment`)
- `GET /api/v1/hospitals/:id/equipment` - List hospital equipment with operational status and criticality
- `GET /api/v1/hospitals/:id/equipment/summary` - Equipment counts grouped by type and status
- `POST /api/v1/hospitals/:id/equipment` - Register new equipment (Hospital staff)
- `GET /api/v1/equipment` - Cross-hospital equipment discovery by PostGIS radius (`lat`, `lng`, `radiusKm`, `type`, `status`)
- `GET /api/v1/equipment/:id` - Equipment details with hospital location
- `PATCH /api/v1/equipment/:id/status` - Update operational status (`AVAILABLE`, `IN_USE`, `MAINTENANCE`, `FAULTY`, `OFFLINE`). Transitions on `CRITICAL` units trigger immediate hospital room alert and security audit log.

### Realtime Telemetry (`/api/v1/events` & Socket.IO)
- `GET /api/v1/events?hospitalId=` - Server-Sent Events (SSE) fallback stream
- WebSocket Rooms: `hospital:{hospitalId}` (staff stations), `city` (city summaries), `user:{userId}` (patient holds)
