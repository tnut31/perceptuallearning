"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/student");
  }

  async function signUp() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Account created. You can now log in.");
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-md">

        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">
            PerceptualLearning
          </h1>
          <p className="mt-2 text-slate-600">
            Sign in to continue
          </p>
        </div>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={login}
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-500"
          >
            Log In
          </button>

          <button
            onClick={signUp}
            className="w-full rounded-xl bg-blue-50 py-3 font-semibold text-blue-700 border border-blue-200 hover:bg-blue-100"
          >
            Create Account
          </button>
        </div>

      </div>
    </div>
  );
}