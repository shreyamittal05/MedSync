// src/utils/dataStore.js
//
// Single data-access layer for clinics and patients. Every function here
// returns a Promise, whether the underlying store is a real Supabase
// table or a same-device localStorage fallback, so the rest of the app
// never needs to know or care which one is active.
//
// Why this exists: the original localStorage-only design broke as soon
// as a patient scanned the QR code from a *different device* — the
// phone's browser has its own, empty localStorage. Supabase (Option A)
// fixes that properly with a real shared database and realtime updates.
// When no Supabase project is configured, Option B keeps the demo
// working: data still round-trips through localStorage for same-device
// testing, and the QR link also carries a URL-encoded snapshot of the
// patient's check-in details so a *different* device can render a
// reasonable read-only view instead of a hard "not found" error.

import { supabase, isSupabaseConfigured } from './supabaseClient.js';

export const CLINICS_KEY = 'medsync_clinics';
export const PATIENTS_KEY = 'medsync_patients';
export const SESSION_KEY = 'medsync_active_session';

const POLL_INTERVAL_MS = 3000;

// ---- Local fallback primitives -------------------------------------------

function readCollection(key) {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCollection(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
  // 'storage' does not fire in the tab that made the change, so also
  // dispatch a same-tab custom event for any local listeners.
  window.dispatchEvent(new CustomEvent('medsync:local-update', { detail: { key } }));
}

// ---- Session (always local — one browser at the front desk) --------------

export function setActiveSession(clinicId) {
  window.sessionStorage.setItem(SESSION_KEY, clinicId);
}

export function getActiveSession() {
  return window.sessionStorage.getItem(SESSION_KEY);
}

export function clearActiveSession() {
  window.sessionStorage.removeItem(SESSION_KEY);
}

// ---- Helpers ---------------------------------------------------------------

export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function mapClinicFromDb(row) {
  return {
    clinicId: row.clinic_id,
    clinicName: row.clinic_name,
    doctorName: row.doctor_name,
    email: row.email,
    password: row.password,
  };
}

function mapPatientFromDb(row) {
  return {
    clinicId: row.clinic_id,
    tokenId: row.token_id,
    name: row.name,
    isUrgent: row.is_urgent,
    status: row.status,
    checkInTime: row.check_in_time,
    calledAt: row.called_at,
    completedAt: row.completed_at,
    durationMinutes: row.duration_minutes,
  };
}

function mapPatientToInsertRow(patient) {
  return {
    clinic_id: patient.clinicId,
    token_id: patient.tokenId,
    name: patient.name,
    is_urgent: patient.isUrgent,
    status: patient.status,
    check_in_time: patient.checkInTime,
  };
}

// ---- Clinics ---------------------------------------------------------------

export async function findClinicByEmail(email) {
  const normalized = email.trim().toLowerCase();

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .ilike('email', normalized)
      .maybeSingle();
    if (error) throw error;
    return data ? mapClinicFromDb(data) : null;
  }

  const clinics = readCollection(CLINICS_KEY);
  return clinics.find((c) => c.email.toLowerCase() === normalized) || null;
}

export async function findClinicById(clinicId) {
  if (!clinicId) return null;

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('clinic_id', clinicId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapClinicFromDb(data) : null;
  }

  const clinics = readCollection(CLINICS_KEY);
  return clinics.find((c) => c.clinicId === clinicId) || null;
}

