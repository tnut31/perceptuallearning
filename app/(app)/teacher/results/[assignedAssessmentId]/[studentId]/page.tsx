"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type ReviewResponse = {
  id: string;
  question_id: string;
  answer_text: string | null;
  score: number | null;
  teacher_score: number | null;
  teacher_feedback: string | null;
  is_overridden: boolean | null;
  questions: {
    id: string;
    question_text: string;
    question_html: string | null;
    image_url: string | null;
    question_order: number | null;
    answer_key: string | null;
    standard_code: string | null;
    cluster: string | null;
  } | null;
};

type AssessmentRelation = {
  title: string | null;
};

type AssignmentRow = {
  assessment_id: string;
  assessments: AssessmentRelation | AssessmentRelation[] | null;
};

type QuestionRelation = {
  id: string;
  question_text: string | null;
  question_html: string | null;
  image_url: string | null;
  question_order: number | null;
  answer_key: string | null;
  standard_code: string | null;
  cluster: string | null;
};

type AssessmentQuestionRow = {
  question_order: number | null;
  questions: QuestionRelation | QuestionRelation[] | null;
};

type ResponseRow = {
  id: string;
  question_id: string;
  answer_text: string | null;
  score: number | null;
  teacher_score: number | null;
  teacher_feedback: string | null;
  is_overridden: boolean | null;
  questions: QuestionRelation | QuestionRelation[] | null;
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function sanitizeQuestionHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/\s(href|src)=["']javascript:[^"']*["']/gi, "");
}

function formatQuestionHtml(html: string) {
  return sanitizeQuestionHtml(html).replace(/\n/g, "<br />");
}

