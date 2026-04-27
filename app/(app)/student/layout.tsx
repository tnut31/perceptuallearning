"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [displayName, setDisplayName] = useState("Student");

  useEffect(() => {
    async function checkRole() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();

      const user = data.user;
      const role = user?.user_metadata?.role;

      if (!user) {
        router.replace("/login");
        return;
      }

      if (role !== "student") {
        router.replace("/teacher");
        return;
      }

      const name =
        user.user_metadata?.full_name ||
        user.email ||
        "Student";

      setDisplayName(name);
      setIsCheckingRole(false);
    }

    checkRole();
  }, [router]);

  if (isCheckingRole) {
    return <div className="p-8 text-slate-600">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-blue-800 text-white">
        <div className="flex items-center justify-between px-8 py-5">
          <Link href="/student" className="text-3xl font-bold">
            PerceptualLearning
          </Link>

          <div className="rounded-full bg-blue-700 px-3 py-1 text-sm">
            👤 {displayName}
          </div>
        </div>

        <nav className="border-t border-blue-700 bg-blue-700 px-8">
          <div className="flex gap-8">
            <Link href="/student" className="px-2 py-4 font-semibold">
              Dashboard
            </Link>
            <Link href="/student/results" className="px-2 py-4 font-semibold">
              My Results
            </Link>
            <Link href="/student/mastery" className="px-2 py-4 font-semibold">
              My Mastery
            </Link>
            <Link href="/student/practice" className="px-2 py-4 font-semibold">
              Skills Practice
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-8 py-8">{children}</main>
    </div>
  );
}