"use client";

import Link from "next/link";
import { isAuthConfigured, sessionLabel, useSession } from "@/lib/auth";

const PILL =
  "rounded-full border border-cyan-400/30 bg-slate-950/70 px-4 py-1.5 font-mono text-xs uppercase tracking-[0.2em] text-cyan-200/80 backdrop-blur transition-colors hover:border-cyan-300/60 hover:text-cyan-100";

/** Sign-in / signed-in affordance for the home screen. Renders nothing until
 *  auth state is known, and nothing at all when Supabase isn't configured. */
export default function AuthChip() {
  const session = useSession();

  if (!isAuthConfigured || session === undefined) return null;

  if (!session) {
    return (
      <Link href="/login" className={`absolute left-4 top-4 ${PILL}`}>
        Sign in
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      title="Account"
      className={`absolute left-4 top-4 flex items-center gap-2 ${PILL} normal-case tracking-normal lowercase`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      <span className="max-w-[9rem] truncate">{sessionLabel(session)}</span>
    </Link>
  );
}
