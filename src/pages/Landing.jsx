import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  findClinicByEmail,
  registerClinic,
  setActiveSession,
} from '../utils/dataStore.js';
import { isSupabaseConfigured } from '../utils/supabaseClient.js';

const EMPTY_REGISTER = {
  clinicName: '',
  doctorName: '',
  email: '',
  password: '',
};

const EMPTY_LOGIN = { email: '', password: '' };

export default function Landing() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN);
  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function switchMode(nextMode) {
    setMode(nextMode);
    setError('');
  }

  function handleLoginChange(field, value) {
    setLoginForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleRegisterChange(field, value) {
    setRegisterForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const email = loginForm.email.trim();
      const match = await findClinicByEmail(email);

      if (!match || match.password !== loginForm.password) {
        setError('Email and password do not match any registered clinic.');
        return;
      }

      setActiveSession(match.clinicId);
      navigate(`/clinic/${match.clinicId}/dashboard`);
    } catch (err) {
      setError('Could not reach the server right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setError('');

    const clinicName = registerForm.clinicName.trim();
    const doctorName = registerForm.doctorName.trim();
    const email = registerForm.email.trim().toLowerCase();
    const password = registerForm.password;

    if (!clinicName || !doctorName || !email || !password) {
      setError('Fill in every field to register your clinic.');
      return;
    }

    setSubmitting(true);
    try {
      const duplicate = await findClinicByEmail(email);
      if (duplicate) {
        setError('A clinic is already registered with that email. Try logging in instead.');
        return;
      }

      const clinic = await registerClinic({ clinicName, doctorName, email, password });
      setActiveSession(clinic.clinicId);
      navigate(`/clinic/${clinic.clinicId}/dashboard`);
    } catch (err) {
      setError('Could not reach the server right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-5 flex items-center gap-3">
          <PulseMark />
          <span className="text-lg font-semibold tracking-tight text-ink">MedSync</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-ink leading-tight">
              Clear the waiting room,
              <br />
              not just the schedule.
            </h1>
            <p className="mt-3 text-ink/60 leading-relaxed">
              Sign in to run today's queue, or register your clinic to get started
              in under a minute.
            </p>
            {!isSupabaseConfigured && (
              <p className="mt-4 text-xs text-clinical-600 bg-clinical-50 border border-clinical-500/20 rounded-lg px-3 py-2 leading-relaxed">
                Running in local demo mode — no cloud database is configured, so
                data stays on this device. See the README to connect Supabase
                for real cross-device tracking.
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-line shadow-panel overflow-hidden">
            <div className="grid grid-cols-2 border-b border-line" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => switchMode('login')}
                className={`py-3.5 text-sm font-semibold transition-colors ${
                  mode === 'login'
                    ? 'text-ink bg-white'
                    : 'text-ink/40 bg-ink/[0.02] hover:text-ink/60'
                }`}
              >
                Log in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                onClick={() => switchMode('register')}
                className={`py-3.5 text-sm font-semibold transition-colors ${
                  mode === 'register'
                    ? 'text-ink bg-white'
                    : 'text-ink/40 bg-ink/[0.02] hover:text-ink/60'
                }`}
              >
                Register clinic
              </button>
            </div>

            <div className="p-6">
              {mode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4" noValidate>
                  <Field
                    label="Email"
                    type="email"
                    value={loginForm.email}
                    onChange={(v) => handleLoginChange('email', v)}
                    autoComplete="email"
                    required
                  />
                  <Field
                    label="Password"
                    type="password"
                    value={loginForm.password}
                    onChange={(v) => handleLoginChange('password', v)}
                    autoComplete="current-password"
                    required
                  />
                  {error && <ErrorNote message={error} />}
                  <SubmitButton label="Log in to dashboard" busy={submitting} />
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4" noValidate>
                  <Field
                    label="Clinic name"
                    value={registerForm.clinicName}
                    onChange={(v) => handleRegisterChange('clinicName', v)}
                    placeholder="Apex Care Clinic"
                    required
                  />
                  <Field
                    label="Doctor in charge"
                    value={registerForm.doctorName}
                    onChange={(v) => handleRegisterChange('doctorName', v)}
                    placeholder="Dr. Meera Nair"
                    required
                  />
                  <Field
                    label="Email"
                    type="email"
                    value={registerForm.email}
                    onChange={(v) => handleRegisterChange('email', v)}
                    autoComplete="email"
                    required
                  />
                  <Field
                    label="Password"
                    type="password"
                    value={registerForm.password}
                    onChange={(v) => handleRegisterChange('password', v)}
                    autoComplete="new-password"
                    required
                  />
                  {error && <ErrorNote message={error} />}
                  <SubmitButton label="Create clinic account" busy={submitting} />
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, type = 'text', value, onChange, ...rest }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-ink/70 mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-ink placeholder:text-ink/30 focus:bg-white focus:border-clinical-500 transition-colors"
        {...rest}
      />
    </label>
  );
}

function SubmitButton({ label, busy = false }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full rounded-lg bg-ink text-white font-semibold py-2.5 hover:bg-ink-light transition-colors disabled:opacity-50 disabled:pointer-events-none"
    >
      {busy ? 'Please wait…' : label}
    </button>
  );
}

function ErrorNote({ message }) {
  return (
    <p className="text-sm text-signal-600 bg-signal-50 border border-signal-500/20 rounded-lg px-3 py-2">
      {message}
    </p>
  );
}

function PulseMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="13" stroke="#3B6E8F" strokeWidth="1.5" />
      <path
        d="M6 14H10.5L12.5 9L15.5 19L17.5 14H22"
        stroke="#3B6E8F"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
