"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Incorrect email or password.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-asphalt flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 justify-center mb-6 sm:mb-8">
          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-amber rounded-md flex items-center justify-center font-sign font-bold text-asphalt text-lg sm:text-xl shadow-md">
            P
          </div>
          <div>
            <h1 className="font-sign font-semibold text-lane text-lg sm:text-xl leading-none">Shambhu Car Parking</h1>
            <p className="text-steel text-xs mt-1">Operator sign in</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 sm:p-7 border border-steelLine shadow-xl">
          <div className="mb-4">
            <label className="block text-xs font-semibold text-steel mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-steelLine rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber bg-white"
              placeholder="operator@shambhu.in"
              autoComplete="email"
            />
          </div>
          <div className="mb-5">
            <label className="block text-xs font-semibold text-steel mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-steelLine rounded-md text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber bg-white"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-stop text-xs font-semibold mb-4 bg-stop/10 border border-stop/20 p-2.5 rounded-md">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber hover:bg-amberDim transition-transform active:scale-[0.99] text-asphalt font-bold text-base py-3.5 rounded-lg shadow-sm disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-center text-steel text-xs mt-5">
          Accounts are created in the Supabase dashboard — ask your admin for access.
        </p>
      </div>
    </div>
  );
}

