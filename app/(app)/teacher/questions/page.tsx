"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { formatStandardLabel, type Standard } from "@/lib/standards";
import type { VisualSpec } from "@/lib/ai/visualTypes";

type RigorType = "tactical" | "strategic";
type AiRigorType = RigorType | "mixed";
type QuestionBankTab = "browse" | "create" | "ai";

type Question = {
  id: string;
  question_text: string | null;
  question_html: string | null;
  answer_key?: string | null;
  standard_code: string | null;
  cluster: string | null;
  rigor_type: RigorType | null;
  question_type?: string | null;
  image_url: string | null;
};

type QuestionForm = {
  question_text: string;
  question_html: string;
  answer_key: string;
  standard_code: string;
  cluster: string;
  rigor_type: RigorType;
  question_type: string;
};

type GeneratedQuestion = {
  localId: string;
  question_text: string;
  answer_key: string;
  rigor_type: RigorType;
  standard_code: string;
  cluster: string;
  visual?: VisualSpec;
  savedQuestionId?: string;
};

const ALL_FILTER_VALUE = "all";

const initialForm: QuestionForm = {
  question_text: "",
  question_html: "",
  answer_key: "",
  standard_code: "",
  cluster: "",
  rigor_type: "tactical",
  question_type: "",
};

function formatRigorType(value: string | null) {
  if (value === "tactical") return "Tactical";
  if (value === "strategic") return "Strategic";
  return "Not set";
}

function truncateQuestion(text: string | null) {
  if (!text) return "Untitled question";
  return text.length > 150 ? `${text.slice(0, 150)}...` : text;
}

function stripHtml(html: string | null) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getQuestionPreview(question: Question) {
  return truncateQuestion(stripHtml(question.question_html) || question.question_text);
}

