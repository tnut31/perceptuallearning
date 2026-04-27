"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [displayName, setDisplayName] = useState("Teacher");

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

      if (role !== "teacher") {
        router.replace("/student");
        return;
      }

      const name =
        user.user_metadata?.full_name ||
        user.email ||
        "Teacher";

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
          <Link href="/teacher" className="text-3xl font-bold">
            PerceptualLearning
          </Link>

          <div className="rounded-full bg-blue-700 px-3 py-1 text-sm">
            👤 {displayName}
          </div>
        </div>

        <nav className="border-t border-blue-700 bg-blue-700 px-8">
          <div className="flex gap-8">
            <Link href="/teacher" className="px-2 py-4 font-semibold hover:border-white">
              Dashboard
            </Link>
            <Link href="/teacher/assessments" className="px-2 py-4 font-semibold">
              Assessments
            </Link>
            <Link href="/teacher/mastery" className="px-2 py-4 font-semibold">
              Mastery Tracker
            </Link>
            <Link href="/teacher/classes" className="px-2 py-4 font-semibold">
              Classes
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-8 py-8">{children}</main>
    </div>
  );
}