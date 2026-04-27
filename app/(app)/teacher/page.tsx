"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
      } else {
        setUserEmail(data.user.email || "");
      }
    }

    checkUser();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-5xl mx-auto">

        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-semibold text-slate-900">
            Dashboard
          </h1>

          <button
            onClick={logout}
            className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
          >
            Log Out
          </button>
        </div>

      

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 p-6 shadow-sm">
            <p className="text-sm text-slate-500">Class Mastery</p>
            <p className="mt-2 text-3xl font-semibold text-blue-600">72%</p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-6 shadow-sm">
            <p className="text-sm text-slate-500">Top Misconception</p>
            <p className="mt-2 text-lg font-semibold">
              Reversed Ratio
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-6 shadow-sm">
            <p className="text-sm text-slate-500">Students Needing Support</p>
            <p className="mt-2 text-3xl font-semibold text-blue-600">6</p>
          </div>
        </div>

      </div>
    </div>
  );
}