# SmartRide - AI-Assisted Car-Pooling Platform

SmartRide is a multi-page web application for organizing and booking shared car trips.
It supports two main roles:

- **Regular User / Driver**: registers, manages personal profile, creates trips as a driver, and books seats as a passenger.
- **Administrator**: has full platform oversight, can manage users, review all trips, and apply moderation actions.

### Core User Flows

1. **Authentication flow**: Sign up, sign in, and role-aware session handling with Supabase Auth.
2. **Trip lifecycle flow**: Driver creates a trip (optionally with car photo), passengers submit booking requests, driver/admin approves or rejects.
3. **Profile dashboard flow**: Users view personal bookings and trip activity; drivers manage incoming booking requests.
4. **Administration flow**: Admin views all users/trips, edits/deletes trips, and enforces platform integrity.

---

## 1) Project Title & Description

**SmartRide - AI-Assisted Car-Pooling Platform** is a modern multi-page web application for creating, browsing, and managing shared trips.

It supports two core user roles:

- **Regular User / Driver**: can register/login, create trips as a driver, and request bookings as a passenger.
- **Administrator**: can manage users and moderate all trips/bookings platform-wide.

Main user flows include:

1. Account authentication and role-aware access.
2. Trip publishing with optional car photo upload.
3. Booking request lifecycle (pending, approved, rejected).
4. Dashboard/profile management for users and drivers.
5. Full moderation capabilities in the Admin Panel.

---

## 2) Key Features Checklist

- [x] **Multi-page navigation (MPA)** with dedicated HTML entry points.
- [x] **Responsive Bootstrap 5 UI** with custom styling and mobile-ready layouts.
- [x] **Supabase Auth** with role-aware access control (user/admin).
- [x] **Supabase Storage** integration for car photo uploads.
- [x] **Strict RLS Data Security** across core tables with policy-based permissions.
- [x] **Booking management workflow** (pending/approved/rejected) with seat synchronization.

---

## 3) Architecture & Tech Stack

### Client

- **HTML5 + CSS3 + Vanilla JavaScript (ES Modules)**
- **Bootstrap 5** for responsive layout/components
- **Vite** for development server and production bundling

### Backend (BaaS)

- **Supabase Postgres** database
- **Supabase Auth** for JWT-based session management
- **Supabase Storage** for trip image assets
- **Supabase JS SDK (`@supabase/supabase-js`)** as REST API client

### High-Level Architecture

- **Presentation layer**: page modules under `src/pages/`
- **Reusable UI layer**: shared components under `src/components/`
- **Data/service layer**: auth, trips, notifications, storage under `src/services/`
- **Database + security layer**: SQL migrations, constraints, triggers, and RLS in `supabase/migrations/`

---

## 4) Project Structure

```text
SmartRide/
├─ .github/
│  └─ copilot-instructions.md (optional)
├─ .vscode/
│  └─ mcp.json
├─ .env
├─ AGENTS.md
├─ index.html
├─ login.html
├─ register.html
├─ dashboard.html
├─ create-trip.html
├─ trip-details.html
├─ profile.html
├─ admin.html
├─ package.json
├─ vite.config.js
├─ src/
│  ├─ main.js
│  ├─ router.js
│  ├─ components/
│  │  ├─ Header.js
│  │  └─ Footer.js
│  ├─ pages/
│  │  ├─ home.js
│  │  ├─ login.js
│  │  ├─ register.js
│  │  ├─ dashboard.js
│  │  ├─ createTrip.js
│  │  ├─ tripDetails.js
│  │  ├─ profile.js
│  │  └─ admin.js
│  ├─ services/
│  │  ├─ supabaseClient.js
│  │  ├─ authService.js
│  │  ├─ tripService.js
│  │  ├─ notificationService.js
│  │  └─ storageService.js
│  └─ styles/
│     └─ theme.css
├─ supabase/
│  └─ migrations/
│     ├─ 20260709000000_smartride_schema.sql
│     ├─ 20260709183000_fix_profiles_signup_rls.sql
│     ├─ 20260709190000_create_car_photos_bucket.sql
│     ├─ 20260709200000_booking_status_rpc.sql
│     ├─ 20260709203000_strict_booking_update_policy.sql
│     ├─ 20260709213000_bookings_delete_policy.sql
│     ├─ 20260709220000_trips_admin_read_all.sql
│     ├─ 20260709224000_multi_seat_bookings.sql
│     └─ 20260710120000_add_booking_contact_fields.sql
└─ dist/ (generated build output)
```

