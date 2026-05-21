"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const actionCards = [
  {
    title: "Results",
    description:
      "Review student submissions, scores, and question-level performance.",
    href: "/teacher/results",
  },
  {
    title: "Mastery Tracker",
    description: "Track class and student mastery by standard and cluster.",
    href: "/teacher/mastery",
  },
  {
    title: "Growth Tracking",
    description: "Compare pre-test and post-test growth over time.",
    href: "/teacher/growth",
  },
];

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

          
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {actionCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
            >
              <h2 className="text-lg font-semibold text-slate-900">
                {card.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {card.description}
              </p>
            </Link>
          ))}
      </div>

      </div>
    </div>
  );
}
