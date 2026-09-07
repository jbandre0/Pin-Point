"use client";

// Browser-only Supabase client.
//
// The whole app stays statically rendered — auth and the per-user progress
// row are handled entirely client-side. If the env vars are absent the client
// is null and the app runs exactly as before, on localStorage alone.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isAuthConfigured = Boolean(url && anonKey);

let _client: SupabaseClient | null = null;

/** The shared browser client, or null when Supabase env vars are not set. */
export function getSupabase(): SupabaseClient | null {
  if (!isAuthConfigured) return null;
  if (_client) return _client;
  _client = createClient(url!, anonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
  return _client;
}

// The single per-user table: one JSONB blob of the fact-state map.
export const PROGRESS_TABLE = "progress";