---

## 5) Database Schema Design

The application uses **4 core tables**: `profiles`, `trips`, `bookings`, `reviews`.

### `profiles`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | uuid | PK, FK -> auth.users(id), ON DELETE CASCADE | User identifier |
| full_name | text | NOT NULL | Public display name |
| phone | text | NULL | Contact phone |
| avatar_url | text | NULL | Profile image URL |
| role | text | NOT NULL, DEFAULT 'user', CHECK IN ('user','admin') | Authorization role |
| created_at | timestamptz | NOT NULL, DEFAULT now() UTC | Creation timestamp |

### `trips`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | uuid | PK, DEFAULT uuid_generate_v4() | Trip identifier |
| driver_id | uuid | NOT NULL, FK -> profiles(id), ON DELETE CASCADE | Driver/owner user id |
| from_city | text | NOT NULL | Departure city |
| to_city | text | NOT NULL | Destination city |
| date_time | timestamptz | NOT NULL | Scheduled departure |
| price | numeric(10,2) | NOT NULL, CHECK >= 0 | Price per seat |
| available_seats | int | NOT NULL, CHECK >= 0 | Remaining seats |
| car_photo_url | text | NULL | Car image URL |
| created_at | timestamptz | NOT NULL, DEFAULT now() UTC | Creation timestamp |

### `bookings`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | uuid | PK, DEFAULT uuid_generate_v4() | Booking identifier |
| trip_id | uuid | NOT NULL, FK -> trips(id), ON DELETE CASCADE | Related trip |
| passenger_id | uuid | NOT NULL, FK -> profiles(id), ON DELETE CASCADE | Passenger user id |
| status | text | NOT NULL, DEFAULT 'pending', CHECK IN ('pending','approved','rejected') | Booking state |
| seats_requested | int | NOT NULL, DEFAULT 1, CHECK > 0 | Number of seats requested |
| passenger_phone | text | NULL | Phone captured in booking form |
| passenger_note | text | NULL | Optional free-text note |
| created_at | timestamptz | NOT NULL, DEFAULT now() UTC | Creation timestamp |

**Unique rule:** `(trip_id, passenger_id)` prevents duplicate booking requests for the same trip by the same passenger.

### `reviews`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | uuid | PK, DEFAULT uuid_generate_v4() | Review identifier |
| trip_id | uuid | NOT NULL, FK -> trips(id), ON DELETE CASCADE | Reviewed trip |
| reviewer_id | uuid | NOT NULL, FK -> profiles(id), ON DELETE CASCADE | Author user id |
| rating | int | NOT NULL, CHECK BETWEEN 1 AND 5 | Numeric score |
| comment | text | NULL | Optional review text |
| created_at | timestamptz | NOT NULL, DEFAULT now() UTC | Creation timestamp |

---

## 6) Local Development Setup Guide

### Prerequisites

- Node.js 18+
- npm 9+
- Supabase project (URL + anon key)

### Steps

1. Clone the repository:

```bash
git clone <YOUR_REPOSITORY_URL>
cd SmartRide
```

2. Install dependencies:

```bash
npm install
```

3. Create or update `.env` in project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

4. Start development server:

```bash
npm run dev
```

5. Build for production (optional verification):

```bash
npm run build
```

---

## 7) Sample Testing Credentials

Use the following placeholders for examiner testing:

### Demo User

- **Email:** `<demo-user@email.com>`
- **Password:** `<demo-user-password>`
- **Role:** `user`

### Demo Admin (Vader)

- **Email:** `<vader-admin@email.com>`
- **Password:** `<vader-admin-password>`
- **Role:** `admin`
