"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import Link from "next/link";

type Result = {
  assigned_assessment_id: string;
  title: string;
  week_number: number | null;
  type: string | null;
  status: string;
  score: string;
};

export default function StudentResultsPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadResults() {
      const supabase = createClient();

      const { data: userData } = await supabase.auth.getUser();
      const studentId = userData.user?.user_metadata?.student_id as
        | string
        | undefined;

      if (!studentId) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      const { data: responses, error } = await supabase
        .from("responses")
        .select(`
          assigned_assessment_id,
          score,
          assigned_assessments (
            id,
            assessments (
              title,
              week_number,
              type
            )
          )
        `)
        .eq("student_id", studentId);

      if (error) {
        console.error("Error loading results:", error);
        setResults([]);
        setIsLoading(false);
        return;
      }

      const grouped = new Map<string, any[]>();

      (responses || []).forEach((response: any) => {
        const key = response.assigned_assessment_id;

        if (!grouped.has(key)) {
          grouped.set(key, []);
        }

        grouped.get(key)?.push(response);
      });

      const formattedResults: Result[] = Array.from(grouped.entries()).map(
        ([assignedAssessmentId, rows]) => {
          const first = rows[0];
          const assessment =
            first.assigned_assessments?.assessments;

          const gradedRows = rows.filter((row) => row.score !== null);

          const earnedPoints = gradedRows.reduce(
  (sum, row) => sum + Number(row.score),
  0
);


const totalPoints = rows.length;

const score =
  gradedRows.length > 0
    ? `${earnedPoints}/${totalPoints} (${Math.round(
        (earnedPoints / totalPoints) * 100
      )}%)`
    : "Submitted";

          return {
            assigned_assessment_id: assignedAssessmentId,
            title: assessment?.title || "Untitled Assessment",
            week_number: assessment?.week_number ?? null,
            type: assessment?.type || null,
            status: "Completed",
            score,
          };
        }
      );

      setResults(formattedResults);
      setIsLoading(false);
    }

    loadResults();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-semibold text-slate-900">My Results</h1>

      <p className="mt-2 text-slate-600">
        View your raw assessment scores.
      </p>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          Assessment Results
        </h2>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Assessment</th>
                <th className="px-4 py-3 font-semibold">Week</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Review</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-slate-500">
                    Loading results...
                  </td>
                </tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-slate-500">
                    No results yet.
                  </td>
                </tr>
              ) : (
                results.map((result) => (
                  <tr
                    key={result.assigned_assessment_id}
                    className="border-t border-slate-200"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {result.title}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {result.week_number || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {result.type === "pre" ? "Pre" : "Post"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {result.status}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {result.score}
                    </td>
                    <td className="px-4 py-3">
                            <Link
                                href={`/student/results/${result.assigned_assessment_id}`}
                                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                            >
                                Review
                            </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}