"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type Assignment = {
  id: string;
  assessment_id: string;
};

type Question = {
  id: string;
  question_text: string;
  question_order: number | null;
};

export default function StudentTestPage() {
  const params = useParams<{ id: string }>();
  const assignedAssessmentId = params.id;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadTest() {
      const supabase = createClient();

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
        setErrorMessage("Could not load student account.");
        setIsLoading(false);
        return;
      }

      const currentStudentId = userData.user?.user_metadata?.student_id as
        | string
        | undefined;

      if (!currentStudentId) {
        setErrorMessage("No student account is linked to this login.");
        setIsLoading(false);
        return;
      }

      setStudentId(currentStudentId);

      const { data: assignment, error: assignmentError } = await supabase
        .from("assigned_assessments")
        .select("id, assessment_id")
        .eq("id", assignedAssessmentId)
        .maybeSingle<Assignment>();

      if (assignmentError || !assignment) {
        console.error("Error loading assignment:", assignmentError);
        setErrorMessage("Could not load this assigned assessment.");
        setIsLoading(false);
        return;
      }

      const { data: questionData, error: questionError } = await supabase
        .from("questions")
        .select("id, question_text, question_order")
        .eq("assessment_id", assignment.assessment_id)
        .order("question_order", { ascending: true });

      if (questionError) {
        console.error("Error loading questions:", questionError);
        setErrorMessage("Could not load questions.");
        setIsLoading(false);
        return;
      }

      setQuestions((questionData || []) as Question[]);
      setIsLoading(false);
    }

    loadTest();
  }, [assignedAssessmentId]);

  const currentQuestion = questions[currentQuestionIndex];

  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id] || ""
    : "";

  const isLastQuestion =
    questions.length > 0 && currentQuestionIndex === questions.length - 1;

  function updateAnswer(value: string) {
    if (!currentQuestion) return;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  }

  function goToNextQuestion() {
    setCurrentQuestionIndex((prev) =>
      Math.min(prev + 1, questions.length - 1)
    );
  }

  function goToPreviousQuestion() {
    setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0));
  }

  async function submitTest() {
    if (!studentId) return;

    setIsSubmitting(true);
    setErrorMessage("");

    const supabase = createClient();

    const responseRows = questions.map((question) => ({
      student_id: studentId,
      assigned_assessment_id: assignedAssessmentId,
      question_id: question.id,
      answer_text: answers[question.id] || "",
      score: null,
    }));

    const { error } = await supabase
      .from("responses")
      .upsert(responseRows, {
        onConflict: "student_id,assigned_assessment_id,question_id",
      });

    if (error) {
      console.error("Error submitting responses:", error);
      setErrorMessage("Your test could not be submitted. Try again.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitted(true);
    setIsSubmitting(false);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Student Test
          </h1>
          <p className="mt-2 text-slate-600">
            Answer each question, then submit when you are finished.
          </p>
        </div>

        <Link
          href="/student"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {isLoading ? (
          <p className="text-slate-500">Loading questions...</p>
        ) : errorMessage ? (
          <p className="text-red-600">{errorMessage}</p>
        ) : questions.length === 0 ? (
          <p className="text-slate-500">No questions found for this test.</p>
        ) : isSubmitted ? (
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Test Submitted
            </h2>
            <p className="mt-2 text-slate-600">
              Your answers have been saved.
            </p>

            <Link
              href="/student/results"
              className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
            >
              View My Results
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-blue-600">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>

            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              {currentQuestion?.question_text || "Untitled question"}
            </h2>

            <textarea
              value={currentAnswer}
              onChange={(e) => updateAnswer(e.target.value)}
              placeholder="Type your answer..."
              className="mt-6 min-h-40 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                onClick={goToPreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              {isLastQuestion ? (
                <button
                  onClick={submitTest}
                  disabled={isSubmitting}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              ) : (
                <button
                  onClick={goToNextQuestion}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}