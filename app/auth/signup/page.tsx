"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/auth/onboarding");
    }
  };

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-serif text-3xl text-gold tracking-wider inline-block mb-6">
            BESTIE
          </Link>
          <h1 className="text-2xl font-semibold text-bestie mb-1">Join Bestie</h1>
          <p className="text-muted text-sm">Build your social passport</p>
        </div>

        <form onSubmit={handleSignup} className="card-base p-8 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="label-base">Full name</label>
            <input
              type="text"
              className="input-base"
              placeholder="Your name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label-base">Email</label>
            <input
              type="email"
              className="input-base"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="label-base">Password</label>
            <input
              type="password"
              className="input-base"
              placeholder="At least 8 characters"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full justify-center py-3 disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>

          <p className="text-xs text-muted/60 text-center">
            By signing up you agree to our Terms of Service. 18+ only.
          </p>
        </form>

        <p className="text-center text-muted text-sm mt-6">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-gold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
