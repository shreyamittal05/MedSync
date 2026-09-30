import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import StatusBadge from '../components/StatusBadge.jsx';
import { sortQueue, calculateETA } from '../utils/queueMath.js';
import {
  findClinicById,
  getPatientsForClinic,
  addPatient,
  updatePatient,
  generateTokenId,
  subscribeToClinicPatients,
  clearActiveSession,
} from '../utils/dataStore.js';
import { isSupabaseConfigured } from '../utils/supabaseClient.js';
import { detectLocalNetworkAddress } from '../utils/network.js';

export default function Dashboard() {
  const { clinicId } = useParams();
  const navigate = useNavigate();

  const [clinic, setClinic] = useState(undefined); // undefined = loading, null = not found
  const [patients, setPatients] = useState([]);
  const [now, setNow] = useState(() => new Date());
  const [nameInput, setNameInput] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [qrModal, setQrModal] = useState(null); // { tokenId, name, isUrgent, checkInTime }
  const [checkInError, setCheckInError] = useState('');
  const [networkHint, setNetworkHint] = useState(undefined); // undefined = detecting, string | null once done

  const isLocalOnly =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  useEffect(() => {
    if (!isLocalOnly) return;
    detectLocalNetworkAddress().then(setNetworkHint);
  }, [isLocalOnly]);

  const refreshPatients = useCallback(async () => {
    const list = await getPatientsForClinic(clinicId);
    setPatients(list);
  }, [clinicId]);

  useEffect(() => {
    let cancelled = false;
    findClinicById(clinicId).then((result) => {
      if (!cancelled) setClinic(result);
    });
    return () => {
      cancelled = true;
    };
  }, [clinicId]);

  useEffect(() => {
    if (!clinic) return undefined;
    refreshPatients();
    const unsubscribe = subscribeToClinicPatients(clinicId, refreshPatients);
    return unsubscribe;
  }, [clinic, clinicId, refreshPatients]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  if (clinic === null) {
    return <Navigate to="/" replace />;
  }

  if (clinic === undefined) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-ink/40 text-sm">Loading clinic…</p>
      </div>
    );
  }

  const waiting = sortQueue(patients.filter((p) => p.status === 'waiting'));
  const inConsultation = patients.filter((p) => p.status === 'in-consultation');
  const completedToday = patients.filter((p) => p.status === 'completed');

  const avgConsultationMinutes = (() => {
    const recent = completedToday.slice(-3).map((p) => p.durationMinutes).filter(Number.isFinite);
    if (recent.length === 0) return null;
    return Math.round(recent.reduce((sum, d) => sum + d, 0) / recent.length);
  })();

  async function handleCheckIn(event) {
    event.preventDefault();
    const trimmedName = nameInput.trim();
    if (!trimmedName) return;
    setCheckInError('');

    try {
      const tokenId = await generateTokenId(clinicId);
      const patient = {
        tokenId,
        clinicId,
        name: trimmedName,
        isUrgent,
        status: 'waiting',
        checkInTime: Date.now(),
      };

      await addPatient(patient);
      await refreshPatients();
      setQrModal(patient);
      setNameInput('');
      setIsUrgent(false);
    } catch (err) {
      setCheckInError('Could not create a token right now. Please try again.');
    }
  }

  async function handleCallNext() {
    const current = inConsultation[0];

    if (current) {
      const durationMinutes = Math.max(
        1,
        Math.round((Date.now() - (current.calledAt ?? current.checkInTime)) / 60000)
      );
      await updatePatient(clinicId, current.tokenId, {
        status: 'completed',
        completedAt: Date.now(),
        durationMinutes,
      });
    }

    const remainingWaiting = current
      ? patients.filter((p) => p.tokenId !== current.tokenId)
      : patients;
    const nextWaiting = sortQueue(remainingWaiting.filter((p) => p.status === 'waiting'))[0];

    if (nextWaiting) {
      await updatePatient(clinicId, nextWaiting.tokenId, {
        status: 'in-consultation',
        calledAt: Date.now(),
      });
    }

    refreshPatients();
  }

  async function handleMarkCompleted(tokenId) {
    const target = patients.find((p) => p.tokenId === tokenId);
    if (!target) return;
    const durationMinutes = Math.max(
      1,
      Math.round((Date.now() - (target.calledAt ?? target.checkInTime)) / 60000)
    );
    await updatePatient(clinicId, tokenId, {
      status: 'completed',
      completedAt: Date.now(),
      durationMinutes,
    });
    refreshPatients();
  }

  function handleLogout() {
    clearActiveSession();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-white border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-clinical-500">
              {clinic.doctorName}
            </p>
            <h1 className="text-xl font-semibold text-ink">{clinic.clinicName}</h1>
          </div>
          <div className="flex items-center gap-5">
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                isSupabaseConfigured
                  ? 'bg-mint-50 text-mint-600 border-mint-500/30'
                  : 'bg-ink/5 text-ink/50 border-ink/10'
              }`}
              title={
                isSupabaseConfigured
                  ? 'Patient data syncs live via Supabase'
                  : 'Local demo mode — data stays on this device'
              }
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${isSupabaseConfigured ? 'bg-mint-500' : 'bg-ink/30'}`}
                aria-hidden="true"
              />
              {isSupabaseConfigured ? 'Cloud sync on' : 'Local demo mode'}
            </span>
            <time className="tabular text-ink/60 text-sm hidden sm:block" dateTime={now.toISOString()}>
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </time>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm font-semibold text-ink/60 hover:text-ink transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <NetworkAccessBanner isLocalOnly={isLocalOnly} networkHint={networkHint} />

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard label="Patients waiting" value={waiting.length} />
          <MetricCard
            label="Avg. consultation time"
            value={avgConsultationMinutes !== null ? `${avgConsultationMinutes} min` : '—'}
          />
          <MetricCard label="Consulted today" value={completedToday.length} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <div className="bg-white border border-line rounded-xl shadow-panel p-5 h-fit">
            <h2 className="font-semibold text-ink mb-4">Check in a patient</h2>
            <form onSubmit={handleCheckIn} className="space-y-4">
              <label className="block">
                <span className="block text-sm font-medium text-ink/70 mb-1.5">Patient name</span>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Ravi Sharma"
                  className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-ink placeholder:text-ink/30 focus:bg-white focus:border-clinical-500 transition-colors"
                  required
                />
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="h-4 w-4 rounded border-line text-signal-500 focus:ring-signal-500"
                />
                <span className="text-sm text-ink/80">Mark as emergency / priority</span>
              </label>

              {checkInError && (
                <p className="text-sm text-signal-600 bg-signal-50 border border-signal-500/20 rounded-lg px-3 py-2">
                  {checkInError}
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-clinical-500 text-white font-semibold py-2.5 hover:bg-clinical-600 transition-colors"
              >
                Generate token &amp; show QR
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-line">
              <p className="text-sm text-ink/60 mb-3">
                Currently in consultation
              </p>
              {inConsultation.length === 0 ? (
                <p className="text-sm text-ink/40">No patient in the cabin right now.</p>
              ) : (
                inConsultation.map((p) => (
                  <div key={p.tokenId} className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <p className="font-mono text-sm font-semibold text-ink">#{p.tokenId}</p>
                      <p className="text-sm text-ink/70">{p.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleMarkCompleted(p.tokenId)}
                      className="text-xs font-semibold text-mint-600 border border-mint-500/30 bg-mint-50 rounded-full px-3 py-1.5 hover:bg-mint-500/10 transition-colors"
                    >
                      Mark completed
                    </button>
                  </div>
                ))
              )}
              <button
                type="button"
                onClick={handleCallNext}
                disabled={waiting.length === 0 && inConsultation.length === 0}
                className="mt-3 w-full rounded-lg border border-ink text-ink font-semibold py-2.5 hover:bg-ink hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                Call next patient
              </button>
            </div>
          </div>

          <div className="bg-white border border-line rounded-xl shadow-panel overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <h2 className="font-semibold text-ink">Active queue</h2>
              <span className="text-sm text-ink/50">{waiting.length} waiting</span>
            </div>

            {waiting.length === 0 ? (
              <p className="px-5 py-10 text-center text-ink/40 text-sm">
                No one is waiting. Check in a patient to start the queue.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink/40 text-xs uppercase tracking-wide">
                    <th className="px-5 py-3 font-medium">Token</th>
                    <th className="px-5 py-3 font-medium">Patient</th>
                    <th className="px-5 py-3 font-medium">Priority</th>
                    <th className="px-5 py-3 font-medium text-right">Est. wait</th>
                  </tr>
                </thead>
                <tbody>
                  {waiting.map((p, index) => {
                    const eta = calculateETA(index + 1, completedToday);
                    return (
                      <tr key={p.tokenId} className="border-t border-line">
                        <td className="px-5 py-3 font-mono font-semibold text-ink">#{p.tokenId}</td>
                        <td className="px-5 py-3 text-ink/80">{p.name}</td>
                        <td className="px-5 py-3">
                          <StatusBadge status={p.isUrgent ? 'urgent' : 'normal'} />
                        </td>
                        <td className="px-5 py-3 text-right tabular text-ink/70">{eta} min</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>

      {qrModal && (
        <QrModal
          clinicId={clinicId}
          clinicName={clinic.clinicName}
          patient={qrModal}
          isLocalOnly={isLocalOnly}
          networkHint={networkHint}
          onClose={() => setQrModal(null)}
        />
      )}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="bg-white border border-line rounded-xl shadow-panel px-5 py-4">
      <p className="text-sm text-ink/50">{label}</p>
      <p className="text-2xl font-semibold text-ink tabular mt-1">{value}</p>
    </div>
  );
}

/**
 * The tracker link points at this SPA's own /track route, so a phone can
 * only open it if the phone can reach this origin over the network. In
 * dev, that means the dashboard itself must be opened via the machine's
 * LAN address (e.g. http://192.168.x.x:5173), not http://localhost:5173
 * — localhost only resolves on the same machine. Deliberately NOT
 * dismissible while on localhost: this is the exact condition that
 * breaks every QR code generated below, so it stays visible rather than
 * being a one-time toast someone can miss or dismiss and forget about.
 */
function NetworkAccessBanner({ isLocalOnly, networkHint }) {
  if (!isLocalOnly) return null;

  const port = window.location.port || '5173';
  const suggestedUrl = networkHint ? `http://${networkHint}:${port}` : null;

  return (
    <div className="rounded-xl border border-signal-500/20 bg-signal-50 px-4 py-3 text-sm text-signal-600">
      <p className="font-semibold mb-1">QR codes won't open on patient phones yet</p>
      <p className="leading-relaxed">
        You're viewing this dashboard at <code className="font-mono">localhost</code>, which only
        resolves on this computer. Open this exact page from{' '}
        {suggestedUrl ? (
          <>
            <code className="font-mono font-semibold">{suggestedUrl}</code> instead
          </>
        ) : (
          <>this computer's network address instead (check the terminal running{' '}
            <code className="font-mono">npm run dev</code> — it prints a "Network" URL)</>
        )}
        {' '}— every QR code generated below is built from whatever address is in your browser's
        address bar right now.
      </p>
    </div>
  );
}

function QrModal({ clinicId, clinicName, patient, isLocalOnly, networkHint, onClose }) {
  const [copied, setCopied] = useState(false);
  const trackerOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  // URL fallback (Option B): when there's no cloud database, a token
  // scanned from a different device has no shared store to read from.
  // Encoding a snapshot of the check-in details directly in the link
  // lets Tracker.jsx render a sensible read-only view instead of a
  // hard "not found" error. When Supabase is configured this data is
  // redundant (the live row is used instead) but harmless to include.
  const fallbackParams = new URLSearchParams({
    name: patient.name,
    isUrgent: String(patient.isUrgent),
    checkInTime: String(patient.checkInTime),
    clinic: clinicName,
  });
  const trackerPath = `/track/${clinicId}/${patient.tokenId}?${fallbackParams.toString()}`;
  const trackerUrl = `${trackerOrigin}${trackerPath}`;
  const suggestedUrl = isLocalOnly && networkHint
    ? `http://${networkHint}:${window.location.port || '5173'}${trackerPath}`
    : null;
  const qrValue = suggestedUrl ?? trackerUrl;

  function handleCopy() {
    navigator.clipboard?.writeText(qrValue).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="fixed inset-0 bg-ink/50 flex items-center justify-center p-6 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-panel max-w-sm w-full p-7 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-clinical-500 mb-1">
          Token issued
        </p>
        <h3 id="qr-modal-title" className="font-mono text-3xl font-bold text-ink mb-1">
          #{patient.tokenId}
        </h3>
        <p className="text-ink/60 mb-6">{patient.name}</p>

        {isLocalOnly && (
          <p className="text-left text-xs text-signal-600 bg-signal-50 border border-signal-500/20 rounded-lg px-3 py-2 mb-4 leading-relaxed">
            {suggestedUrl
              ? "This QR code has been automatically pointed at your computer's network address instead of localhost, since that's what phones on the same Wi-Fi need. If it still doesn't scan, double-check both devices are on the same network."
              : "This QR code points at localhost and won't open on a phone. Reopen the dashboard using this computer's network address (printed by npm run dev) and generate the token again."}
          </p>
        )}

        <div className="bg-paper border border-line rounded-xl p-5 inline-block mb-4">
          <QRCodeSVG value={qrValue} size={192} bgColor="#F7F8F6" fgColor="#132A3A" />
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="w-full text-sm font-semibold text-clinical-600 border border-clinical-500/30 bg-clinical-50 rounded-lg py-2 mb-6 hover:bg-clinical-500/10 transition-colors"
        >
          {copied ? 'Link copied' : 'Copy tracking link'}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-ink text-white font-semibold py-2.5 hover:bg-ink-light transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
