"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="bg-card rounded-lg p-8 border border-surface">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted hover:text-off-white transition-colors mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        Back to home
      </Link>
      <h1 className="text-2xl font-bold mb-2">Create your account</h1>
      <p className="text-sm text-muted mb-8">Start logging your lap times for free.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted">Name</label>
          <input
            name="name"
            type="text"
            required
            value={form.name}
            onChange={handleChange}
            placeholder="John Doe"
            className="bg-surface border border-card rounded-md px-4 py-3 text-sm text-off-white placeholder:text-muted focus:outline-none focus:border-red"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted">Email</label>
          <input
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className="bg-surface border border-card rounded-md px-4 py-3 text-sm text-off-white placeholder:text-muted focus:outline-none focus:border-red"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted">Password</label>
          <input
            name="password"
            type="password"
            required
            value={form.password}
            onChange={handleChange}
            placeholder="Min. 8 characters"
            className="bg-surface border border-card rounded-md px-4 py-3 text-sm text-off-white placeholder:text-muted focus:outline-none focus:border-red"
          />
        </div>

        {error && (
          <p className="text-sm text-red-light bg-red/10 border border-red/20 rounded-md px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 px-4 py-3 rounded-md bg-red text-off-white font-semibold text-sm hover:bg-red-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="text-center text-sm text-muted mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-off-white hover:text-red transition-colors">
          Log in
        </Link>
      </p>
    </div>
  );
}
