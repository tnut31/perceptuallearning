"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type Student = {
  id: string;
  class_id: string | null;
};

type AssignmentRow = {
  id: string;
  assessment_id: string;
  assessments: {
    title: string;
    week_number: number | null;
    type: string | null;
  } | null;
};

type Assignment = {
  id: string;
  assessment_id: string;
  title: string;
  week_number: number | null;
  type: string | null;
};

export default function StudentDashboardPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAssignments() {
      const supabase = createClient();

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
        setAssignments([]);
        setIsLoading(false);
        return;
      }

      const studentId = userData.user?.user_metadata?.student_id as
        | string
        | undefined;

      if (!studentId) {
        setAssignments([]);
        setIsLoading(false);
        return;
      }

      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, class_id")
        .eq("id", studentId)
        .maybeSingle<Student>();

      if (studentError) {
        console.error("Error loading student:", studentError);
        setAssignments([]);
        setIsLoading(false);
        return;
      }

      if (!student?.class_id) {
        setAssignments([]);
        setIsLoading(false);
        return;
      }

      const { data, error: assignmentError } = await supabase
        .from("assigned_assessments")
        .select("id, assessment_id, assessments(title, week_number, type)")
        .eq("class_id", student.class_id);

      if (assignmentError) {
        console.error("Error loading assignments:", assignmentError);
        setAssignments([]);
        setIsLoading(false);
        return;
      }

      const assignmentRows = (data || []) as AssignmentRow[];

      const formattedAssignments = assignmentRows
        .filter((row) => row.assessments)
        .map((row) => ({
          id: row.id,
          assessment_id: row.assessment_id,
          title: row.assessments?.title || "Untitled Assessment",
          week_number: row.assessments?.week_number ?? null,
          type: row.assessments?.type || null,
        }));

      setAssignments(formattedAssignments);
      setIsLoading(false);
    }

    loadAssignments();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-semibold text-slate-900">
        Student Dashboard
      </h1>

      <p className="mt-2 text-slate-600">
        View and start your assigned assessments.
      </p>

<div className="mt-6 grid gap-3 md:grid-cols-3">
  <Link
    href="/student/mastery"
    className="rounded-xl border border-slate-200 bg-white p-4 font-semibold text-slate-900 hover:bg-blue-50"
  >
    My Mastery
  </Link>

  <Link
    href="/student/results"
    className="rounded-xl border border-slate-200 bg-white p-4 font-semibold text-slate-900 hover:bg-blue-50"
  >
    My Results
  </Link>

  <Link
    href="/student/practice"
    className="rounded-xl border border-slate-200 bg-white p-4 font-semibold text-slate-900 hover:bg-blue-50"
  >
    Skills Practice
  </Link>
</div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Assignments</h2>

        <div className="mt-4 space-y-3">
          {isLoading ? (
            <p className="text-slate-500">Loading assignments...</p>
          ) : assignments.length === 0 ? (
            <p className="text-slate-500">No assignments yet.</p>
          ) : (
            assignments.map((assignment) => (
              <Link
                key={assignment.id}
                href={`/student/test/${assignment.id}`}
                className="block rounded-xl border border-slate-200 p-4 hover:border-blue-200 hover:bg-blue-50"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {assignment.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Week {assignment.week_number || "-"}
                    </p>
                  </div>

                  <span className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                    {assignment.type === "pre" ? "Pre" : "Post"}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
