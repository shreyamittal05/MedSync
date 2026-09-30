# MedSync — Clinic Queue & Triage Tracker

A multi-tenant outpatient clinic queue manager: a desk console for staff and
a zero-login, QR-scanned live tracker for patients. Built with React, Vite,
Tailwind CSS, and React Router.

## Getting started

```bash
npm install
npm run dev
```

Vite prints two URLs — a `localhost` one and a `Network` one
(`http://192.168.x.x:5173`). **Open the dashboard using the Network URL**,
not `localhost` — patient phones on the clinic Wi-Fi can only reach the
network address, and that's also the address baked into every QR code.
The app shows a banner on the dashboard as a reminder if it detects
you're on `localhost`.

## Why "Token Not Found" used to happen

The receptionist's laptop and a patient's phone are two separate
browsers. The original build stored everything in `localStorage`, which
never leaves the browser that wrote it — so a phone scanning the QR code
had no way to see the token the laptop had just created. This version
fixes that with two complementary changes, described below.

## Two data-store modes

Everything goes through `src/utils/dataStore.js`, which exposes the same
async functions (`findClinicById`, `getPatientsForClinic`, `addPatient`,
`updatePatient`, `subscribeToClinicPatients`, ...) no matter which mode
is active:

### Option A — Supabase (recommended, real cross-device sync)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run:

   ```sql
   create table clinics (
     clinic_id text primary key,
     clinic_name text not null,
     doctor_name text not null,
     email text not null unique,
     password text not null
   );

   create table patients (
     id bigint generated always as identity primary key,
     clinic_id text not null references clinics(clinic_id),
     token_id text not null,
     name text not null,
     is_urgent boolean not null default false,
     status text not null default 'waiting',
     check_in_time bigint not null,
     called_at bigint,
     completed_at bigint,
     duration_minutes int,
     unique (clinic_id, token_id)
   );

   alter table clinics enable row level security;
   alter table patients enable row level security;

   -- Demo-friendly open policies. Tighten these before handling real
   -- patient data in production.
   create policy "public read/write clinics" on clinics for all using (true) with check (true);
   create policy "public read/write patients" on patients for all using (true) with check (true);

   alter publication supabase_realtime add table patients;
   ```

3. Copy `.env.example` to `.env` and fill in your project's URL and anon
   key (Project Settings → API).
4. Restart `npm run dev`. The app detects the env vars automatically —
   `dataStore.js` routes every read/write to Supabase instead of
   `localStorage`, and `Tracker.jsx` subscribes to a realtime channel, so
   a phone anywhere with internet access sees the desk's "Call next
   patient" click within roughly a second.

With Supabase configured, the phone no longer needs to be on the same
Wi-Fi as the desk for *data* — but it still needs to be able to load the
web app itself, so the app must be deployed somewhere reachable (or, for
local dev, the phone still needs the LAN address to open the page at
all).

### Option B — Zero-backend fallback (no setup required)

If `.env` is missing or empty, `dataStore.js` transparently falls back
to `localStorage` for same-device testing (e.g. desk laptop with two
browser tabs), **and** every QR code also encodes a snapshot of the
check-in (`name`, `isUrgent`, `checkInTime`, `clinic`) as URL query
parameters:

```
/track/:clinicId/:tokenId?name=John&isUrgent=false&checkInTime=...&clinic=Apex+Care
```

When `Tracker.jsx` loads on a phone that has no access to the desk's
`localStorage`, it can't find a live record — instead of a hard error,
it reads those query parameters and renders a read-only "you're checked
in" view with the token, name, and priority badge, and a note that live
queue position isn't available on this device. It keeps listening in the
background, so if the same browser later gains access to the record
(e.g. Supabase gets configured, or it's reloaded on the desk device),
it switches to the full live view automatically. A genuinely broken or
malformed link (no fallback params either) still shows "Token not
found."

## How it works otherwise

- **Register a clinic** at `/` — generates a URL-friendly `clinicId`
  slug (e.g. `apex-care-noida`) and takes you to your dashboard.
- **Check in a patient** from the dashboard. A token (`#A-01`, `#A-02`,
  ...) is generated and a QR code appears immediately.
- **Call next patient** completes whoever is currently in consultation
  and brings in the next person from the sorted queue (urgent patients
  first, then strict first-in-first-out).

## Triage & wait-time logic

`src/utils/queueMath.js` is a small, dependency-free module:

- `sortQueue(patients)` — urgent patients are placed ahead of normal
  patients; patients at the same priority level keep strict FIFO order by
  check-in time.
- `calculateETA(position, completedConsultations)` — multiplies queue
  position by a rolling average of the last 3 completed consultation
  durations, falling back to a default of 10 minutes when there's no
  history yet.

## Project structure

```text
src/
├── components/
│   └── StatusBadge.jsx
├── pages/
│   ├── Landing.jsx
│   ├── Dashboard.jsx
│   └── Tracker.jsx
├── utils/
│   ├── queueMath.js
│   ├── dataStore.js       # async data layer — Supabase or localStorage
│   └── supabaseClient.js  # no-ops when env vars aren't set
├── App.jsx
├── main.jsx
└── index.css
```