function makeLocalId(index: number) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${index}`;
}

function formatVisualType(type: VisualSpec["type"]) {
  return type
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function VisualMetadataPreview({ visual }: { visual: VisualSpec }) {
  return (
    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">
          Visual: {formatVisualType(visual.type)}
        </span>
        <span className="text-xs font-medium text-blue-700">Data only</span>
      </div>
      <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-xs leading-5 text-slate-700">
        {JSON.stringify(visual, null, 2)}
      </pre>
    </div>
  );
}

export default function QuestionBankPage() {
  const [activeTab, setActiveTab] = useState<QuestionBankTab>("browse");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [clusterFilter, setClusterFilter] = useState(ALL_FILTER_VALUE);
  const [standardFilter, setStandardFilter] = useState(ALL_FILTER_VALUE);
  const [rigorFilter, setRigorFilter] = useState(ALL_FILTER_VALUE);
  const [manualForm, setManualForm] = useState<QuestionForm>(initialForm);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [aiStandardCode, setAiStandardCode] = useState("");
  const [aiCluster, setAiCluster] = useState("");
  const [aiRigor, setAiRigor] = useState<AiRigorType>("strategic");
  const [aiTopic, setAiTopic] = useState("");
  const [aiQuestionCount, setAiQuestionCount] = useState(2);
  const [generatedQuestions, setGeneratedQuestions] = useState<
    GeneratedQuestion[]
  >([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [savingGeneratedIds, setSavingGeneratedIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadQuestions() {
      const supabase = createClient();

      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("questions")
        .select(
          "id, question_text, question_html, answer_key, standard_code, cluster, rigor_type, question_type, image_url"
        )
        .order("standard_code", { ascending: true });

      const { data: standardsData, error: standardsError } = await supabase
        .from("standards")
        .select("id, code, description, cluster, grade_level, subject")
        .eq("subject", "Math")
        .eq("grade_level", "7")
        .order("code", { ascending: true });

      if (error) {
        setErrorMessage(error.message);
        setQuestions([]);
      } else {
        setQuestions((data || []) as Question[]);
      }

      if (standardsError) {
        setErrorMessage((current) => current || standardsError.message);
        setStandards([]);
      } else {
        const loadedStandards = (standardsData || []) as Standard[];
        setStandards(loadedStandards);
        const firstStandard = loadedStandards[0];
        setAiStandardCode((current) => current || firstStandard?.code || "");
        setAiCluster((current) => current || firstStandard?.cluster || "");
      }

      setIsLoading(false);
    }

    loadQuestions();
  }, []);

  const clusters = useMemo(
    () =>
      Array.from(
        new Set(
          standards
            .map((standard) => standard.cluster)
            .filter((cluster): cluster is string => Boolean(cluster))
        )
      ).sort(),
    [standards]
  );

  const standardsByCode = useMemo(
    () => new Map(standards.map((standard) => [standard.code, standard] as const)),
    [standards]
  );

  const filteredQuestions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return questions.filter((question) => {
      const matchesSearch =
        !normalizedSearch ||
        question.question_text?.toLowerCase().includes(normalizedSearch) ||
        stripHtml(question.question_html).toLowerCase().includes(normalizedSearch) ||
        question.standard_code?.toLowerCase().includes(normalizedSearch) ||
        standardsByCode
          .get(question.standard_code || "")
          ?.description.toLowerCase()
          .includes(normalizedSearch) ||
        question.cluster?.toLowerCase().includes(normalizedSearch);

      const matchesCluster =
        clusterFilter === ALL_FILTER_VALUE || question.cluster === clusterFilter;

      const matchesStandard =
        standardFilter === ALL_FILTER_VALUE ||
        question.standard_code === standardFilter;

      const matchesRigor =
        rigorFilter === ALL_FILTER_VALUE || question.rigor_type === rigorFilter;

      return matchesSearch && matchesCluster && matchesStandard && matchesRigor;
    });
  }, [
    clusterFilter,
    questions,
    rigorFilter,
    searchTerm,
    standardFilter,
    standardsByCode,
  ]);

  function setTab(tab: QuestionBankTab) {
    setActiveTab(tab);
    setErrorMessage("");
    setStatusMessage("");
  }

  function updateManualField<Field extends keyof QuestionForm>(
    field: Field,
    value: QuestionForm[Field]
  ) {
    setManualForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleManualStandardChange(code: string) {
    const selectedStandard = standards.find((standard) => standard.code === code);
    setManualForm((current) => ({
      ...current,
      standard_code: code,
      cluster: selectedStandard?.cluster || "",
    }));
  }

  function handleAiStandardChange(code: string) {
    const selectedStandard = standards.find((standard) => standard.code === code);
    setAiStandardCode(code);
    setAiCluster(selectedStandard?.cluster || "");
  }

  function updateGeneratedQuestion<Field extends keyof GeneratedQuestion>(
    localId: string,
    field: Field,
    value: GeneratedQuestion[Field]
  ) {
    setGeneratedQuestions((current) =>
      current.map((question) =>
        question.localId === localId ? { ...question, [field]: value } : question
      )
    );
  }

  function addQuestionToBankState(question: Question) {
    setQuestions((current) =>
      current.some((existing) => existing.id === question.id)
        ? current
        : [question, ...current]
    );
  }

  async function saveManualQuestion() {
    if (!manualForm.question_text.trim() && !manualForm.question_html.trim()) {
      setErrorMessage("Question text or rich content is required.");
      return;
    }

    setIsSavingManual(true);
    setErrorMessage("");
    setStatusMessage("");

    const supabase = createClient();
    const { data, error } = await supabase
      .from("questions")
      .insert({
        question_text: manualForm.question_text.trim(),
        question_html: manualForm.question_html.trim(),
        answer_key: manualForm.answer_key.trim(),
        standard_code: manualForm.standard_code.trim(),
        cluster: manualForm.cluster.trim(),
        rigor_type: manualForm.rigor_type,
        question_type: manualForm.question_type.trim(),
        image_url: "",
      })
      .select(
        "id, question_text, question_html, answer_key, standard_code, cluster, rigor_type, question_type, image_url"
      )
      .single();

    setIsSavingManual(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    addQuestionToBankState(data as Question);
    setManualForm(initialForm);
    setStatusMessage("Question saved to the bank.");
    setActiveTab("browse");
  }

  async function generateAiQuestions() {
    if (!aiStandardCode) {
      setErrorMessage("Select a standard before generating questions.");
      return;
    }

    setIsGeneratingQuestions(true);
    setStatusMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          standard: aiStandardCode,
          rigor: aiRigor,
          topic: aiTopic,
          questionCount: aiQuestionCount,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        questions?: Array<{
          question_text?: string;
          answer_key?: string;
          rigor_type?: string;
          visual?: VisualSpec;
        }>;
        error?: string;
      };

      if (!response.ok || !data.success || !data.questions) {
        throw new Error(data.error || "Could not generate questions.");
      }

      setGeneratedQuestions(
        data.questions.map((question, index) => ({
          localId: makeLocalId(index),
          question_text: question.question_text || "",
          answer_key: question.answer_key || "",
          rigor_type:
            question.rigor_type === "tactical" ? "tactical" : "strategic",
          standard_code: aiStandardCode,
          cluster: aiCluster,
          visual: question.visual,
        }))
      );
      setStatusMessage("Review and edit the generated questions before saving.");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not generate questions."
      );
    } finally {
      setIsGeneratingQuestions(false);
    }
  }

  async function insertGeneratedQuestion(question: GeneratedQuestion) {
    if (!question.question_text.trim()) {
      throw new Error("Question text is required before saving.");
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("questions")
      .insert({
        question_text: question.question_text.trim(),
        question_html: "",
        answer_key: question.answer_key.trim(),
        standard_code: question.standard_code,
        cluster: question.cluster,
        rigor_type: question.rigor_type,
        question_type: "ai_generated",
      })
      .select(
        "id, question_text, question_html, answer_key, standard_code, cluster, rigor_type, question_type, image_url"
      )
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as Question;
  }

  async function saveGeneratedQuestion(localId: string) {
    const generatedQuestion = generatedQuestions.find(
      (question) => question.localId === localId
    );

    if (!generatedQuestion || generatedQuestion.savedQuestionId) return;

    setSavingGeneratedIds((current) => [...current, localId]);
    setStatusMessage("");
    setErrorMessage("");

    try {
      const savedQuestion = await insertGeneratedQuestion(generatedQuestion);
      addQuestionToBankState(savedQuestion);
      setGeneratedQuestions((current) =>
        current.map((question) =>
          question.localId === localId
            ? { ...question, savedQuestionId: savedQuestion.id }
            : question
        )
      );
      setStatusMessage("Question saved to the bank.");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not save question."
      );
    } finally {
      setSavingGeneratedIds((current) =>
        current.filter((id) => id !== localId)
      );
    }
  }

  async function saveAllGeneratedQuestions() {
    const unsavedQuestions = generatedQuestions.filter(
      (question) => !question.savedQuestionId
    );

    if (unsavedQuestions.length === 0) {
      setStatusMessage("All generated questions are already saved.");
      return;
    }

    setSavingGeneratedIds(unsavedQuestions.map((question) => question.localId));
    setStatusMessage("");
    setErrorMessage("");

    try {
      const savedPairs: Array<{
        localId: string;
        savedQuestion: Question;
      }> = [];

      for (const question of unsavedQuestions) {
        const savedQuestion = await insertGeneratedQuestion(question);
        savedPairs.push({ localId: question.localId, savedQuestion });
      }

      savedPairs.forEach(({ savedQuestion }) =>
        addQuestionToBankState(savedQuestion)
      );
      setGeneratedQuestions((current) =>
        current.map((question) => {
          const savedPair = savedPairs.find(
            (pair) => pair.localId === question.localId
          );
          return savedPair
            ? { ...question, savedQuestionId: savedPair.savedQuestion.id }
            : question;
        })
      );
      setStatusMessage("Generated questions saved to the bank.");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not save all questions."
      );
    } finally {
      setSavingGeneratedIds([]);
    }
  }

  const tabClass = (tab: QuestionBankTab) =>
    activeTab === tab
      ? "h-9 whitespace-nowrap rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm"
      : "h-9 whitespace-nowrap rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100";

  return (
    <div className="mx-auto max-w-7xl overflow-x-hidden px-6 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold text-slate-900">Question Bank</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Browse, author, and generate reusable instructional questions.
          </p>
        </div>

        <Link
          href="/teacher/questions/new"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Full Editor
        </Link>
      </div>

      <div className="mt-5 flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <button onClick={() => setTab("browse")} className={tabClass("browse")}>
          Browse
        </button>
        <button onClick={() => setTab("create")} className={tabClass("create")}>
          Create Manually
        </button>
        <button onClick={() => setTab("ai")} className={tabClass("ai")}>
          Generate with AI
        </button>
      </div>

      {errorMessage && (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </p>
      )}

      {statusMessage && (
        <p className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {statusMessage}
        </p>
      )}

      {activeTab === "browse" && (
        <>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search questions"
                className="h-10 min-w-0 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />

              <select
                value={clusterFilter}
                onChange={(event) => setClusterFilter(event.target.value)}
                className="h-10 min-w-0 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value={ALL_FILTER_VALUE}>Cluster</option>
                {clusters.map((cluster) => (
                  <option key={cluster} value={cluster}>
                    {cluster}
                  </option>
                ))}
              </select>

              <select
                value={standardFilter}
                onChange={(event) => setStandardFilter(event.target.value)}
                className="h-10 min-w-0 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value={ALL_FILTER_VALUE}>Standard</option>
                {standards.map((standard) => (
                  <option key={standard.id} value={standard.code}>
                    {formatStandardLabel(standard)}
                  </option>
                ))}
              </select>

              <select
                value={rigorFilter}
                onChange={(event) => setRigorFilter(event.target.value)}
                className="h-10 min-w-0 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value={ALL_FILTER_VALUE}>Rigor Type</option>
                <option value="tactical">Tactical</option>
                <option value="strategic">Strategic</option>
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {isLoading ? (
              <p className="p-6 text-slate-500">Loading questions...</p>
            ) : filteredQuestions.length === 0 ? (
              <p className="p-6 text-slate-500">
                No questions match those filters.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredQuestions.map((question) => (
                  <Link
                    key={question.id}
                    href={`/teacher/questions/${question.id}`}
                    className="block p-4 transition hover:bg-blue-50 sm:p-5"
                  >
                    <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 max-w-3xl">
                        <p className="break-words text-sm font-semibold leading-6 text-slate-900 sm:text-base">
                          {getQuestionPreview(question)}
                        </p>

                        {question.image_url && (
                          <div className="mt-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={question.image_url}
                              alt="Question visual preview"
                              className="h-auto max-h-44 w-full max-w-md rounded-xl border border-slate-200 object-contain shadow-sm"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-wrap gap-2 text-xs font-semibold lg:max-w-sm lg:justify-end">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                          {question.standard_code || "No standard"}
                        </span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                          {question.cluster || "No cluster"}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                          {formatRigorType(question.rigor_type)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "create" && (
        <section className="mt-6 max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Create Question
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Author a reusable question directly into the bank.
            </p>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Question Text
              </span>
              <textarea
                value={manualForm.question_text}
                onChange={(event) =>
                  updateManualField("question_text", event.target.value)
                }
                rows={6}
                className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Rich Question Content
              </span>
              <textarea
                value={manualForm.question_html}
                onChange={(event) =>
                  updateManualField("question_html", event.target.value)
                }
                rows={6}
                placeholder="Optional HTML or formatted content"
                className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Answer Key
              </span>
              <textarea
                value={manualForm.answer_key}
                onChange={(event) =>
                  updateManualField("answer_key", event.target.value)
                }
                rows={4}
                className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  Standard
                </span>
                <select
                  value={manualForm.standard_code}
                  onChange={(event) =>
                    handleManualStandardChange(event.target.value)
                  }
                  className="mt-2 h-10 w-full min-w-0 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select a standard</option>
                  {standards.map((standard) => (
                    <option key={standard.id} value={standard.code}>
                      {formatStandardLabel(standard)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  Cluster
                </span>
                <input
                  value={manualForm.cluster}
                  readOnly
                  className="mt-2 h-10 w-full min-w-0 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm outline-none"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  Rigor Type
                </span>
                <select
                  value={manualForm.rigor_type}
                  onChange={(event) =>
                    updateManualField("rigor_type", event.target.value as RigorType)
                  }
                  className="mt-2 h-10 w-full min-w-0 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="tactical">Tactical</option>
                  <option value="strategic">Strategic</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">
                  Question Type
                </span>
                <input
                  value={manualForm.question_type}
                  onChange={(event) =>
                    updateManualField("question_type", event.target.value)
                  }
                  placeholder="Example: open_response"
                  className="mt-2 h-10 w-full min-w-0 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <button
              onClick={saveManualQuestion}
              disabled={isSavingManual}
              className="h-10 w-full rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-fit"
            >
              {isSavingManual ? "Saving..." : "Save Question"}
            </button>
          </div>
        </section>
      )}

      {activeTab === "ai" && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-slate-900">
                AI Question Generator
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Draft questions with local AI, then edit and save them as reusable bank items.
              </p>
            </div>
            {generatedQuestions.length > 0 && (
              <button
                onClick={saveAllGeneratedQuestions}
                disabled={savingGeneratedIds.length > 0}
                className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save All Questions
              </button>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <label className="block min-w-0 lg:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Standard
              </span>
              <select
                value={aiStandardCode}
                onChange={(event) => handleAiStandardChange(event.target.value)}
                className="mt-2 h-10 w-full min-w-0 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select a standard</option>
                {standards.map((standard) => (
                  <option key={standard.id} value={standard.code}>
                    {formatStandardLabel(standard)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block min-w-0 lg:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Cluster
              </span>
              <input
                value={aiCluster}
                readOnly
                className="mt-2 h-10 w-full min-w-0 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-600 outline-none"
              />
            </label>

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-slate-700">
                Rigor
              </span>
              <select
                value={aiRigor}
                onChange={(event) => setAiRigor(event.target.value as AiRigorType)}
                className="mt-2 h-10 w-full min-w-0 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="tactical">Tactical</option>
                <option value="strategic">Strategic</option>
                <option value="mixed">Mixed</option>
              </select>
            </label>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px] xl:items-end">
            <label className="block min-w-0 md:col-span-2 xl:col-span-1">
              <span className="text-sm font-semibold text-slate-700">
                Topic/focus
              </span>
              <input
                value={aiTopic}
                onChange={(event) => setAiTopic(event.target.value)}
                placeholder="Example: inequalities with rational numbers"
                className="mt-2 h-10 w-full min-w-0 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block min-w-0">
              <span className="text-sm font-semibold text-slate-700">
                Question Count
              </span>
              <select
                value={aiQuestionCount}
                onChange={(event) => setAiQuestionCount(Number(event.target.value))}
                className="mt-2 h-10 w-full min-w-0 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {[2, 3, 5, 10].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={generateAiQuestions}
              disabled={isGeneratingQuestions || !aiStandardCode}
              className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isGeneratingQuestions ? "Generating..." : "Generate Questions"}
            </button>
          </div>

          {generatedQuestions.length > 0 && (
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {generatedQuestions.map((question, index) => {
                const isSavingGenerated = savingGeneratedIds.includes(
                  question.localId
                );

                return (
                  <article
                    key={question.localId}
                    className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="font-semibold text-slate-900">
                        Generated Question {index + 1}
                      </h3>
                      <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {formatRigorType(question.rigor_type)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      {question.standard_code} - {question.cluster || "No cluster"}
                    </p>

                    {question.visual && (
                      <VisualMetadataPreview visual={question.visual} />
                    )}

                    <label className="mt-4 block">
                      <span className="text-sm font-semibold text-slate-700">
                        Question Text
                      </span>
                      <textarea
                        value={question.question_text}
                        onChange={(event) =>
                          updateGeneratedQuestion(
                            question.localId,
                            "question_text",
                            event.target.value
                          )
                        }
                        rows={5}
                        className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>

                    <label className="mt-4 block">
                      <span className="text-sm font-semibold text-slate-700">
                        Answer Key
                      </span>
                      <textarea
                        value={question.answer_key}
                        onChange={(event) =>
                          updateGeneratedQuestion(
                            question.localId,
                            "answer_key",
                            event.target.value
                          )
                        }
                        rows={3}
                        className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>

                    <label className="mt-4 block">
                      <span className="text-sm font-semibold text-slate-700">
                        Rigor Type
                      </span>
                      <select
                        value={question.rigor_type}
                        onChange={(event) =>
                          updateGeneratedQuestion(
                            question.localId,
                            "rigor_type",
                            event.target.value as RigorType
                          )
                        }
                        className="mt-2 h-10 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="tactical">Tactical</option>
                        <option value="strategic">Strategic</option>
                      </select>
                    </label>

                    <button
                      onClick={() => saveGeneratedQuestion(question.localId)}
                      disabled={isSavingGenerated || Boolean(question.savedQuestionId)}
                      className="mt-4 h-10 w-full rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                      {isSavingGenerated
                        ? "Saving..."
                        : question.savedQuestionId
                          ? "Saved to Question Bank"
                          : "Save to Question Bank"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
