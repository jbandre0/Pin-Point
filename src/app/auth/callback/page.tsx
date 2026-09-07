"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

// The magic link lands here with a ?code=… param. The Supabase browser client
// is configured with detectSessionInUrl + PKCE, so it exchanges the code on
// init; we just wait for the session, then bounce home.
export default function AuthCallbackPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      router.replace("/");
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      router.replace("/");
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) finish();
    });
    const timer = setTimeout(() => {
      if (!done) setFailed(true);
    }, 6000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10 text-sm text-slate-300">
      {failed ? (
        <>
          <p className="text-rose-400">
            That sign-in link didn&rsquo;t work — it may have expired or already
            been used.
          </p>
          <Link
            href="/login"
            className="mt-4 text-cyan-300/80 hover:text-cyan-200"
          >
            Try again
          </Link>
        </>
      ) : (
        <p>Signing you in…</p>
      )}
    </main>
  );
}