export default function TeacherReviewPage() {
  const params = useParams<{
    assignedAssessmentId: string;
    studentId: string;
  }>();

  const { assignedAssessmentId, studentId } = params;

  const [responses, setResponses] = useState<ReviewResponse[]>([]);
  const [studentName, setStudentName] = useState("Student");
  const [assessmentTitle, setAssessmentTitle] = useState("Assignment Review");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [teacherScore, setTeacherScore] = useState("");
const [teacherFeedback, setTeacherFeedback] = useState("");
const [isSavingOverride, setIsSavingOverride] = useState(false);

  useEffect(() => {
    async function loadReview() {
      const supabase = createClient();

      const { data: student } = await supabase
        .from("students")
        .select("first_name, last_name")
        .eq("id", studentId)
        .maybeSingle();

      if (student) {
        setStudentName(
          `${student.first_name || ""} ${student.last_name || ""}`.trim()
        );
      }

      const { data: assignment } = await supabase
        .from("assigned_assessments")
        .select("assessment_id, assessments(title)")
        .eq("id", assignedAssessmentId)
        .maybeSingle<AssignmentRow>();

      const assessment = firstRelation(assignment?.assessments);
      const title = assessment?.title;
      if (title) setAssessmentTitle(title);

      const { data, error } = await supabase
        .from("responses")
        .select(`
          id,
          question_id,
          answer_text,
          score,
          teacher_score,
teacher_feedback,
  is_overridden,
          questions (
            id,
            question_text,
            question_order,
            question_html,
            image_url,
            answer_key,
            standard_code,
            cluster
          )
        `)
        .eq("student_id", studentId)
        .eq("assigned_assessment_id", assignedAssessmentId);

      if (error) {
        console.error("Error loading teacher review:", error);
        setIsLoading(false);
        return;
      }

      const responseRows = (data || []) as unknown as ResponseRow[];

      if (!assignment?.assessment_id) {
        setResponses(
          responseRows.map((response, index) => {
            const question = firstRelation(response.questions);

            return {
              ...response,
              questions: question
                ? {
                    ...question,
                    question_text: question.question_text || "",
                    question_order: question.question_order ?? index + 1,
                  }
                : null,
            };
          })
        );
        setIsLoading(false);
        return;
      }

      const { data: assessmentQuestionData } = await supabase
        .from("assessment_questions")
        .select(
          `
          question_order,
          questions (
            id,
            question_text,
            question_html,
            image_url,
            question_order,
            answer_key,
            standard_code,
            cluster
          )
        `
        )
        .eq("assessment_id", assignment.assessment_id)
        .order("question_order", { ascending: true });

      const responseByQuestionId = new Map(
        responseRows.map((response) => [response.question_id, response])
      );

      const orderedResponses = (
        (assessmentQuestionData || []) as unknown as AssessmentQuestionRow[]
      )
        .map((row): ReviewResponse | null => {
          const question = firstRelation(row.questions);
          if (!question) return null;

          const response = responseByQuestionId.get(question.id);
          if (!response) return null;

          return {
            id: response.id,
            question_id: response.question_id,
            answer_text: response.answer_text,
            score: response.score,
            teacher_score: response.teacher_score,
            teacher_feedback: response.teacher_feedback,
            is_overridden: response.is_overridden,
            questions: {
              ...question,
              question_text: question.question_text || "",
              question_order: row.question_order,
            },
          };
        })
        .filter((response): response is ReviewResponse => Boolean(response));

      const sorted =
        orderedResponses.length > 0
          ? orderedResponses
          : responseRows
              .map((response): ReviewResponse => {
                const question = firstRelation(response.questions);

                return {
                  ...response,
                  questions: question
                    ? {
                        ...question,
                        question_text: question.question_text || "",
                        question_order: question.question_order,
                      }
                    : null,
                };
              })
              .sort(
                (a, b) =>
                  (a.questions?.question_order ?? 0) -
                  (b.questions?.question_order ?? 0)
              );

      setResponses(sorted);
      setIsLoading(false);
    }

    loadReview();
  }, [assignedAssessmentId, studentId]);

  const current = responses[currentIndex];
const question = current?.questions;

  useEffect(() => {
  if (!current) return;

  // eslint-disable-next-line react-hooks/set-state-in-effect
  setTeacherScore(
    current.teacher_score !== null && current.teacher_score !== undefined
      ? String(current.teacher_score)
      : ""
  );

  setTeacherFeedback(current.teacher_feedback || "");
}, [current]);
async function saveOverride() {
  if (!current) return;

  const supabase = createClient();
  setIsSavingOverride(true);

  const { data: userData } = await supabase.auth.getUser();

  const scoreValue =
    teacherScore.trim() === "" ? null : Number(teacherScore);

  const { error } = await supabase
    .from("responses")
    .update({
      teacher_score: scoreValue,
      teacher_feedback: teacherFeedback,
      is_overridden: scoreValue !== null || teacherFeedback.trim() !== "",
      graded_by: userData.user?.id || null,
      graded_at: new Date().toISOString(),
    })
    .eq("id", current.id);

  if (error) {
    console.error("Error saving override:", error);
    setIsSavingOverride(false);
    return;
  }

  setResponses((prev) =>
    prev.map((response) =>
      response.id === current.id
        ? {
            ...response,
            teacher_score: scoreValue,
            teacher_feedback: teacherFeedback,
            is_overridden: scoreValue !== null || teacherFeedback.trim() !== "",
          }
        : response
    )
  );

  setIsSavingOverride(false);
}


  const earned = responses.reduce(
  (sum, response) =>
    sum + Number(response.teacher_score ?? response.score ?? 0),
  0
);

  const total = responses.length;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            {assessmentTitle}
          </h1>
          <p className="mt-2 text-slate-600">
            Reviewing {studentName}&apos;s assessment.
          </p>
        </div>

        <Link
          href="/teacher/results"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to Results
        </Link>
      </div>

      {isLoading ? (
        <p className="text-slate-500">Loading review...</p>
      ) : responses.length === 0 ? (
        <p className="text-slate-500">No responses found.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <p className="font-semibold text-slate-700">
    Question {currentIndex + 1} of {responses.length}
  </p>

  <select
    value={currentIndex}
    onChange={(e) => setCurrentIndex(Number(e.target.value))}
    className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
  >
    {responses.map((_, index) => (
      <option key={index} value={index}>
        Question {index + 1}
      </option>
    ))}
  </select>
</div>

              <p className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                Score: {current?.teacher_score ?? current?.score ?? "-"} / 1
              </p>
            </div>

            <h2 className="text-xl font-semibold leading-relaxed text-slate-900">
              {question?.question_text || "Untitled question"}
            </h2>

            {question?.question_html && (
              <div
                className="mt-4 max-w-3xl whitespace-normal text-slate-900 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2"
                dangerouslySetInnerHTML={{
                  __html: formatQuestionHtml(question.question_html),
                }}
              />
            )}

            {question?.image_url && (
              <div className="mt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={question.image_url}
                  alt="Question visual"
                  className="h-auto max-h-96 w-full max-w-2xl rounded-2xl border border-slate-200 object-contain shadow-sm"
                />
              </div>
            )}

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-600">
                Student Answer
              </p>
              <p className="mt-2 whitespace-pre-wrap text-lg text-slate-900">
                {current?.answer_text || "No answer submitted"}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                disabled={currentIndex === 0}
                className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>

              <button
                onClick={() =>
                  setCurrentIndex((prev) =>
                    Math.min(prev + 1, responses.length - 1)
                  )
                }
                disabled={currentIndex === responses.length - 1}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Feedback & Analysis
            </h2>

            <div className="mt-5 space-y-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-700">
                  Assignment Score
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {earned}/{total}{" "}
                  <span className="text-base font-semibold text-slate-500">
                    ({Math.round((earned / total) * 100)}%)
                  </span>
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-700">Standard</p>
                <p className="mt-1 text-slate-900">
                  {question?.standard_code || "No standard tagged"}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-700">Cluster</p>
                <p className="mt-1 text-slate-900">
                  {question?.cluster || "No cluster tagged"}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-700">Answer Key</p>
                <p className="mt-1 rounded-lg bg-slate-50 p-3 text-slate-900">
                  {question?.answer_key || "No answer key entered"}
                </p>
              </div>

              <div>
                <p className="font-semibold text-slate-700">Auto Feedback</p>
                <p className="mt-1 rounded-lg bg-slate-50 p-3 text-slate-700">
                  {current?.score === 1
                    ? "Correct. The student response matched the answer key."
                    : current?.score === 0
                      ? "Incorrect or unmatched. Review the student response and compare it to the answer key."
                      : "This question has not been graded yet."}
                </p>
              </div>

              <div className="border-t border-slate-200 pt-4">
  <p className="font-semibold text-slate-700">Teacher Override</p>

  <label className="mt-3 block text-sm font-semibold text-slate-600">
    Manual Score
  </label>

  <select
    value={teacherScore}
    onChange={(e) => setTeacherScore(e.target.value)}
    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
  >
    <option value="">Use auto score</option>
    <option value="0">0</option>
    <option value="0.5">0.5</option>
    <option value="1">1</option>
  </select>

  <label className="mt-4 block text-sm font-semibold text-slate-600">
    Teacher Feedback
  </label>

  <textarea
    value={teacherFeedback}
    onChange={(e) => setTeacherFeedback(e.target.value)}
    placeholder="Add feedback for the student..."
    className="mt-1 min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
  />

  <button
    onClick={saveOverride}
    disabled={isSavingOverride}
    className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
  >
    {isSavingOverride ? "Saving..." : "Save Override"}
  </button>

  {current?.is_overridden && (
    <p className="mt-3 text-sm font-semibold text-green-700">
      Override saved
    </p>
  )}
</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
