"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type Level = "Strong" | "Developing" | "Needs Support";
type AssessmentFilter = "all" | "pre" | "post";

type QuestionRelation = {
  cluster: string | null;
  standard_code: string | null;
};

type AssessmentRelation = {
  title: string | null;
  week_number: number | null;
  type: string | null;
};

type AssignedAssessmentRelation = {
  assessments: AssessmentRelation | AssessmentRelation[] | null;
};

type ResponseRow = {
  score: number | null;
  teacher_score?: number | null;
  questions: QuestionRelation | QuestionRelation[] | null;
  assigned_assessments: AssignedAssessmentRelation | AssignedAssessmentRelation[] | null;
};

type MasterySummary = {
  name: string;
  correct: number;
  total: number;
  percent: number;
  level: Level;
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function getFinalScore(response: Pick<ResponseRow, "teacher_score" | "score">) {
  return response.teacher_score ?? response.score;
}

function getLevel(percent: number): Level {
  if (percent >= 80) return "Strong";
  if (percent >= 60) return "Developing";
  return "Needs Support";
}

function getLevelStyles(level: Level) {
  if (level === "Strong") {
    return {
      badge: "bg-green-100 text-green-700",
      bar: "bg-green-500",
      soft: "bg-green-50",
    };
  }

  if (level === "Developing") {
    return {
      badge: "bg-yellow-100 text-yellow-700",
      bar: "bg-yellow-500",
      soft: "bg-yellow-50",
    };
  }

  return {
    badge: "bg-red-100 text-red-700",
    bar: "bg-red-500",
    soft: "bg-red-50",
  };
}

function makeSummary(name: string, correct: number, total: number): MasterySummary {
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

  return {
    name,
    correct,
    total,
    percent,
    level: getLevel(percent),
  };
}

function getAssessmentType(response: ResponseRow) {
  const assignedAssessment = firstRelation(response.assigned_assessments);
  const assessment = firstRelation(assignedAssessment?.assessments);

  return assessment?.type ?? null;
}

function buildClusterMastery(rows: ResponseRow[], assessmentFilter: AssessmentFilter) {
  const clusters = new Map<
    string,
    {
      correct: number;
      total: number;
      standards: Map<string, { correct: number; total: number }>;
    }
  >();

  rows
    .filter((response) => {
      const finalScore = getFinalScore(response);
      const assessmentType = getAssessmentType(response);

      return (
        finalScore !== null &&
        finalScore !== undefined &&
        (assessmentFilter === "all" || assessmentType === assessmentFilter)
      );
    })
    .forEach((response) => {
      const finalScore = getFinalScore(response);

      const question = firstRelation(response.questions);
      const clusterName = question?.cluster || "Uncategorized";
      const standardCode = question?.standard_code || "No standard";

      if (!clusters.has(clusterName)) {
        clusters.set(clusterName, {
          correct: 0,
          total: 0,
          standards: new Map<string, { correct: number; total: number }>(),
        });
      }

      const cluster = clusters.get(clusterName);
      if (!cluster) return;

      cluster.correct += Number(finalScore);
      cluster.total += 1;

      const standard = cluster.standards.get(standardCode) || {
        correct: 0,
        total: 0,
      };

      standard.correct += Number(finalScore);
      standard.total += 1;
      cluster.standards.set(standardCode, standard);
    });

  return Array.from(clusters.entries())
    .map(([clusterName, cluster]) => ({
      ...makeSummary(clusterName, cluster.correct, cluster.total),
      standards: Array.from(cluster.standards.entries())
        .map(([standardCode, standard]) =>
          makeSummary(standardCode, standard.correct, standard.total)
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default function StudentMasteryPage() {
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [assessmentFilter, setAssessmentFilter] =
    useState<AssessmentFilter>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMastery() {
      const supabase = createClient();

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
        setResponses([]);
        setIsLoading(false);
        return;
      }

      const studentId = userData.user?.user_metadata?.student_id as
        | string
        | undefined;

      if (!studentId) {
        setResponses([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("responses")
        .select(`
          score,
          teacher_score,
          questions (
            cluster,
            standard_code
          ),
          assigned_assessments (
            assessments (
              title,
              week_number,
              type
            )
          )
        `)
        .eq("student_id", studentId);

      if (error) {
        console.error("Error loading mastery:", error);
        setResponses([]);
        setIsLoading(false);
        return;
      }

      setResponses((data || []) as unknown as ResponseRow[]);
      setIsLoading(false);
    }

    loadMastery();
  }, []);

  const clusters = useMemo(
    () => buildClusterMastery(responses, assessmentFilter),
    [responses, assessmentFilter]
  );

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">My Mastery</h1>
          <p className="mt-2 text-slate-600">
            Track your progress by skill cluster and standard.
          </p>
        </div>

        <Link
          href="/student"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="text-sm font-semibold text-slate-700">
          Mastery Includes
        </label>
        <select
          value={assessmentFilter}
          onChange={(e) => setAssessmentFilter(e.target.value as AssessmentFilter)}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 md:max-w-sm"
        >
          <option value="all">All Assessments</option>
          <option value="pre">Pre-Tests Only</option>
          <option value="post">Post-Tests Only</option>
        </select>
      </div>

      {isLoading ? (
        <p className="mt-8 text-slate-500">Loading mastery data...</p>
      ) : clusters.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
          No mastery data yet for this filter.
        </div>
      ) : (
        <div className="mt-8 grid gap-4">
          {clusters.map((cluster) => {
            const styles = getLevelStyles(cluster.level);

            return (
              <section
                key={cluster.name}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {cluster.name}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {cluster.correct}/{cluster.total} correct
                    </p>
                  </div>

                  <div className={`rounded-xl px-4 py-3 text-right ${styles.soft}`}>
                    <p className="text-2xl font-semibold text-slate-900">
                      {cluster.percent}%
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-lg px-3 py-1 text-xs font-semibold ${styles.badge}`}
                    >
                      {cluster.level}
                    </span>
                  </div>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${styles.bar}`}
                    style={{ width: `${cluster.percent}%` }}
                  />
                </div>

                <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Standard</th>
                        <th className="px-4 py-3 font-semibold">Correct / Total</th>
                        <th className="px-4 py-3 font-semibold">Percent</th>
                        <th className="px-4 py-3 font-semibold">Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cluster.standards.map((standard) => {
                        const standardStyles = getLevelStyles(standard.level);

                        return (
                          <tr
                            key={`${cluster.name}-${standard.name}`}
                            className="border-t border-slate-200"
                          >
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {standard.name}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {standard.correct}/{standard.total}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {standard.percent}%
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-lg px-3 py-1 text-xs font-semibold ${standardStyles.badge}`}
                              >
                                {standard.level}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
