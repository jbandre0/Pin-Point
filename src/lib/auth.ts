"use client";

// Thin auth layer over the Supabase browser client. Magic-link (email OTP)
// only — no passwords. Everything runs client-side; the app is unchanged for
// signed-out users.

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isAuthConfigured } from "./supabase";

export { isAuthConfigured };

/**
 * Current auth session, kept in sync with Supabase.
 * `undefined` = still loading; `null` = signed out; `Session` = signed in.
 */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(
    isAuthConfigured ? undefined : null,
  );

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setSession(null);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return session;
}

/** Send a magic-link sign-in email. */
export async function signInWithEmail(email: string): Promise<{ error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { error: "Sign-in is not configured." };
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  });
  return error ? { error: error.message } : {};
}

export async function signOut(): Promise<void> {
  await getSupabase()?.auth.signOut();
}

/** Short display label for the signed-in user. */
export function sessionLabel(session: Session): string {
  return session.user.email ?? session.user.id.slice(0, 8);
}
