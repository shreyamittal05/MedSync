// src/utils/queueMath.js
//
// Core triage logic for MedSync.
// Kept dependency-free and pure so it can be unit tested in isolation
// from any component or storage concern.

const DEFAULT_CONSULTATION_MINUTES = 10;
const ROLLING_WINDOW = 3;

/**
 * sortQueue(patients)
 *
 * Orders a list of "waiting" patients using a two-tier triage rule:
 *   1. Urgent patients are always placed ahead of Normal patients,
 *      regardless of arrival time.
 *   2. Within the same priority tier, patients are ordered strictly by
 *      check-in time (First-In, First-Out) — earliest arrival first.
 *
 * The input array is never mutated; a new sorted array is returned.
 *
 * @param {Array<{isUrgent: boolean, checkInTime: number}>} patients
 * @returns {Array} a new, sorted array
 */
export function sortQueue(patients) {
  if (!Array.isArray(patients)) return [];

  return [...patients].sort((a, b) => {
    const aUrgent = Boolean(a.isUrgent);
    const bUrgent = Boolean(b.isUrgent);

    if (aUrgent !== bUrgent) {
      // Urgent (true) sorts before Normal (false)
      return aUrgent ? -1 : 1;
    }

    // Same priority tier: strict FIFO by check-in timestamp
    return (a.checkInTime ?? 0) - (b.checkInTime ?? 0);
  });
}

/**
 * calculateETA(position, completedConsultations)
 *
 * Estimates wait time in minutes for a patient at a given queue position,
 * using a rolling average of the most recent completed consultation
 * durations instead of a fixed appointment slot length.
 *
 * - Rolling average is computed from the last ROLLING_WINDOW (3) completed
 *   consultations, most-recent-first.
 * - If no consultation history exists yet, falls back to a default
 *   per-patient duration of 10 minutes.
 *
 * @param {number} position - 1-indexed position in the waiting queue
 *   (1 = next to be seen). A position of 0 or less returns 0.
 * @param {Array<{durationMinutes: number}>} completedConsultations - all
 *   consultations completed so far, in the order they were completed
 *   (oldest first). Only the most recent entries are used.
 * @returns {number} estimated wait time in whole minutes
 */
export function calculateETA(position, completedConsultations) {
  if (!Number.isFinite(position) || position <= 0) return 0;

  const history = Array.isArray(completedConsultations)
    ? completedConsultations
    : [];

  const recent = history
    .slice(-ROLLING_WINDOW)
    .map((c) => c?.durationMinutes)
    .filter((d) => Number.isFinite(d) && d >= 0);

  const rollingAverage =
    recent.length > 0
      ? recent.reduce((sum, d) => sum + d, 0) / recent.length
      : DEFAULT_CONSULTATION_MINUTES;

  return Math.round(position * rollingAverage);
}

export { DEFAULT_CONSULTATION_MINUTES, ROLLING_WINDOW };
