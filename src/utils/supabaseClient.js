// src/utils/supabaseClient.js
//
// Thin wrapper around the Supabase client. The app is designed to run
// two ways:
//   - Configured: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set
//     (see .env.example) -> patients/clinics live in a real cloud table
//     and the phone tracker updates in real time over the internet.
//   - Unconfigured: no env vars set -> dataStore.js transparently falls
//     back to localStorage + a URL-encoded fallback so the app still
//     runs for local demos without any setup.
//
// Nothing else in the app should import '@supabase/supabase-js'
// directly — always go through dataStore.js so both modes stay in sync.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
