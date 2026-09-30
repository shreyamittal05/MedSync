import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge.jsx';
import { sortQueue, calculateETA } from '../utils/queueMath.js';
import {
  findClinicById,
  getPatientsForClinic,
  subscribeToClinicPatients,
} from '../utils/dataStore.js';

export default function Tracker() {
  const { clinicId, tokenId } = useParams();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [clinic, setClinic] = useState(null);
  const [patients, setPatients] = useState([]);

  const refresh = useCallback(async () => {
    const [clinicResult, patientsResult] = await Promise.all([
      findClinicById(clinicId),
      getPatientsForClinic(clinicId),
    ]);
    setClinic(clinicResult);
    setPatients(patientsResult);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => {
    refresh();
    // Live status (waiting -> in-consultation -> completed) only changes
    // through the shared store, so subscribe regardless of which mode
    // we end up rendering — if a fallback view is showing because the
    // record wasn't there yet, this picks it up the moment it appears.
    const unsubscribe = subscribeToClinicPatients(clinicId, refresh);
    return unsubscribe;
  }, [clinicId, refresh]);

  const livePatient = patients.find((p) => p.tokenId === tokenId) || null;

  // Fallback snapshot encoded in the QR link itself. Only used when the
  // live record can't be found — e.g. this phone has no access to the
  // same store the desk used (no cloud database configured, and this is
  // a different device than the one that created the token).
  const fallbackName = searchParams.get('name');
  const fallback = fallbackName
    ? {
        tokenId,
        name: fallbackName,
        isUrgent: searchParams.get('isUrgent') === 'true',
        checkInTime: Number(searchParams.get('checkInTime')) || null,
        clinicName: searchParams.get('clinic') || clinic?.clinicName,
      }
    : null;

  if (loading) {
    return (
      <TrackerShell>
        <p className="text-center text-ink/40 text-sm">Loading your status…</p>
      </TrackerShell>
    );
  }

  if (livePatient) {
    const waitingSorted = sortQueue(patients.filter((p) => p.status === 'waiting'));
    const completedToday = patients.filter((p) => p.status === 'completed');
    const position = waitingSorted.findIndex((p) => p.tokenId === tokenId) + 1;
    const ahead = position > 0 ? position - 1 : 0;
    const eta = position > 0 ? calculateETA(position, completedToday) : 0;

    return (
      <TrackerShell clinicName={clinic?.clinicName}>
        <TokenHeader tokenId={livePatient.tokenId} isUrgent={livePatient.isUrgent} />

        {livePatient.status === 'waiting' && (
          <div className="space-y-4">
            <StatCard label="Patients ahead of you" value={ahead} />
            <StatCard label="Estimated wait" value={`${eta} min`} />
            <p className="text-center text-sm text-ink/50">
              Stay nearby — this page updates on its own as the queue moves.
            </p>
          </div>
        )}

        {livePatient.status === 'in-consultation' && <CallingBanner />}

        {livePatient.status === 'completed' && (
          <CompletedBanner clinicName={clinic?.clinicName} />
        )}
      </TrackerShell>
    );
  }

  if (fallback) {
    return (
      <TrackerShell clinicName={fallback.clinicName}>
        <TokenHeader tokenId={fallback.tokenId} isUrgent={fallback.isUrgent} />
        <div className="rounded-2xl bg-clinical-50 border border-clinical-500/20 px-5 py-5 text-center">
          <p className="text-sm text-clinical-600 leading-relaxed">
            You're checked in{fallback.name ? `, ${fallback.name}` : ''}. Live queue
            position isn't available on this device right now — please check the
            reception desk or wait for the doctor to call your token.
          </p>
        </div>
        <p className="mt-4 text-center text-xs text-ink/40 leading-relaxed">
          This page will switch to live tracking automatically once it can
          reach the clinic's queue.
        </p>
      </TrackerShell>
    );
  }

  return (
    <TrackerShell>
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-signal-500 mb-2">
          Token not found
        </p>
        <p className="text-ink/60 leading-relaxed">
          This tracking link doesn't match an active token. Please check
          with the reception desk.
        </p>
      </div>
    </TrackerShell>
  );
}

function TokenHeader({ tokenId, isUrgent }) {
  return (
    <div className="text-center">
      <p className="text-sm text-ink/50 mb-1">Your token</p>
      <p className="font-mono text-6xl font-bold text-ink tracking-tight mb-3">
        #{tokenId}
      </p>
      <StatusBadge status={isUrgent ? 'urgent' : 'normal'} className="mb-6" />
    </div>
  );
}

function CallingBanner() {
  return (
    <div
      className="rounded-2xl bg-mint-500 text-white px-6 py-8 text-center animate-pulseSoft"
      role="status"
    >
      <p className="text-lg font-semibold leading-snug">Doctor is calling you now</p>
      <p className="text-white/85 mt-1">Please enter the cabin.</p>
    </div>
  );
}

function CompletedBanner({ clinicName }) {
  return (
    <div className="rounded-2xl bg-ink/5 border border-ink/10 px-6 py-8 text-center">
      <p className="text-lg font-semibold text-ink">Consultation complete</p>
      <p className="text-ink/60 mt-1">
        Thank you for visiting {clinicName ?? 'the clinic'}. Take care.
      </p>
    </div>
  );
}

function TrackerShell({ clinicName, children }) {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="px-6 py-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-clinical-500">
          {clinicName ?? 'MedSync'}
        </p>
      </header>
      <main className="flex-1 flex items-start justify-center px-5 pb-10">
        <div className="w-full max-w-sm bg-white border border-line rounded-2xl shadow-panel p-7 mt-4">
          {children}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl bg-paper border border-line px-5 py-4 flex items-center justify-between">
      <span className="text-sm text-ink/60">{label}</span>
      <span className="tabular text-xl font-semibold text-ink">{value}</span>
    </div>
  );
}
