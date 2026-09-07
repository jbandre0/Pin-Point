"use client";

import Link from "next/link";
import { useState } from "react";
import {
  isAuthConfigured,
  sessionLabel,
  signInWithEmail,
  signOut,
  useSession,
} from "@/lib/auth";

const PRIMARY_BTN =
  "rounded-lg bg-cyan-500/90 px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400";

export default function LoginPage() {
  const session = useSession();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const { error } = await signInWithEmail(email);
    setSending(false);
    if (error) setError(error);
    else setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <h1 className="text-2xl font-semibold text-slate-50">Sign in to Pin Point</h1>
      <p className="mt-2 text-sm text-slate-400">
        Your familiarity progress syncs to your account so it follows you between
        devices. Signed out, it stays on this browser only.
      </p>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6">
        {!isAuthConfigured ? (
          <p className="text-sm text-amber-400">
            Sign-in isn&rsquo;t configured yet — no Supabase keys in this build.
          </p>
        ) : session ? (
          <div className="text-sm text-slate-300">
            <p>
              Signed in as{" "}
              <span className="text-cyan-200">{sessionLabel(session)}</span>.
            </p>
            <div className="mt-4 flex gap-3">
              <Link href="/" className={PRIMARY_BTN}>
                Go to the map
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : sent ? (
          <div className="text-sm text-slate-300">
            <p>
              Check <span className="text-cyan-200">{email}</span> for a sign-in
              link. Open it on this device.
            </p>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
              className="mt-4 text-xs text-slate-500 hover:text-slate-300"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-xs font-mono uppercase tracking-[0.16em] text-slate-500">
              Email
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/60"
            />
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <button type="submit" disabled={sending} className={PRIMARY_BTN}>
              {sending ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>

      <Link
        href="/"
        className="mt-8 text-sm text-cyan-300/80 hover:text-cyan-200"
      >
        ← World map
      </Link>
    </main>
  );
}