async function generateClinicId(clinicName) {
  const base = slugify(clinicName) || 'clinic';
  let candidate = base;
  let suffix = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await findClinicById(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/**
 * registerClinic — validates nothing itself (callers should check for
 * duplicate emails first); creates the clinicId slug and persists the
 * new clinic record to whichever store is active.
 */
export async function registerClinic({ clinicName, doctorName, email, password }) {
  const clinicId = await generateClinicId(clinicName);
  const clinic = { clinicId, clinicName, doctorName, email: email.trim().toLowerCase(), password };

  if (isSupabaseConfigured) {
    const { error } = await supabase.from('clinics').insert({
      clinic_id: clinic.clinicId,
      clinic_name: clinic.clinicName,
      doctor_name: clinic.doctorName,
      email: clinic.email,
      password: clinic.password,
    });
    if (error) throw error;
    return clinic;
  }

  const clinics = readCollection(CLINICS_KEY);
  clinics.push(clinic);
  writeCollection(CLINICS_KEY, clinics);
  return clinic;
}

// ---- Patients / Queue -------------------------------------------------------

export async function getPatientsForClinic(clinicId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('check_in_time', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapPatientFromDb);
  }

  return readCollection(PATIENTS_KEY).filter((p) => p.clinicId === clinicId);
}

export async function findPatient(clinicId, tokenId) {
  const patients = await getPatientsForClinic(clinicId);
  return patients.find((p) => p.tokenId === tokenId) || null;
}

export async function generateTokenId(clinicId) {
  const patients = await getPatientsForClinic(clinicId);
  const nextNumber = patients.length + 1;
  return `A-${String(nextNumber).padStart(2, '0')}`;
}

export async function addPatient(patient) {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('patients').insert(mapPatientToInsertRow(patient));
    if (error) throw error;
    return patient;
  }

  const patients = readCollection(PATIENTS_KEY);
  patients.push(patient);
  writeCollection(PATIENTS_KEY, patients);
  return patient;
}

export async function updatePatient(clinicId, tokenId, updates) {
  if (isSupabaseConfigured) {
    const patch = {};
    if ('status' in updates) patch.status = updates.status;
    if ('calledAt' in updates) patch.called_at = updates.calledAt;
    if ('completedAt' in updates) patch.completed_at = updates.completedAt;
    if ('durationMinutes' in updates) patch.duration_minutes = updates.durationMinutes;

    const { error } = await supabase
      .from('patients')
      .update(patch)
      .eq('clinic_id', clinicId)
      .eq('token_id', tokenId);
    if (error) throw error;
    return getPatientsForClinic(clinicId);
  }

  const patients = readCollection(PATIENTS_KEY);
  const next = patients.map((p) =>
    p.clinicId === clinicId && p.tokenId === tokenId ? { ...p, ...updates } : p
  );
  writeCollection(PATIENTS_KEY, next);
  return next.filter((p) => p.clinicId === clinicId);
}

// ---- Cross-screen sync -------------------------------------------------------

/**
 * subscribeToCollection — local-fallback sync only: native 'storage'
 * events (other tabs on the same device) plus a 3s poll as a safety net.
 */
function subscribeToCollection(key, callback) {
  let lastSnapshot = window.localStorage.getItem(key);

  const handleStorageEvent = (event) => {
    if (event.key === key) callback();
  };
  const handleLocalEvent = (event) => {
    if (event.detail?.key === key) callback();
  };
  const intervalId = window.setInterval(() => {
    const current = window.localStorage.getItem(key);
    if (current !== lastSnapshot) {
      lastSnapshot = current;
      callback();
    }
  }, POLL_INTERVAL_MS);

  window.addEventListener('storage', handleStorageEvent);
  window.addEventListener('medsync:local-update', handleLocalEvent);

  return () => {
    window.clearInterval(intervalId);
    window.removeEventListener('storage', handleStorageEvent);
    window.removeEventListener('medsync:local-update', handleLocalEvent);
  };
}

/**
 * subscribeToClinicPatients — the one function pages should use. Routes
 * to a Supabase realtime channel (updates arrive from any device, over
 * the internet) when configured, or to the local storage-event/poll
 * fallback otherwise. Always returns an unsubscribe function.
 */
export function subscribeToClinicPatients(clinicId, callback) {
  if (isSupabaseConfigured) {
    const channel = supabase
      .channel(`patients-${clinicId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients', filter: `clinic_id=eq.${clinicId}` },
        () => callback()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  return subscribeToCollection(PATIENTS_KEY, callback);
}
