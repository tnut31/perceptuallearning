"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type StudentRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  class_id: string | null;
};

type AssessmentOption = {
  assigned_assessment_id: string;
  assessment_id: string;
  class_id: string;
  title: string;
  week_number: number | null;
  type: string | null;
};

type StudentResultRow = {
  student_id: string;
  assigned_assessment_id: string;
  student_name: string;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  has_responses: boolean;
  score: string;
};

type QuestionResultRow = {
  question_id: string;
  question_order: number | null;
  question_text: string;
  standard_code: string | null;
  cluster: string | null;
  correct: number;
  total: number;
  average: number;
};

type AssessmentRelation = {
  title: string | null;
  week_number: number | null;
  type: string | null;
};

type AssignmentQueryRow = {
  id: string;
  assessment_id: string;
  class_id: string;
  assessments: AssessmentRelation | AssessmentRelation[] | null;
};

type AttemptRow = {
  student_id: string;
  assigned_assessment_id: string;
  started_at: string | null;
  submitted_at: string | null;
};

type QuestionRelation = {
  id: string;
  question_text: string | null;
  question_order: number | null;
  standard_code: string | null;
  cluster: string | null;
};

type ResponseRow = {
  student_id: string;
  assigned_assessment_id: string;
  question_id: string;
  score: number | null;
  questions: QuestionRelation | QuestionRelation[] | null;
};

