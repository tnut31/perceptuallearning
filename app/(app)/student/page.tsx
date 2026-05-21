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
  assigned_at: string | null;
  class_id?: string | null;
  assessments:
    | {
        title: string;
        week_number: number | null;
        type: string | null;
      }
    | {
        title: string;
        week_number: number | null;
        type: string | null;
      }[]
    | null;
};

type Assignment = {
  id: string;
  assessment_id: string;
  title: string;
  week_number: number | null;
  type: string | null;
  assigned_at: string | null;
  status: string;
};

type AttemptRow = {
  assigned_assessment_id: string;
  submitted_at: string | null;
  started_at: string | null;
};

type ResponseRow = {
  assigned_assessment_id: string;
};

const ASSIGNMENT_SECTIONS = [
  { type: "pre", title: "Pre Tests" },
  { type: "post", title: "Post Tests" },
  { type: "formative", title: "Knowledge Checks" },
  { type: "practice", title: "Practice" },
  { type: "reteach", title: "Reteach" },
  { type: "enrichment", title: "Enrichment" },
] as const;

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function formatAssignmentType(value: string | null) {
  if (value === "pre") return "Pre Test";
  if (value === "post") return "Post Test";
  if (value === "formative") return "Knowledge Check";
  if (value === "practice") return "Practice";
  if (value === "reteach") return "Reteach";
  if (value === "enrichment") return "Enrichment";
  return "Assignment";
}

function formatAssignedDate(value: string | null) {
  if (!value) return "Assigned date unavailable";
  return `Assigned ${new Date(value).toLocaleDateString()}`;
}

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
        .select(
          "id, assessment_id, assigned_at, class_id, assessments(title, week_number, type)"
        )
        .eq("class_id", student.class_id);

      if (assignmentError) {
        console.error("Error loading assignments:", assignmentError);
        setAssignments([]);
        setIsLoading(false);
        return;
      }

      const assignmentRows = (data || []) as unknown as AssignmentRow[];
      const assignmentIds = assignmentRows.map((row) => row.id);

      const { data: attempts } =
        assignmentIds.length > 0
          ? await supabase
              .from("assessment_attempts")
              .select("assigned_assessment_id, started_at, submitted_at")
              .eq("student_id", studentId)
              .in("assigned_assessment_id", assignmentIds)
          : { data: [] };

      const { data: responses } =
        assignmentIds.length > 0
          ? await supabase
              .from("responses")
              .select("assigned_assessment_id")
              .eq("student_id", studentId)
              .in("assigned_assessment_id", assignmentIds)
          : { data: [] };

      const attemptsByAssignment = new Map(
        ((attempts || []) as AttemptRow[]).map((attempt) => [
          attempt.assigned_assessment_id,
          attempt,
        ])
      );
      const assignmentsWithResponses = new Set(
        ((responses || []) as ResponseRow[]).map(
          (response) => response.assigned_assessment_id
        )
      );

      const formattedAssignments = assignmentRows
        .filter((row) => row.assessments)
        .map((row) => {
          const assessment = firstRelation(row.assessments);
          const attempt = attemptsByAssignment.get(row.id);
          const hasResponses = assignmentsWithResponses.has(row.id);

          let status = "Not started";
          if (attempt?.submitted_at || hasResponses) {
            status = "Completed";
          } else if (attempt?.started_at) {
            status = "Started";
          }

          return {
            id: row.id,
            assessment_id: row.assessment_id,
            title: assessment?.title || "Untitled Assignment",
            week_number: assessment?.week_number ?? null,
            type: assessment?.type || null,
            assigned_at: row.assigned_at,
            status,
          };
        })
        .sort((a, b) => {
          const aTime = a.assigned_at ? new Date(a.assigned_at).getTime() : 0;
          const bTime = b.assigned_at ? new Date(b.assigned_at).getTime() : 0;
          return bTime - aTime;
        });

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
        View and start the work your teacher assigned.
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

      <div className="mt-8 space-y-6">
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-slate-500">Loading assignments...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-slate-500">No assignments yet.</p>
          </div>
        ) : (
          ASSIGNMENT_SECTIONS.map((section) => {
            const sectionAssignments = assignments.filter(
              (assignment) => assignment.type === section.type
            );

            if (sectionAssignments.length === 0) return null;

            return (
              <section
                key={section.type}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-xl font-semibold text-slate-900">
                  {section.title}
                </h2>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {sectionAssignments.map((assignment) => (
                    <Link
                      key={assignment.id}
                      href={`/student/test/${assignment.id}`}
                      className="block rounded-xl border border-slate-200 p-4 hover:border-blue-200 hover:bg-blue-50"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {assignment.title}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {assignment.week_number
                              ? `Week ${assignment.week_number}`
                              : formatAssignedDate(assignment.assigned_at)}
                          </p>
                          {assignment.week_number && (
                            <p className="mt-1 text-sm text-slate-500">
                              {formatAssignedDate(assignment.assigned_at)}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                            {formatAssignmentType(assignment.type)}
                          </span>
                          <span
                            className={
                              assignment.status === "Completed"
                                ? "rounded-lg bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700"
                                : assignment.status === "Started"
                                  ? "rounded-lg bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700"
                                  : "rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700"
                            }
                          >
                            {assignment.status}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
