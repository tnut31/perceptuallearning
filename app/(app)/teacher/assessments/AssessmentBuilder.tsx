"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

type RigorType = "tactical" | "strategic";
type AssignmentType =
  | "pre"
  | "post"
  | "formative"
  | "practice"
  | "reteach"
  | "enrichment";
type BuilderMode = "create" | "edit";

type Question = {
  id: string;
  question_text: string | null;
  question_html: string | null;
  standard_code: string | null;
  cluster: string | null;
  rigor_type: RigorType | null;
  image_url: string | null;
};

type AssessmentQuestion = {
  question_id: string;
  question_order: number | null;
};

type AssessmentBuilderProps = {
  mode: BuilderMode;
  assessmentId?: string;
};

const ALL_FILTER_VALUE = "all";

function stripHtml(html: string | null) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function truncateText(text: string | null, maxLength = 120) {
  if (!text) return "Untitled question";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function getQuestionPreview(question: Question) {
  return truncateText(stripHtml(question.question_html) || question.question_text);
}

function formatRigorType(value: RigorType | null) {
  if (value === "strategic") return "Strategic";
  if (value === "tactical") return "Tactical";
  return "Not set";
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

function normalizeAssignmentType(value: string | null): AssignmentType {
  if (
    value === "post" ||
    value === "formative" ||
    value === "practice" ||
    value === "reteach" ||
    value === "enrichment"
  ) {
    return value;
  }

  return "pre";
}

export default function AssessmentBuilder({
  mode,
  assessmentId,
}: AssessmentBuilderProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [weekNumber, setWeekNumber] = useState("");
  const [assignmentType, setAssignmentType] = useState<AssignmentType>("pre");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [standardFilter, setStandardFilter] = useState(ALL_FILTER_VALUE);
  const [clusterFilter, setClusterFilter] = useState(ALL_FILTER_VALUE);
  const [rigorFilter, setRigorFilter] = useState(ALL_FILTER_VALUE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadBuilderData() {
      const supabase = createClient();

      setIsLoading(true);
      setErrorMessage("");

      const { data: questionData, error: questionError } = await supabase
        .from("questions")
        .select(
          "id, question_text, question_html, standard_code, cluster, rigor_type, image_url"
        )
        .order("standard_code", { ascending: true });

      if (questionError) {
        setErrorMessage(questionError.message);
        setQuestions([]);
        setIsLoading(false);
        return;
      }

      const loadedQuestions = (questionData || []) as Question[];
      setQuestions(loadedQuestions);
      setActiveQuestion(loadedQuestions[0] || null);

      if (mode === "edit" && assessmentId) {
        const { data: assessmentData, error: assessmentError } = await supabase
          .from("assessments")
          .select("id, title, week_number, type")
          .eq("id", assessmentId)
          .single();

        if (assessmentError) {
          setErrorMessage(assessmentError.message);
          setIsLoading(false);
          return;
        }

        setTitle(assessmentData.title || "");
        setWeekNumber(
          assessmentData.week_number === null ||
            assessmentData.week_number === undefined
            ? ""
            : String(assessmentData.week_number)
        );
        setAssignmentType(normalizeAssignmentType(assessmentData.type));

        const { data: junctionData, error: junctionError } = await supabase
          .from("assessment_questions")
          .select("question_id, question_order")
          .eq("assessment_id", assessmentId)
          .order("question_order", { ascending: true });

        if (junctionError) {
          setErrorMessage(junctionError.message);
          setIsLoading(false);
          return;
        }

        const orderedQuestionIds = ((junctionData || []) as AssessmentQuestion[])
          .sort(
            (a, b) => (a.question_order ?? 0) - (b.question_order ?? 0)
          )
          .map((row) => row.question_id);
        const questionById = new Map(
          loadedQuestions.map((question) => [question.id, question])
        );
        const selected = orderedQuestionIds
          .map((questionId) => questionById.get(questionId))
          .filter((question): question is Question => Boolean(question));

        setSelectedQuestions(selected);
        setActiveQuestion(selected[0] || loadedQuestions[0] || null);
      }

      setIsLoading(false);
    }

    loadBuilderData();
  }, [assessmentId, mode]);

  const standards = useMemo(
    () =>
      Array.from(
        new Set(
          questions
            .map((question) => question.standard_code)
            .filter((standard): standard is string => Boolean(standard))
        )
      ).sort(),
    [questions]
  );

  const clusters = useMemo(
    () =>
      Array.from(
        new Set(
          questions
            .map((question) => question.cluster)
            .filter((cluster): cluster is string => Boolean(cluster))
        )
      ).sort(),
    [questions]
  );

  const filteredQuestions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return questions.filter((question) => {
      const preview = `${question.question_text || ""} ${stripHtml(
        question.question_html
      )}`.toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        preview.includes(normalizedSearch) ||
        question.standard_code?.toLowerCase().includes(normalizedSearch) ||
        question.cluster?.toLowerCase().includes(normalizedSearch);

      const matchesStandard =
        standardFilter === ALL_FILTER_VALUE ||
        question.standard_code === standardFilter;

      const matchesCluster =
        clusterFilter === ALL_FILTER_VALUE || question.cluster === clusterFilter;

      const matchesRigor =
        rigorFilter === ALL_FILTER_VALUE || question.rigor_type === rigorFilter;

      return matchesSearch && matchesStandard && matchesCluster && matchesRigor;
    });
  }, [clusterFilter, questions, rigorFilter, searchTerm, standardFilter]);

  function addQuestion(question: Question) {
    setActiveQuestion(question);
    setSelectedQuestions((current) =>
      current.some((selected) => selected.id === question.id)
        ? current
        : [...current, question]
    );
  }

  function removeQuestion(questionId: string) {
    setSelectedQuestions((current) =>
      current.filter((question) => question.id !== questionId)
    );
  }

  function moveQuestion(questionId: string, direction: "up" | "down") {
    setSelectedQuestions((current) => {
      const index = current.findIndex((question) => question.id === questionId);
      if (index === -1) return current;

      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.length) return current;

      const next = [...current];
      const movingQuestion = next[index];
      next[index] = next[nextIndex];
      next[nextIndex] = movingQuestion;
      return next;
    });
  }

  async function saveAssignment() {
    if (!title.trim()) {
      setErrorMessage("Assignment title is required.");
      return;
    }

    if (selectedQuestions.length === 0) {
      setErrorMessage("Add at least one question.");
      return;
    }

    const parsedWeekNumber = weekNumber.trim() ? Number(weekNumber) : null;
    if (parsedWeekNumber !== null && Number.isNaN(parsedWeekNumber)) {
      setErrorMessage("Week number must be a number.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const supabase = createClient();
    let savedAssessmentId = assessmentId;

    if (mode === "create") {
      const { data, error } = await supabase
        .from("assessments")
        .insert({
          title: title.trim(),
          week_number: parsedWeekNumber,
          type: assignmentType,
        })
        .select("id")
        .single();

      if (error) {
        setErrorMessage(error.message);
        setIsSaving(false);
        return;
      }

      savedAssessmentId = data.id;
    } else if (assessmentId) {
      const { error } = await supabase
        .from("assessments")
        .update({
          title: title.trim(),
          week_number: parsedWeekNumber,
          type: assignmentType,
        })
        .eq("id", assessmentId);

      if (error) {
        setErrorMessage(error.message);
        setIsSaving(false);
        return;
      }
    }

    if (!savedAssessmentId) {
      setErrorMessage("Assignment could not be saved.");
      setIsSaving(false);
      return;
    }

    if (mode === "edit") {
      const { error } = await supabase
        .from("assessment_questions")
        .delete()
        .eq("assessment_id", savedAssessmentId);

      if (error) {
        setErrorMessage(error.message);
        setIsSaving(false);
        return;
      }
    }

    const assessmentQuestionRows = selectedQuestions.map((question, index) => ({
      assessment_id: savedAssessmentId,
      question_id: question.id,
      question_order: index + 1,
    }));

    const { error: junctionInsertError } = await supabase
      .from("assessment_questions")
      .insert(assessmentQuestionRows);

    if (junctionInsertError) {
      setErrorMessage(junctionInsertError.message);
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    router.push("/teacher/assessments");
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            {mode === "create" ? "Create Assignment" : "Edit Assignment"}
          </h1>
          <p className="mt-2 text-slate-600">
            Browse the question bank, preview items, and assemble an assignment.
          </p>
        </div>

        <Link
          href="/teacher/assessments"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to Assignments
        </Link>
      </div>

      {errorMessage && (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </p>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)_minmax(320px,0.9fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Question Bank
          </h2>

          <div className="mt-4 grid gap-3">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search questions"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />

            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              <select
                value={standardFilter}
                onChange={(event) => setStandardFilter(event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value={ALL_FILTER_VALUE}>Standard</option>
                {standards.map((standard) => (
                  <option key={standard} value={standard}>
                    {standard}
                  </option>
                ))}
              </select>

              <select
                value={clusterFilter}
                onChange={(event) => setClusterFilter(event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value={ALL_FILTER_VALUE}>Cluster</option>
                {clusters.map((cluster) => (
                  <option key={cluster} value={cluster}>
                    {cluster}
                  </option>
                ))}
              </select>

              <select
                value={rigorFilter}
                onChange={(event) => setRigorFilter(event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value={ALL_FILTER_VALUE}>Rigor Type</option>
                <option value="tactical">Tactical</option>
                <option value="strategic">Strategic</option>
              </select>
            </div>
          </div>

          <div className="mt-5 max-h-[68vh] space-y-3 overflow-y-auto pr-1">
            {isLoading ? (
              <p className="text-slate-500">Loading questions...</p>
            ) : filteredQuestions.length === 0 ? (
              <p className="text-slate-500">No questions match those filters.</p>
            ) : (
              filteredQuestions.map((question) => {
                const isSelected = selectedQuestions.some(
                  (selected) => selected.id === question.id
                );

                return (
                  <article
                    key={question.id}
                    className={`rounded-2xl border p-4 transition ${
                      activeQuestion?.id === question.id
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <button
                      onClick={() => setActiveQuestion(question)}
                      className="block w-full text-left"
                    >
                      <p className="font-medium leading-6 text-slate-900">
                        {getQuestionPreview(question)}
                      </p>

                      {question.image_url && (
                        <div className="mt-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={question.image_url}
                            alt="Question visual preview"
                            className="h-auto max-h-36 w-full rounded-xl border border-slate-200 object-contain"
                          />
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                          {question.standard_code || "No standard"}
                        </span>
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                          {question.cluster || "No cluster"}
                        </span>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                          {formatRigorType(question.rigor_type)}
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => addQuestion(question)}
                      disabled={isSelected}
                      className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                      {isSelected ? "Added" : "Add Question"}
                    </button>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Question Preview
          </h2>

          {!activeQuestion ? (
            <p className="mt-4 text-slate-500">Select a question to preview it.</p>
          ) : (
            <div className="mt-4">
              {activeQuestion.question_text && (
                <p className="whitespace-pre-wrap text-slate-900">
                  {activeQuestion.question_text}
                </p>
              )}

              {activeQuestion.question_html && (
                <div
                  className="mt-4 max-w-none whitespace-normal text-slate-900 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2"
                  dangerouslySetInnerHTML={{
                    __html: formatQuestionHtml(activeQuestion.question_html),
                  }}
                />
              )}

              {activeQuestion.image_url && (
                <div className="mt-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeQuestion.image_url}
                    alt="Question visual"
                    className="h-auto max-h-96 w-full rounded-2xl border border-slate-200 object-contain"
                  />
                </div>
              )}

              <div className="mt-5 grid gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="font-semibold text-slate-700">Standard</p>
                  <p className="mt-1 text-slate-600">
                    {activeQuestion.standard_code || "No standard"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="font-semibold text-slate-700">Cluster</p>
                  <p className="mt-1 text-slate-600">
                    {activeQuestion.cluster || "No cluster"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="font-semibold text-slate-700">Rigor Type</p>
                  <p className="mt-1 text-slate-600">
                    {formatRigorType(activeQuestion.rigor_type)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Assignment Builder
          </h2>

          <div className="mt-4 grid gap-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Assignment Title
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Week Number
              </span>
              <input
                value={weekNumber}
                onChange={(event) => setWeekNumber(event.target.value)}
                inputMode="numeric"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Assignment Type
              </span>
              <select
                value={assignmentType}
                onChange={(event) =>
                  setAssignmentType(event.target.value as AssignmentType)
                }
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="pre">Pre Test</option>
                <option value="post">Post Test</option>
                <option value="formative">Knowledge Check</option>
                <option value="practice">Practice</option>
                <option value="reteach">Reteach</option>
                <option value="enrichment">Enrichment</option>
              </select>
            </label>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                Selected Questions
              </h3>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {selectedQuestions.length}
              </span>
            </div>

            <div className="mt-3 max-h-[45vh] space-y-3 overflow-y-auto pr-1">
              {selectedQuestions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  Add questions from the bank to build this assignment.
                </p>
              ) : (
                selectedQuestions.map((question, index) => (
                  <div
                    key={question.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                        {index + 1}
                      </span>
                      <button
                        onClick={() => setActiveQuestion(question)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="text-sm font-medium leading-5 text-slate-900">
                          {getQuestionPreview(question)}
                        </p>
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button
                        onClick={() => moveQuestion(question.id, "up")}
                        disabled={index === 0}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Up
                      </button>
                      <button
                        onClick={() => moveQuestion(question.id, "down")}
                        disabled={index === selectedQuestions.length - 1}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Down
                      </button>
                      <button
                        onClick={() => removeQuestion(question.id)}
                        className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={saveAssignment}
            disabled={isSaving || isLoading}
            className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isSaving ? "Saving..." : "Save Assignment"}
          </button>
        </section>
      </div>
    </div>
  );
}