type AssessmentQuestionRow = {
  question_order: number | null;
  questions: QuestionRelation | QuestionRelation[] | null;
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default function TeacherResultsPage() {
  const [viewMode, setViewMode] = useState<"student" | "class">("student");
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [assessmentOptions, setAssessmentOptions] = useState<AssessmentOption[]>([]);
  const [studentResults, setStudentResults] = useState<StudentResultRow[]>([]);
  const [questionResults, setQuestionResults] = useState<QuestionResultRow[]>([]);
  const [classAverage, setClassAverage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadResults() {
      const supabase = createClient();
      setIsLoading(true);

      const { data: assignments, error: assignmentError } = await supabase
        .from("assigned_assessments")
        .select(`
          id,
          assessment_id,
          class_id,
          assessments (
            title,
            week_number,
            type
          )
        `);

      if (assignmentError) {
        console.error("Error loading assignments:", assignmentError);
        setIsLoading(false);
        return;
      }

      const assignmentRows = (assignments || []) as unknown as AssignmentQueryRow[];

      const options: AssessmentOption[] = assignmentRows.map((row) => {
        const assessment = firstRelation(row.assessments);

        return {
          assigned_assessment_id: row.id,
          assessment_id: row.assessment_id,
          class_id: row.class_id,
          title: assessment?.title || "Untitled Assignment",
          week_number: assessment?.week_number ?? null,
          type: assessment?.type || null,
        };
      });

      setAssessmentOptions(options);

      const activeAssessmentId =
        selectedAssessmentId || options[0]?.assigned_assessment_id || "";

      const activeClassId =
        selectedClassId ||
        options.find((option) => option.assigned_assessment_id === activeAssessmentId)
          ?.class_id ||
        "";

      if (!selectedAssessmentId && activeAssessmentId) {
        setSelectedAssessmentId(activeAssessmentId);
      }

      if (!selectedClassId && activeClassId) {
        setSelectedClassId(activeClassId);
      }

      if (!activeAssessmentId || !activeClassId) {
        setStudentResults([]);
        setQuestionResults([]);
        setClassAverage(0);
        setIsLoading(false);
        return;
      }

      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, first_name, last_name, class_id")
        .eq("class_id", activeClassId);

      if (studentsError) {
        console.error("Error loading roster:", studentsError);
        setIsLoading(false);
        return;
      }

      const roster = (students || []) as StudentRow[];

      const { data: attempts, error: attemptsError } = await supabase
        .from("assessment_attempts")
        .select("student_id, assigned_assessment_id, started_at, submitted_at")
        .eq("assigned_assessment_id", activeAssessmentId);

      if (attemptsError) {
        console.error("Error loading attempts:", attemptsError);
      }

      const { data: responses, error: responsesError } = await supabase
        .from("responses")
        .select(`
          student_id,
          assigned_assessment_id,
          question_id,
          score,
          questions (
            id,
            question_text,
            question_order,
            standard_code,
            cluster
          )
        `)
        .eq("assigned_assessment_id", activeAssessmentId);

      if (responsesError) {
        console.error("Error loading responses:", responsesError);
      }

      const activeAssessment = options.find(
        (option) => option.assigned_assessment_id === activeAssessmentId
      );

      const { data: assessmentQuestionData } = activeAssessment?.assessment_id
        ? await supabase
            .from("assessment_questions")
            .select(
              `
              question_order,
              questions (
                id,
                question_text,
                question_order,
                standard_code,
                cluster
              )
            `
            )
            .eq("assessment_id", activeAssessment.assessment_id)
            .order("question_order", { ascending: true })
        : { data: null };

      const attemptRows = (attempts || []) as unknown as AttemptRow[];
      const responseRows = (responses || []) as unknown as ResponseRow[];
      const assessmentQuestionRows =
        (assessmentQuestionData || []) as unknown as AssessmentQuestionRow[];
      const assessmentQuestionById = new Map(
        assessmentQuestionRows
          .map((row) => {
            const question = firstRelation(row.questions);
            return question
              ? [
                  question.id,
                  {
                    question,
                    question_order: row.question_order,
                  },
                ]
              : null;
          })
          .filter(
            (
              row
            ): row is [
              string,
              { question: QuestionRelation; question_order: number | null },
            ] => Boolean(row)
          )
      );

      const attemptMap = new Map<string, AttemptRow>();
      attemptRows.forEach((attempt) => {
        attemptMap.set(attempt.student_id, attempt);
      });

      const responsesByStudent = new Map<string, ResponseRow[]>();
      responseRows.forEach((response) => {
        if (!responsesByStudent.has(response.student_id)) {
          responsesByStudent.set(response.student_id, []);
        }
        responsesByStudent.get(response.student_id)?.push(response);
      });

      const formattedStudentResults: StudentResultRow[] = roster.map((student) => {
        const attempt = attemptMap.get(student.id);
        const studentResponses = responsesByStudent.get(student.id) || [];
        const hasResponses = studentResponses.length > 0;

        const gradedRows = studentResponses.filter((row) => row.score !== null);
        const earned = gradedRows.reduce(
          (sum, row) => sum + Number(row.score),
          0
        );
        const total = gradedRows.length;

        const score =
          hasResponses && total > 0
            ? `${earned}/${total} (${Math.round((earned / total) * 100)}%)`
            : "-";

        // Student status is response-aware so submitted work is completed even
        // if assessment_attempts.submitted_at was not updated correctly.
        let status = "Not Started Yet";

        if (hasResponses || attempt?.submitted_at) {
          status = "Completed";
        } else if (attempt?.started_at) {
          status = `Started on ${new Date(attempt.started_at).toLocaleString()}`;
        }

        return {
          student_id: student.id,
          assigned_assessment_id: activeAssessmentId,
          student_name: `${student.first_name || ""} ${student.last_name || ""}`.trim(),
          status,
          started_at: attempt?.started_at || null,
          submitted_at: attempt?.submitted_at || null,
          has_responses: hasResponses,
          score,
        };
      });

      const groupedByQuestion = new Map<string, ResponseRow[]>();

      responseRows.forEach((row) => {
        const questionId = row.question_id;
        if (!groupedByQuestion.has(questionId)) {
          groupedByQuestion.set(questionId, []);
        }
        groupedByQuestion.get(questionId)?.push(row);
      });

      const scoredResponses = responseRows.filter(
        (row) => row.score !== null
      );
      const totalCorrect = scoredResponses.reduce(
        (sum, row) => sum + Number(row.score),
        0
      );
      const totalPossible = scoredResponses.length;

      // Class averages intentionally use only scored response rows, excluding
      // not-started students and started students with no submitted responses.
      setClassAverage(
        totalPossible > 0 ? Math.round((totalCorrect / totalPossible) * 100) : 0
      );

      const formattedQuestionResults: QuestionResultRow[] = Array.from(
        groupedByQuestion.entries()
      )
        .map(([questionId, group]) => {
          const first = group[0];
          const assessmentQuestion = assessmentQuestionById.get(questionId);
          const question =
            assessmentQuestion?.question || firstRelation(first.questions);

          const correct = group.reduce(
            (sum, row) => sum + Number(row.score ?? 0),
            0
          );

          const total = group.length;
          const average = total > 0 ? Math.round((correct / total) * 100) : 0;

          return {
            question_id: questionId,
            question_order:
              assessmentQuestion?.question_order ??
              question?.question_order ??
              null,
            question_text: question?.question_text || "Untitled question",
            standard_code: question?.standard_code || null,
            cluster: question?.cluster || null,
            correct,
            total,
            average,
          };
        })
        .sort((a, b) => (a.question_order ?? 0) - (b.question_order ?? 0));

      setStudentResults(formattedStudentResults);
      setQuestionResults(formattedQuestionResults);
      setIsLoading(false);
    }

    loadResults();
  }, [selectedAssessmentId, selectedClassId]);

  const selectedAssessment = assessmentOptions.find(
    (option) => option.assigned_assessment_id === selectedAssessmentId
  );

  return (
    <div>
      <h1 className="text-3xl font-semibold text-slate-900">Results</h1>

      <p className="mt-2 text-slate-600">
        Choose an assigned assignment, then review the full class roster or class performance by question.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="text-sm font-semibold text-slate-700">
          Select Assignment
        </label>

        <select
          value={selectedAssessmentId}
          onChange={(e) => {
            const nextId = e.target.value;
            const nextAssessment = assessmentOptions.find(
              (option) => option.assigned_assessment_id === nextId
            );

            setSelectedAssessmentId(nextId);
            setSelectedClassId(nextAssessment?.class_id || "");
          }}
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          {assessmentOptions.length === 0 ? (
            <option value="">No assigned assignments</option>
          ) : (
            assessmentOptions.map((assessment) => (
              <option
                key={assessment.assigned_assessment_id}
                value={assessment.assigned_assessment_id}
              >
                {assessment.title} — Week {assessment.week_number || "-"} —{" "}
                {assessment.type === "pre" ? "Pre" : "Post"}
              </option>
            ))
          )}
        </select>

        {selectedAssessment && (
          <p className="mt-3 text-sm text-slate-500">
            Viewing: {selectedAssessment.title}
          </p>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => setViewMode("student")}
          className={
            viewMode === "student"
              ? "rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white"
              : "rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
          }
        >
          Sort by Student
        </button>

        <button
          onClick={() => setViewMode("class")}
          className={
            viewMode === "class"
              ? "rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white"
              : "rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
          }
        >
          Sort by Class
        </button>
      </div>

      {viewMode === "student" ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Class Roster
          </h2>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Score</th>
                  <th className="px-4 py-3 font-semibold">Review</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-slate-500">
                      Loading roster...
                    </td>
                  </tr>
                ) : studentResults.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-slate-500">
                      No students found for this class.
                    </td>
                  </tr>
                ) : (
                  studentResults.map((result) => (
                    <tr
                      key={`${result.assigned_assessment_id}-${result.student_id}`}
                      className="border-t border-slate-200"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {result.student_name || "Unnamed Student"}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {result.status}
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {result.score}
                      </td>

                      <td className="px-4 py-3">
                        {result.has_responses ? (
                          <Link
                            href={`/teacher/results/${result.assigned_assessment_id}/${result.student_id}`}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                          >
                            Review
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Not available
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Class Performance
            </h2>

            <p className="mt-2 text-slate-600">
              Collective score by question for the selected assessment.
            </p>

            <div className="mt-5 rounded-xl bg-blue-50 p-5">
              <p className="text-sm font-semibold text-blue-700">
                Overall Class Average
              </p>
              <p className="mt-1 text-3xl font-bold text-blue-900">
                {classAverage}%
              </p>
              {questionResults.length === 0 && !isLoading && (
                <p className="mt-2 text-sm text-blue-700">
                  No completed submissions yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Question Breakdown
            </h2>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Question</th>
                    <th className="px-4 py-3 font-semibold">Standard</th>
                    <th className="px-4 py-3 font-semibold">Cluster</th>
                    <th className="px-4 py-3 font-semibold">Correct / Responses</th>
                    <th className="px-4 py-3 font-semibold">Class Avg.</th>
                  </tr>
                </thead>

                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-slate-500">
                        Loading class results...
                      </td>
                    </tr>
                  ) : questionResults.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-slate-500">
                        No completed submissions yet.
                      </td>
                    </tr>
                  ) : (
                    questionResults.map((question) => (
                      <tr
                        key={question.question_id}
                        className="border-t border-slate-200"
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">
                            Q{question.question_order || "-"}
                          </p>
                          <p className="mt-1 line-clamp-2 max-w-xl text-slate-500">
                            {question.question_text}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {question.standard_code || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {question.cluster || "-"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {question.correct}/{question.total}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              question.average < 60
                                ? "rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
                                : question.average < 80
                                  ? "rounded-lg bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700"
                                  : "rounded-lg bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                            }
                          >
                            {question.average}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
