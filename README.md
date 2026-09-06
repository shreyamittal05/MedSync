# MedSync 🏥
> **Multi-Tenant Smart OPD Queue Management & Live Triage Tracker**

MedSync is a lightweight, zero-barrier queue orchestration platform built for outpatient clinics and residential society medical centers. It replaces archaic paper token slips with a dynamic triage priority queue and a zero-install, mobile-friendly live tracker for walk-in patients.

---

## 🌟 Key Problems Solved

* **Opaque Wait Times:** Eliminates blind waiting and crowded reception desks by dynamically predicting consultation wait times based on live doctor throughput.
* **Triage Conflicts:** Implements an automated priority system where urgent/critical medical cases systematically jump ahead of routine visits without manual friction.
* **Zero Patient Friction:** Patients are **not required to download any mobile app, create accounts, or fill lengthy forms**. Clinic staff registers the patient, and the patient simply scans an on-screen QR code using their default phone camera to monitor their live turn.

---

## 🚀 Key Features

* **Multi-Tenant Clinic Isolation:** Clinics register and receive dedicated dynamic routing (`/clinic/:clinicId/dashboard`). Data and queues remain strictly isolated between clinics.
* **Instant On-Screen Token QR:** Submitting a patient entry generates an auto-incremented token (e.g., `#A-01`) alongside a dynamic QR code pointing to `/track/:clinicId/:tokenId`.
* **Dynamic Rolling-Average ETA Engine:** Wait times dynamically recalibrate based on the average duration of the last 3 completed consultations:
  $$\text{Estimated Wait} = \text{Queue Position} \times \left( \frac{1}{k} \sum_{i=1}^{k} \text{Duration}_i \right)$$
* **Real-Time Cross-Screen Sync:** Uses browser storage synchronization listeners so that when a doctor calls the next patient, the patient's mobile view automatically reflects the change without manual page reloads.

---

## 🛠️ Tech Stack

* **Frontend:** React.js (Functional Components, Custom Hooks, Context API)
* **Tooling:** Vite, ES6+ JavaScript
* **Styling:** Tailwind CSS (Mobile-first responsive layouts, status indicators)
* **Routing:** React Router DOM v6
* **QR Generation:** `qrcode.react`
* **State & Persistence:** LocalStorage & Storage Event Listeners for local-first multi-client state emulation

---

## 📂 Project Directory Structure

```text
MedSync/
├── src/
│   ├── components/
│   │   └── StatusBadge.jsx       # Reusable priority and consultation state badges
│   ├── context/
│   │   └── ClinicContext.jsx     # Shared tenant and queue state management
│   ├── pages/
│   │   ├── Landing.jsx           # Clinic registration and authentication tabs
│   │   ├── Dashboard.jsx         # Receptionist check-in, queue table & QR modal
│   │   └── Tracker.jsx           # Patient mobile live tracking view
│   ├── utils/
│   │   └── queueMath.js          # Triage sorting algorithm & rolling-average ETA logic
│   ├── App.jsx                   # Central route configurations
│   ├── index.css                 # Tailwind CSS imports
│   └── main.jsx                  # React application root
├── package.json
├── vite.config.js
└── README.md
