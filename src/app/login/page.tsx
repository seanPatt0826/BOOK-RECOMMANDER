"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${siteUrl}/auth/callback` },
    });
    setStatus(error ? "error" : "sent");
  }

  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${siteUrl}/auth/callback` },
    });
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold">Sign in</h1>

      <form onSubmit={sendMagicLink} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          className="w-full rounded bg-indigo-600 px-3 py-2 font-medium text-white hover:bg-indigo-700"
        >
          Email me a magic link
        </button>
      </form>

      {status === "sent" && (
        <p className="mt-3 text-sm text-green-700">
          Check your email for the sign-in link.
        </p>
      )}
      {status === "error" && (
        <p className="mt-3 text-sm text-red-700">
          Something went wrong. Please try again.
        </p>
      )}

      <div className="my-6 text-center text-sm text-gray-500">or</div>

      <button
        onClick={signInWithGoogle}
        className="w-full rounded border border-gray-300 px-3 py-2 font-medium hover:bg-gray-50"
      >
        Continue with Google
      </button>
    </main>
  );
}
