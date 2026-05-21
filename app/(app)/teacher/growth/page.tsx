"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type AssessmentType = "pre" | "post";

type ClassItem = {
  id: string;
  name: string;
};

type StudentRelation = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  class_id: string | null;
};

type StudentRow = StudentRelation;

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
  students: StudentRelation | StudentRelation[] | null;
  questions: QuestionRelation | QuestionRelation[] | null;
  assigned_assessments: AssignedAssessmentRelation | AssignedAssessmentRelation[] | null;
};

type ScoreBucket = {
  correct: number;
  total: number;
};

type StudentWeekGrowth = {
  key: string;
  studentId: string;
  studentName: string;
  weekNumber: number;
  prePercent: number | null;
  postPercent: number | null;
  growth: number | null;
};

type WeekGrowth = {
  weekNumber: number;
  preAverage: number | null;
  postAverage: number | null;
  growth: number | null;
  studentsWithBoth: number;
};

type GroupGrowth = {
  key: string;
  label: string;
  cluster: string;
  preAverage: number | null;
  postAverage: number | null;
  growth: number | null;
  scoredResponses: number;
};

type GrowthData = {
  averagePre: number | null;
  averagePost: number | null;
  averageGrowth: number | null;
  weekRows: WeekGrowth[];
  studentRows: StudentWeekGrowth[];
  clusterRows: GroupGrowth[];
  standardRows: GroupGrowth[];
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function getFinalScore(response: Pick<ResponseRow, "teacher_score" | "score">) {
  return response.teacher_score ?? response.score;
}

function percentFromBucket(bucket: ScoreBucket | undefined) {
  if (!bucket || bucket.total === 0) return null;
  return Math.round((bucket.correct / bucket.total) * 100);
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function formatPercent(value: number | null) {
  return value === null ? "-" : `${value}%`;
}

function formatGrowth(value: number | null) {
  if (value === null) return "-";
  return `${value > 0 ? "+" : ""}${value}`;
}

function growthColor(value: number | null) {
  if (value === null) return "text-slate-500";
  if (value > 0) return "text-green-600";
  if (value < 0) return "text-red-600";
  return "text-slate-700";
}

function upsertBucket(
  map: Map<
    string,
    {
      label: string;
      cluster: string;
      pre: ScoreBucket;
      post: ScoreBucket;
    }
  >,
  key: string,
  label: string,
  cluster: string,
  type: AssessmentType,
  score: number
) {
  const group = map.get(key) || {
    label,
    cluster,
    pre: { correct: 0, total: 0 },
    post: { correct: 0, total: 0 },
  };

  group[type].correct += score;
  group[type].total += 1;
  map.set(key, group);
}

function buildGroupRows(
  map: Map<
    string,
    {
      label: string;
      cluster: string;
      pre: ScoreBucket;
      post: ScoreBucket;
    }
  >
) {
  return Array.from(map.entries())
    .map(([key, group]) => {
      const preAverage = percentFromBucket(group.pre);
      const postAverage = percentFromBucket(group.post);

      return {
        key,
        label: group.label,
        cluster: group.cluster,
        preAverage,
        postAverage,
        growth:
          preAverage !== null && postAverage !== null
            ? postAverage - preAverage
            : null,
        scoredResponses: group.pre.total + group.post.total,
      };
    })
    .sort((a, b) => a.cluster.localeCompare(b.cluster) || a.label.localeCompare(b.label));
}

function buildGrowth(rows: ResponseRow[], selectedWeek: string): GrowthData {
  const studentWeekBuckets = new Map<
    string,
    {
      studentId: string;
      studentName: string;
      weekNumber: number;
      pre?: ScoreBucket;
      post?: ScoreBucket;
    }
  >();
  const clusterBuckets = new Map<
    string,
    {
      label: string;
      cluster: string;
      pre: ScoreBucket;
      post: ScoreBucket;
    }
  >();
  const standardBuckets = new Map<
    string,
    {
      label: string;
      cluster: string;
      pre: ScoreBucket;
      post: ScoreBucket;
    }
  >();

  rows.forEach((response) => {
    const finalScore = getFinalScore(response);
    if (finalScore === null || finalScore === undefined) return;

    const student = firstRelation(response.students);
    const assignedAssessment = firstRelation(response.assigned_assessments);
    const assessment = firstRelation(assignedAssessment?.assessments);
    const assessmentType = assessment?.type;
    const weekNumber = assessment?.week_number;

    if (!student) return;
    if (assessmentType !== "pre" && assessmentType !== "post") return;
    if (weekNumber === null || weekNumber === undefined) return;
    if (selectedWeek !== "all" && weekNumber !== Number(selectedWeek)) return;

    const question = firstRelation(response.questions);
    const cluster = question?.cluster || "Uncategorized";
    const standard = question?.standard_code || "No standard";
    const typeKey = assessmentType as AssessmentType;
    const numericScore = Number(finalScore);

    const studentName =
      `${student.first_name || ""} ${student.last_name || ""}`.trim() ||
      "Unnamed Student";
    const key = `${student.id}-${weekNumber}`;
    const bucket = studentWeekBuckets.get(key) || {
      studentId: student.id,
      studentName,
      weekNumber,
    };

    const scoreBucket = bucket[typeKey] || { correct: 0, total: 0 };
    scoreBucket.correct += numericScore;
    scoreBucket.total += 1;
    bucket[typeKey] = scoreBucket;

    studentWeekBuckets.set(key, bucket);

    upsertBucket(clusterBuckets, cluster, cluster, cluster, typeKey, numericScore);
    upsertBucket(
      standardBuckets,
      `${cluster}-${standard}`,
      standard,
      cluster,
      typeKey,
      numericScore
    );
  });

  const studentRows: StudentWeekGrowth[] = Array.from(studentWeekBuckets.entries())
    .map(([key, bucket]) => {
      const prePercent = percentFromBucket(bucket.pre);
      const postPercent = percentFromBucket(bucket.post);

      return {
        key,
        studentId: bucket.studentId,
        studentName: bucket.studentName,
        weekNumber: bucket.weekNumber,
        prePercent,
        postPercent,
        growth:
          prePercent !== null && postPercent !== null
            ? postPercent - prePercent
            : null,
      };
    })
    .sort(
      (a, b) =>
        a.weekNumber - b.weekNumber ||
        a.studentName.localeCompare(b.studentName)
    );

  const weekMap = new Map<number, StudentWeekGrowth[]>();
  studentRows.forEach((row) => {
    if (!weekMap.has(row.weekNumber)) {
      weekMap.set(row.weekNumber, []);
    }

    weekMap.get(row.weekNumber)?.push(row);
  });

  const weekRows: WeekGrowth[] = Array.from(weekMap.entries())
    .map(([weekNumber, weekStudentRows]) => {
      const preScores = weekStudentRows
        .map((row) => row.prePercent)
        .filter((value): value is number => value !== null);
      const postScores = weekStudentRows
        .map((row) => row.postPercent)
        .filter((value): value is number => value !== null);
      const growthScores = weekStudentRows
        .map((row) => row.growth)
        .filter((value): value is number => value !== null);

      return {
        weekNumber,
        preAverage: average(preScores),
        postAverage: average(postScores),
        growth: average(growthScores),
        studentsWithBoth: growthScores.length,
      };
    })
    .sort((a, b) => a.weekNumber - b.weekNumber);

  const allPreScores = studentRows
    .map((row) => row.prePercent)
    .filter((value): value is number => value !== null);
  const allPostScores = studentRows
    .map((row) => row.postPercent)
    .filter((value): value is number => value !== null);
  const allGrowthScores = studentRows
    .map((row) => row.growth)
    .filter((value): value is number => value !== null);

  return {
    averagePre: average(allPreScores),
    averagePost: average(allPostScores),
    averageGrowth: average(allGrowthScores),
    weekRows,
    studentRows,
    clusterRows: buildGroupRows(clusterBuckets),
    standardRows: buildGroupRows(standardBuckets),
  };
}

export default function TeacherGrowthPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadClasses() {
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

      const classRows = (classData || []) as ClassItem[];
      setClasses(classRows);

      if (classRows.length > 0) {
        setSelectedClassId((current) => current || classRows[0].id);
      }
    }

    loadClasses();
  }, []);

  useEffect(() => {
    async function loadGrowthData() {
      if (!selectedClassId) {
        setStudents([]);
        setResponses([]);
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      setIsLoading(true);

      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id, first_name, last_name, class_id")
        .eq("class_id", selectedClassId)
        .order("last_name", { ascending: true });

      if (studentError) {
        console.error("Error loading students:", studentError);
        setStudents([]);
        setResponses([]);
        setIsLoading(false);
        return;
      }

      const studentRows = (studentData || []) as StudentRow[];
      setStudents(studentRows);

      if (studentRows.length === 0) {
        setResponses([]);
        setIsLoading(false);
        return;
      }

      const studentIds = studentRows.map((student) => student.id);

      const { data, error } = await supabase
        .from("responses")
        .select(`
          score,
          teacher_score,
          students (
            id,
            first_name,
            last_name,
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
        `)
        .in("student_id", studentIds);

      if (error) {
        console.error("Error loading growth responses:", error);
        setResponses([]);
        setIsLoading(false);
        return;
      }

      setResponses((data || []) as unknown as ResponseRow[]);
      setIsLoading(false);
    }

    loadGrowthData();
  }, [selectedClassId]);

  const availableWeeks = useMemo(() => {
    const weeks = new Set<number>();

    responses.forEach((response) => {
      const assignedAssessment = firstRelation(response.assigned_assessments);
      const assessment = firstRelation(assignedAssessment?.assessments);

      if (assessment?.week_number !== null && assessment?.week_number !== undefined) {
        weeks.add(assessment.week_number);
      }
    });

    return Array.from(weeks).sort((a, b) => a - b);
  }, [responses]);

  const effectiveSelectedWeek =
    selectedWeek === "all" || availableWeeks.includes(Number(selectedWeek))
      ? selectedWeek
      : "all";

  const growth = useMemo(
    () => buildGrowth(responses, effectiveSelectedWeek),
    [effectiveSelectedWeek, responses]
  );

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Growth Tracking
          </h1>
          <p className="mt-2 text-slate-600">
            Compare pre-test and post-test performance over time.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700">Class</label>
            <select
              value={selectedClassId}
              onChange={(event) => {
                setSelectedClassId(event.target.value);
                setSelectedWeek("all");
              }}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 md:min-w-64"
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
            <label className="text-sm font-semibold text-slate-700">Week</label>
            <select
              value={effectiveSelectedWeek}
              onChange={(event) => setSelectedWeek(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 md:min-w-48"
            >
              <option value="all">All Weeks</option>
              {availableWeeks.map((week) => (
                <option key={week} value={String(week)}>
                  Week {week}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-8 text-slate-500">Loading growth data...</p>
      ) : !selectedClassId || students.length === 0 || growth.studentRows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
          No growth data yet.
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">
                Average Pre-Test
              </p>
              <p className="mt-2 text-3xl font-bold text-blue-900">
                {formatPercent(growth.averagePre)}
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">
                Average Post-Test
              </p>
              <p className="mt-2 text-3xl font-bold text-blue-900">
                {formatPercent(growth.averagePost)}
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">
                Average Growth
              </p>
              <p
                className={`mt-2 text-3xl font-bold ${growthColor(
                  growth.averageGrowth
                )}`}
              >
                {formatGrowth(growth.averageGrowth)}
                {growth.averageGrowth !== null ? " pts" : ""}
              </p>
            </section>
          </div>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Week Growth
            </h2>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Week</th>
                    <th className="px-4 py-3 font-semibold">
                      Pre-Test Average
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Post-Test Average
                    </th>
                    <th className="px-4 py-3 font-semibold">Growth</th>
                    <th className="px-4 py-3 font-semibold">
                      Students with Both Scores
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {growth.weekRows.map((week) => (
                    <tr key={week.weekNumber} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        Week {week.weekNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatPercent(week.preAverage)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatPercent(week.postAverage)}
                      </td>
                      <td
                        className={`px-4 py-3 font-semibold ${growthColor(
                          week.growth
                        )}`}
                      >
                        {formatGrowth(week.growth)}
                        {week.growth !== null ? " pts" : ""}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {week.studentsWithBoth}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Student Growth
            </h2>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Student</th>
                    <th className="px-4 py-3 font-semibold">Week</th>
                    <th className="px-4 py-3 font-semibold">Pre-Test</th>
                    <th className="px-4 py-3 font-semibold">Post-Test</th>
                    <th className="px-4 py-3 font-semibold">Growth</th>
                  </tr>
                </thead>

                <tbody>
                  {growth.studentRows.map((student) => (
                    <tr key={student.key} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {student.studentName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        Week {student.weekNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatPercent(student.prePercent)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatPercent(student.postPercent)}
                      </td>
                      <td
                        className={`px-4 py-3 font-semibold ${growthColor(
                          student.growth
                        )}`}
                      >
                        {formatGrowth(student.growth)}
                        {student.growth !== null ? " pts" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Growth by Cluster
            </h2>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Cluster</th>
                    <th className="px-4 py-3 font-semibold">Pre-Test Avg</th>
                    <th className="px-4 py-3 font-semibold">Post-Test Avg</th>
                    <th className="px-4 py-3 font-semibold">Growth</th>
                    <th className="px-4 py-3 font-semibold">
                      Scored Responses
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {growth.clusterRows.map((cluster) => (
                    <tr key={cluster.key} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {cluster.label}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatPercent(cluster.preAverage)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatPercent(cluster.postAverage)}
                      </td>
                      <td
                        className={`px-4 py-3 font-semibold ${growthColor(
                          cluster.growth
                        )}`}
                      >
                        {formatGrowth(cluster.growth)}
                        {cluster.growth !== null ? " pts" : ""}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {cluster.scoredResponses}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Growth by Standard
            </h2>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Standard</th>
                    <th className="px-4 py-3 font-semibold">Cluster</th>
                    <th className="px-4 py-3 font-semibold">Pre-Test Avg</th>
                    <th className="px-4 py-3 font-semibold">Post-Test Avg</th>
                    <th className="px-4 py-3 font-semibold">Growth</th>
                    <th className="px-4 py-3 font-semibold">
                      Scored Responses
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {growth.standardRows.map((standard) => (
                    <tr key={standard.key} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {standard.label}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {standard.cluster}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatPercent(standard.preAverage)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatPercent(standard.postAverage)}
                      </td>
                      <td
                        className={`px-4 py-3 font-semibold ${growthColor(
                          standard.growth
                        )}`}
                      >
                        {formatGrowth(standard.growth)}
                        {standard.growth !== null ? " pts" : ""}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {standard.scoredResponses}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
