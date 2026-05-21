"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type Level = "Strong" | "Developing" | "Needs Support";
type AssessmentFilter = "all" | "pre" | "post";

type ClassItem = {
  id: string;
  name: string;
};

type StudentRelation = {
  id: string;
  class_id: string | null;
};

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

type AssignedAssessmentOption = {
  id: string;
  class_id: string;
  title: string;
  week_number: number | null;
  type: string | null;
};

type ResponseRow = {
  assigned_assessment_id: string;
  score: number | null;
  teacher_score?: number | null;
  students: StudentRelation | StudentRelation[] | null;
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

type StandardMastery = MasterySummary & {
  cluster: string;
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

function buildMastery(
  rows: ResponseRow[],
  selectedClassId: string,
  assessmentFilter: AssessmentFilter,
  selectedAssessmentId: string
) {
  const scoredRows = rows.filter((response) => {
    const student = firstRelation(response.students);
    const finalScore = getFinalScore(response);
    const assessmentType = getAssessmentType(response);

    return (
      finalScore !== null &&
      finalScore !== undefined &&
      student?.class_id === selectedClassId &&
      (assessmentFilter === "all" || assessmentType === assessmentFilter) &&
      (!selectedAssessmentId ||
        response.assigned_assessment_id === selectedAssessmentId)
    );
  });

  const clusterGroups = new Map<string, { correct: number; total: number }>();
  const standardGroups = new Map<
    string,
    { cluster: string; correct: number; total: number }
  >();

  scoredRows.forEach((response) => {
    const question = firstRelation(response.questions);
    const finalScore = Number(getFinalScore(response));
    const clusterName = question?.cluster || "Uncategorized";
    const standardCode = question?.standard_code || "No standard";

    const cluster = clusterGroups.get(clusterName) || { correct: 0, total: 0 };
    cluster.correct += finalScore;
    cluster.total += 1;
    clusterGroups.set(clusterName, cluster);

    const standard = standardGroups.get(standardCode) || {
      cluster: clusterName,
      correct: 0,
      total: 0,
    };
    standard.correct += finalScore;
    standard.total += 1;
    standardGroups.set(standardCode, standard);
  });

  const totalCorrect = scoredRows.reduce(
    (sum, response) => sum + Number(getFinalScore(response)),
    0
  );
  const totalPossible = scoredRows.length;
  const overallPercent =
    totalPossible > 0 ? Math.round((totalCorrect / totalPossible) * 100) : 0;

  const clusters = Array.from(clusterGroups.entries())
    .map(([name, group]) => makeSummary(name, group.correct, group.total))
    .sort((a, b) => a.name.localeCompare(b.name));

  const standards: StandardMastery[] = Array.from(standardGroups.entries())
    .map(([name, group]) => ({
      ...makeSummary(name, group.correct, group.total),
      cluster: group.cluster,
    }))
    .sort((a, b) => a.cluster.localeCompare(b.cluster) || a.name.localeCompare(b.name));

  return {
    overallCorrect: totalCorrect,
    overallTotal: totalPossible,
    overallPercent,
    clusters,
    standards,
  };
}

export default function MasteryTrackerPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [assessmentOptions, setAssessmentOptions] = useState<
    AssignedAssessmentOption[]
  >([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [assessmentFilter, setAssessmentFilter] =
    useState<AssessmentFilter>("all");
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMastery() {
      const supabase = createClient();

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
      }

      const userId = userData.user?.id;

      const classesQuery = supabase
        .from("classes")
        .select("id, name")
        .order("created_at", { ascending: true });

      const { data: classData, error: classError } = userId
        ? await classesQuery.eq("teacher_id", userId)
        : await classesQuery;

      if (classError) {
        console.error("Error loading classes:", classError);
      }

      setClasses((classData || []) as ClassItem[]);
      const classRows = (classData || []) as ClassItem[];

      if (classRows.length > 0) {
        setSelectedClassId((current) => current || classRows[0].id);
      }

      const { data: assignmentData, error: assignmentError } = await supabase
        .from("assigned_assessments")
        .select(`
          id,
          class_id,
          assessments (
            title,
            week_number,
            type
          )
        `);

      if (assignmentError) {
        console.error("Error loading assigned assessments:", assignmentError);
      }

      const assignments = (
        (assignmentData || []) as unknown as {
          id: string;
          class_id: string;
          assessments: AssessmentRelation | AssessmentRelation[] | null;
        }[]
      ).map((assignment) => {
        const assessment = firstRelation(assignment.assessments);

        return {
          id: assignment.id,
          class_id: assignment.class_id,
          title: assessment?.title || "Untitled Assignment",
          week_number: assessment?.week_number ?? null,
          type: assessment?.type || null,
        };
      });

      setAssessmentOptions(assignments);

      const { data, error } = await supabase
        .from("responses")
        .select(`
          assigned_assessment_id,
          score,
          teacher_score,
          students (
            id,
            class_id
          ),
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
        `);

      if (error) {
        console.error("Error loading teacher mastery:", error);
        setResponses([]);
        setIsLoading(false);
        return;
      }

      setResponses((data || []) as unknown as ResponseRow[]);
      setIsLoading(false);
    }

    loadMastery();
  }, []);

  const matchingAssessmentOptions = useMemo(
    () =>
      assessmentOptions.filter(
        (assessment) =>
          assessment.class_id === selectedClassId &&
          (assessmentFilter === "all" || assessment.type === assessmentFilter)
      ),
    [assessmentFilter, assessmentOptions, selectedClassId]
  );

  const effectiveSelectedAssessmentId = matchingAssessmentOptions.some(
    (assessment) => assessment.id === selectedAssessmentId
  )
    ? selectedAssessmentId
    : "";

  const mastery = useMemo(
    () =>
      buildMastery(
        responses,
        selectedClassId,
        assessmentFilter,
        effectiveSelectedAssessmentId
      ),
    [assessmentFilter, effectiveSelectedAssessmentId, responses, selectedClassId]
  );

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Mastery Tracker
          </h1>
          <p className="mt-2 text-slate-600">
            Track class mastery by cluster and standard using scored responses.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-semibold text-slate-700">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedAssessmentId("");
              }}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              {classes.length === 0 ? (
                <option value="">No classes</option>
              ) : (
                classes.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Assignment Type
            </label>
            <select
              value={assessmentFilter}
              onChange={(e) => {
                setAssessmentFilter(e.target.value as AssessmentFilter);
                setSelectedAssessmentId("");
              }}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All Assignments</option>
              <option value="pre">Pre-Tests Only</option>
              <option value="post">Post-Tests Only</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Assignment
            </label>
            <select
              value={effectiveSelectedAssessmentId}
              onChange={(e) => setSelectedAssessmentId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All Matching Assignments</option>
              {matchingAssessmentOptions.map((assessment) => (
                <option key={assessment.id} value={assessment.id}>
                  {assessment.title} - Week {assessment.week_number || "-"} -{" "}
                  {assessment.type === "pre" ? "Pre" : "Post"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-8 text-slate-500">Loading mastery data...</p>
      ) : mastery.overallTotal === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
          No mastery data yet for this filter.
        </div>
      ) : (
        <>
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-blue-700">
              Overall Class Mastery
            </p>
            <p className="mt-2 text-4xl font-bold text-blue-900">
              {mastery.overallPercent}%
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {mastery.overallCorrect}/{mastery.overallTotal} correct across scored
              responses
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {mastery.clusters.map((cluster) => {
              const styles = getLevelStyles(cluster.level);

              return (
                <section
                  key={cluster.name}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
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
                </section>
              );
            })}
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Standard Mastery
            </h2>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Standard</th>
                    <th className="px-4 py-3 font-semibold">Cluster</th>
                    <th className="px-4 py-3 font-semibold">Correct / Total</th>
                    <th className="px-4 py-3 font-semibold">Percent</th>
                    <th className="px-4 py-3 font-semibold">Level</th>
                  </tr>
                </thead>

                <tbody>
                  {mastery.standards.map((standard) => {
                    const styles = getLevelStyles(standard.level);

                    return (
                      <tr key={standard.name} className="border-t border-slate-200">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {standard.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {standard.cluster}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {standard.correct}/{standard.total}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {standard.percent}%
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-lg px-3 py-1 text-xs font-semibold ${styles.badge}`}
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
          </div>
        </>
      )}
    </div>
  );
}
