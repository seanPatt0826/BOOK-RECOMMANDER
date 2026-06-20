"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const router = useRouter();

  async function handleLogIn(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setIsError(true);
      setMessage(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function handleSignUp() {
    setMessage(null);
    if (password.length < 6) {
      setIsError(true);
      setMessage("Password must be at least 6 characters.");
      return;
    }
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setIsError(true);
      setMessage(error.message);
      return;
    }
    // If email confirmation is off, a session is returned and we're logged in.
    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }
    setIsError(false);
    setMessage(
      "Account created. Now click “Log in” with the same email and password.",
    );
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-20">
      <div className="rounded-2xl border border-edge bg-surface p-7 shadow-sm">
        <h1 className="mb-2 text-3xl font-semibold">Sign in</h1>
        <p className="mb-6 text-sm text-muted">
          New here? Pick a password and click <strong>Create account</strong>.
          Already have one? Click <strong>Log in</strong>.
        </p>

        <form onSubmit={handleLogIn} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-edge bg-paper px-3 py-2 text-ink placeholder:text-muted/70 focus:border-accent"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (at least 6 characters)"
            className="w-full rounded-lg border border-edge bg-paper px-3 py-2 text-ink placeholder:text-muted/70 focus:border-accent"
          />
          <Button type="submit" variant="primary" className="w-full">Log in</Button>
          <Button type="button" onClick={handleSignUp} variant="secondary"
            className="w-full border-accent text-accent hover:bg-surface-2">
            Create account
          </Button>
        </form>

        {message && (
          <p
            className={`mt-4 text-sm ${
              isError ? "text-danger" : "text-success"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
