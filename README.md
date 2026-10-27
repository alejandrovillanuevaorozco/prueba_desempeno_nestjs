# FleetCore API — Vehicle Fleet Maintenance Management System

[![NestJS](https://img.shields.io/badge/NestJS-12.0-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TypeORM](https://img.shields.io/badge/TypeORM-0.3-FE0803?logo=typeorm&logoColor=white)](https://typeorm.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Jest](https://img.shields.io/badge/Jest-Coverage_%3E_60%25-C21325?logo=jest&logoColor=white)](https://jestjs.io/)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI_3.0-85EA2D?logo=swagger&logoColor=black)](http://localhost:3000/api/docs)

---

## Author & Clan Information
* **Developer (Coder):** Alejandro Villanueva Orozco
* **Clan:** NODE AM
* **Repository:** [prueba_desempeno_nestjs](https://github.com/alejandrovillanuevaorozco/prueba_desempeno_nestjs.git)

---

## 1. Overview & Business Domain

**FleetCore** is a mission-critical fleet maintenance tracking and management platform designed to eliminate data duplication, automate vehicle availability synchronization, optimize technician dispatching, and preserve an immutable audit trail of all preventive and corrective interventions.

### Key Highlights
* **Strict Layered Architecture:** Presentation Layer (Controllers, DTOs, Guards, Filters, Interceptors), Business/Domain Layer (Services & Invariants), and Persistence Layer (TypeORM Entities & Repositories).
* **Enterprise Security:** bcrypt password hashing, Role-Based Access Control (`ADMIN`, `TECHNICIAN`), JWT authentication, and header-based `x-api-key` validation for external B2B partners.
* **ACID Transactions:** Full database transaction wrapping via TypeORM `DataSource.transaction` ensures vehicle status (`AVAILABLE`, `IN_MAINTENANCE`, `INACTIVE`) and maintenance state transitions (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`) never desynchronize.
* **Concurrency Locking:** Employs PostgreSQL **Pessimistic Write Locks** (`PESSIMISTIC_WRITE`) to prevent mechanic double-booking race conditions.
* **Idempotent Seeder:** Single command initialization (`npm run seed`) that safely handles repeated executions without producing duplicate records or primary key collision errors.

---

## 2. Technical Defense & Concurrency Analysis (Viva Cheatsheet)

### 2.1 Race Conditions in Mechanic Assignment (Double-Booking)
* **The Risk:** If two managers simultaneously schedule maintenance for the same technician at the exact same millisecond, concurrent queries would both see zero active jobs for that technician, allowing both transactions to insert and double-book the technician.
* **The Solution:** The system implements **Pessimistic Locking** (`setLock('pessimistic_write')`) on the `Mechanic` record within a database transaction. The first request locks the row; the second request is forced to wait until the first commits. Upon acquiring the lock, the second transaction re-evaluates active jobs, detects the newly scheduled job, and immediately aborts with `HTTP 409 Conflict`. Additionally, composite index `(mechanic_id, status)` optimizes query lookup time to $O(1)$.

### 2.2 ACID Transactions in State Changes
* **The Risk:** Advancing a maintenance to `IN_PROGRESS` requires simultaneously changing the vehicle status to `IN_MAINTENANCE` (or to `AVAILABLE` upon `COMPLETED`). Without transactional boundaries, a network blip or constraint violation on the second update would leave the vehicle marked `AVAILABLE` while work is actively being performed.
* **The Solution:** Both entity updates are executed inside an atomic transaction managed by TypeORM. If any step fails (e.g. invalid final mileage or missing closure fields), `rollbackTransaction()` is executed automatically, ensuring total state consistency.

### 2.3 Idempotency in Database Seeding
* **The Risk:** Executing `npm run seed` multiple times in CI/CD or local setup could generate duplicate entries or abort with uniqueness violations (`23505`).
* **The Solution:** All seeder routines verify natural unique keys (`email` for users and mechanics, `plate` for vehicles) prior to insertion or update existing records. Executing the script once or ten times yields the exact same deterministic dataset.

### 2.4 Live Changes & Layer Selection in NestJS
* **DTOs & Validation Pipes:** Structural payload checks, types, enums, min/max ranges (`class-validator`).
* **Guards:** Authentication (`JwtAuthGuard`, `ApiKeyGuard`) and Authorization (`RolesGuard`).
* **Interceptors:** Uniform success response wrapping (`TransformInterceptor`).
* **Exception Filters:** Global error handling mapping PostgreSQL error codes (`23505` to 409, `23503` to 400) to ensure **HTTP 500 is never leaked** (`HttpExceptionFilter`).
* **Services:** Pure domain logic, state machines, business invariant enforcement, and transaction management.
* **Controllers:** Thin orchestration routing requests and delegating to services.

---

## 3. Maintenance State Machine

```mermaid
stateDiagram-v2
    [*] --> SCHEDULED: Create Maintenance (Vehicle AVAILABLE, Mechanic ACTIVE, Workshop ACTIVE)
    SCHEDULED --> IN_PROGRESS: Start Work (Transaction: Vehicle -> IN_MAINTENANCE)
    SCHEDULED --> CANCELLED: Cancel Job (Terminal State)
    IN_PROGRESS --> COMPLETED: Finalize (Requires workDone, finalCost > 0, completedAt, finalMileage >= initial; Vehicle -> AVAILABLE & updates odometer)
    IN_PROGRESS --> CANCELLED: Cancel Job (Transaction: Vehicle resets to AVAILABLE)
    COMPLETED --> [*]: Terminal State (Immutable historical record)
    CANCELLED --> [*]: Terminal State (Cannot transition to IN_PROGRESS or COMPLETED)
```

---

## 4. Quick Start with Docker (Recommended)

### Prerequisites
* Docker Engine 20+
* Docker Compose v2+

### 1. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 2. Start PostgreSQL & API Services
Launch the entire stack using Docker Compose:
```bash
docker compose up -d --build
```

### 3. Run Database Seeder inside the Container
```bash
docker compose exec app npm run seed
```

### 4. Verify API Health
Open your browser or run:
```bash
curl http://localhost:3000/api/docs
```

To stop containers:
```bash
docker compose down
```

---

## 5. Local Development Setup (Without Docker)

### Prerequisites
* Node.js v20.x or v22.x
* PostgreSQL 14+ running locally on port 5432

### Steps
1. **Clone repository:**
   ```bash
   git clone https://github.com/alejandrovillanuevaorozco/prueba_desempeno_nestjs.git
   cd prueba_desempeno_nestjs
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure `.env` file:**
   ```bash
   cp .env.example .env
   ```
   *(Ensure `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_NAME` match your local PostgreSQL configuration).*

4. **Build TypeScript:**
   ```bash
   npm run build
   ```

5. **Seed database:**
   ```bash
   npm run seed
   ```

6. **Start development server:**
   ```bash
   npm run start:dev
   ```

---

## 6. Seed Data & Test Credentials

The database seeder (`npm run seed`) provisions the mandatory baseline dataset:

### 6.1 Users & Authentication

| Role | Email | Password | Associated Entity |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@fleetcore.com` | `FleetCore2026!` | Full administrative access |
| **TECHNICIAN** | `technician1@fleetcore.com` | `FleetCore2026!` | Linked to Mechanic: Carlos Pérez |
| **TECHNICIAN** | `technician2@fleetcore.com` | `FleetCore2026!` | Linked to Mechanic: Laura Gómez |

### 6.2 Mechanics

| Name | Email | Specialty | Status | Linked User |
| :--- | :--- | :--- | :---: | :--- |
| **Carlos Pérez** | `carlos.perez@fleetcore.com` | Diesel Engines & Transmission | `ACTIVE` | `technician1@fleetcore.com` |
| **Laura Gómez** | `laura.gomez@fleetcore.com` | Brakes & Electrical Systems | `ACTIVE` | `technician2@fleetcore.com` |
| **Mario Restrepo** | `mario.restrepo@fleetcore.com` | Suspension & Steering | `INACTIVE` | None |

### 6.3 Workshops

| Name | Address | Status |
| :--- | :--- | :---: |
| **Taller Central FleetCore** | Av. Industrial #45-12, Bogotá | `ACTIVE` |
| **Taller Auxiliar Sur** | Calle 68 Sur #10-40, Soacha | `INACTIVE` |

### 6.4 Vehicles

| Plate | Brand | Model | Year | Mileage | Status | Associated Maintenance |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **ABC123** | Chevrolet | NPR | 2022 | 45,000 km | `AVAILABLE` | Historical `COMPLETED` maintenance |
| **XYZ789** | Hino | Dutro | 2021 | 62,000 km | `AVAILABLE` | None (Ready for assignment) |
| **DEF456** | Kenworth | T680 | 2023 | 83,000 km | `IN_MAINTENANCE` | Active `IN_PROGRESS` maintenance |
| **OLD001** | Ford | Cargo | 2010 | 310,000 km | `INACTIVE` | None (Decommissioned) |

---

## 7. Interactive API Documentation (Swagger)

Full interactive OpenAPI / Swagger UI is available at:

📍 **[http://localhost:3000/api/docs](http://localhost:3000/api/docs)**

### How to Authenticate in Swagger:
1. Execute `POST /auth/login` using `admin@fleetcore.com` and `FleetCore2026!`.
2. Copy the returned `accessToken`.
3. Click the green **Authorize** button at the top right of the Swagger UI.
4. Enter the token in the **JWT (http, Bearer)** field and click **Authorize**.

---

## 8. External Integration (`x-api-key`)

External partners can query vehicle status and completed maintenance history via header authentication without needing a JWT session:

### cURL Example:
```bash
curl -X GET "http://localhost:3000/external/vehicles/ABC123/history" \
  -H "accept: application/json" \
  -H "x-api-key: demo-key-partner-1"
```

### Response Example:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "vehicle": {
      "id": "e4b67b12-9876-4a1b-bc54-3210fedcba98",
      "plate": "ABC123",
      "brand": "Chevrolet",
      "model": "NPR",
      "mileage": 45000,
      "status": "AVAILABLE",
      "available": true
    },
    "maintenances": [
      {
        "id": "f5c78c23-1234-4b2c-cd65-43210fedcba7",
        "type": "PREVENTIVE",
        "status": "COMPLETED",
        "description": "Cambio de aceite y filtros de 40.000 km",
        "mileage": 40000,
        "cost": 350000,
        "finishedAt": "2026-09-15T16:30:00.000Z",
        "mechanic": {
          "id": "a1b2c3d4-0000-0000-0000-000000000001",
          "name": "Carlos Pérez"
        },
        "workshop": {
          "id": "b2c3d4e5-0000-0000-0000-000000000001",
          "name": "Taller Central FleetCore"
        }
      }
    ]
  },
  "timestamp": "2026-10-27T12:00:00.000Z"
}
```

---

## 9. OAuth 2.0 Integration (GitHub) — 10 Bonus Points

The API includes native **OAuth 2.0** authentication delegating identity verification to **GitHub**:

### Flow Architecture:
1. **Initiate:** `GET /auth/github` redirects the browser to GitHub's OAuth authorization screen.
2. **Callback:** `GET /auth/github/callback` receives the authorization code, exchanges it for profile data (`user:email`), auto-provisions or resolves the user in PostgreSQL, signs, and delivers a valid FleetCore JWT `accessToken`.

### Configuration in `.env`:
```env
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
```

---

## 10. Automated Testing & Code Coverage (Jest)

The project includes unit test suites verifying business invariants, vehicle & mechanic conflict prevention, and state machine transition rules.

### Run Unit Tests:
```bash
npm test
```

### Run Tests with Coverage (> 60% Service Coverage):
```bash
npm run test:cov
```

---

## 10. Core RESTful Endpoints Reference

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/auth/register` | Public | Register new user (`ADMIN`, `TECHNICIAN`) |
| `POST` | `/auth/login` | Public | Authenticate user & receive JWT |
| `GET` | `/auth/profile` | Authenticated | Retrieve current user profile |
| `GET` | `/vehicles` | Authenticated | List all fleet vehicles (optional `?status=`) |
| `GET` | `/vehicles/:identifier` | Authenticated | Get vehicle by UUID or Plate |
| `POST` | `/vehicles` | `ADMIN` | Register a new vehicle |
| `PATCH` | `/vehicles/:id` | `ADMIN` | Update vehicle specifications |
| `DELETE` | `/vehicles/:id` | `ADMIN` | Inactivate vehicle logically |
| `GET` | `/mechanics` | Authenticated | List mechanics (optional `?status=`) |
| `GET` | `/mechanics/:id` | Authenticated | Get mechanic details |
| `POST` | `/mechanics` | `ADMIN` | Register a new mechanic |
| `PATCH` | `/mechanics/:id` | `ADMIN` | Update mechanic details |
| `DELETE` | `/mechanics/:id` | `ADMIN` | Inactivate mechanic logically |
| `GET` | `/workshops` | Authenticated | List workshops |
| `GET` | `/workshops/active` | Authenticated | List only active workshops |
| `POST` | `/workshops` | `ADMIN` | Register a new workshop |
| `PATCH` | `/workshops/:id` | `ADMIN` | Update workshop info |
| `DELETE` | `/workshops/:id` | `ADMIN` | Inactivate workshop logically |
| `GET` | `/maintenances` | Authenticated | List all maintenances |
| `GET` | `/maintenances/active` | Authenticated | List active maintenances |
| `GET` | `/maintenances/my-tasks` | `TECHNICIAN`, `ADMIN` | List tasks assigned to logged-in tech |
| `GET` | `/maintenances/vehicle/:vehicleId` | Authenticated | List maintenances by vehicle |
| `GET` | `/maintenances/vehicle/:identifier/history` | Authenticated | Completed historical maintenance log |
| `POST` | `/maintenances` | `ADMIN` | Schedule maintenance with concurrency lock |
| `PATCH` | `/maintenances/:id/status` | `ADMIN`, `TECHNICIAN` | Transition state machine (ACID transaction) |
| `GET` | `/external/vehicles/:plate/history` | `x-api-key` | External partner history integration |

---

## 11. Git Commit History & Best Practices

All changes follow conventional commit standards (`feat:`, `fix:`, `test:`, `docs:`, `chore:`) to ensure clean git traceability.
