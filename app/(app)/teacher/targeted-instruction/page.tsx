"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import type { VisualSpec } from "@/lib/ai/visualTypes";

type RigorType = "tactical" | "strategic";
type TargetedInstructionTab = "overview" | "recommendations" | "practice";
type PracticeRigorType = RigorType | "mixed";
type PracticeQuestionType =
  | "random practice"
  | "word problem"
  | "equation/inequality"
  | "geometry"
  | "proportional reasoning";

type ClassItem = {
  id: string;
  name: string;
};

type Question = {
  id: string;
  question_text: string | null;
  question_html: string | null;
  answer_key?: string | null;
  image_url: string | null;
  standard_code: string | null;
  cluster: string | null;
  rigor_type: RigorType | null;
};

type Standard = {
  code: string;
  description: string;
  cluster: string;
};

type AssessmentRelation = {
  type: string | null;
};

type AssignedAssessmentRelation = {
  assessments: AssessmentRelation | AssessmentRelation[] | null;
};

type QuestionRelation = {
  standard_code: string | null;
  cluster: string | null;
  rigor_type: RigorType | null;
};

type ResponseRow = {
  score: number | null;
  teacher_score: number | null;
  questions: QuestionRelation | QuestionRelation[] | null;
  assigned_assessments:
    | AssignedAssessmentRelation
    | AssignedAssessmentRelation[]
    | null;
};

type PriorityTarget = {
  key: string;
  label: string;
  cluster: string;
  masteryPercent: number;
  tacticalPercent: number | null;
  strategicPercent: number | null;
  growth: number | null;
  correct: number;
  total: number;
};

type PracticeQuestion = {
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
    <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">
          Visual: {formatVisualType(visual.type)}
        </span>
        <span className="text-xs font-medium text-blue-700">Structured data</span>
      </div>
      <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white p-3 text-xs leading-5 text-slate-700">
        {JSON.stringify(visual, null, 2)}
      </pre>
    </div>
  );
}

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function stripHtml(html: string | null) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function truncateText(text: string | null, maxLength = 110) {
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

function percent(correct: number, total: number) {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

function sortByWeakest(a: PriorityTarget, b: PriorityTarget) {
  return a.masteryPercent - b.masteryPercent || b.total - a.total;
}

function buildPriorityTargets(rows: ResponseRow[]) {
  type Bucket = {
    label: string;
    cluster: string;
    correct: number;
    total: number;
    tacticalCorrect: number;
    tacticalTotal: number;
    strategicCorrect: number;
    strategicTotal: number;
    preCorrect: number;
    preTotal: number;
    postCorrect: number;
    postTotal: number;
  };

  const standardBuckets = new Map<string, Bucket>();
  const clusterBuckets = new Map<string, Bucket>();

  function getBucket(map: Map<string, Bucket>, key: string, cluster: string) {
    const bucket = map.get(key) || {
      label: key,
      cluster,
      correct: 0,
      total: 0,
      tacticalCorrect: 0,
      tacticalTotal: 0,
      strategicCorrect: 0,
      strategicTotal: 0,
      preCorrect: 0,
      preTotal: 0,
      postCorrect: 0,
      postTotal: 0,
    };

    map.set(key, bucket);
    return bucket;
  }

  rows.forEach((row) => {
    const finalScore = row.teacher_score ?? row.score;
    if (finalScore === null || finalScore === undefined) return;

    const question = firstRelation(row.questions);
    const assignedAssessment = firstRelation(row.assigned_assessments);
    const assessment = firstRelation(assignedAssessment?.assessments);
    const assessmentType = assessment?.type;
    const cluster = question?.cluster || "Uncategorized";
    const standard = question?.standard_code || "No standard";
    const rigorType = question?.rigor_type;
    const numericScore = Number(finalScore);

    [getBucket(standardBuckets, standard, cluster), getBucket(clusterBuckets, cluster, cluster)].forEach(
      (bucket) => {
        bucket.correct += numericScore;
        bucket.total += 1;

        if (rigorType === "tactical") {
          bucket.tacticalCorrect += numericScore;
          bucket.tacticalTotal += 1;
        }

        if (rigorType === "strategic") {
          bucket.strategicCorrect += numericScore;
          bucket.strategicTotal += 1;
        }

        if (assessmentType === "pre") {
          bucket.preCorrect += numericScore;
          bucket.preTotal += 1;
        }

        if (assessmentType === "post") {
          bucket.postCorrect += numericScore;
          bucket.postTotal += 1;
        }
      }
    );
  });

  function toTarget([key, bucket]: [string, Bucket]): PriorityTarget {
    const pre = bucket.preTotal > 0 ? percent(bucket.preCorrect, bucket.preTotal) : null;
    const post =
      bucket.postTotal > 0 ? percent(bucket.postCorrect, bucket.postTotal) : null;

    return {
      key,
      label: bucket.label,
      cluster: bucket.cluster,
      masteryPercent: percent(bucket.correct, bucket.total),
      tacticalPercent:
        bucket.tacticalTotal > 0
          ? percent(bucket.tacticalCorrect, bucket.tacticalTotal)
          : null,
      strategicPercent:
        bucket.strategicTotal > 0
          ? percent(bucket.strategicCorrect, bucket.strategicTotal)
          : null,
      growth: pre !== null && post !== null ? post - pre : null,
      correct: bucket.correct,
      total: bucket.total,
    };
  }

  const standards = Array.from(standardBuckets.entries())
    .map(toTarget)
    .filter((target) => target.total > 0)
    .sort(sortByWeakest);

  const clusters = Array.from(clusterBuckets.entries())
    .map(toTarget)
    .filter((target) => target.total > 0)
    .sort(sortByWeakest);

  const tactical = standards
    .filter((target) => target.tacticalPercent !== null)
    .sort(
      (a, b) =>
        (a.tacticalPercent ?? 100) - (b.tacticalPercent ?? 100) ||
        b.total - a.total
    );

  const strategic = standards
    .filter((target) => target.strategicPercent !== null)
    .sort(
      (a, b) =>
        (a.strategicPercent ?? 100) - (b.strategicPercent ?? 100) ||
        b.total - a.total
    );

  return { standards, clusters, tactical, strategic };
}

function TargetList({
  title,
  targets,
  metric,
}: {
  title: string;
  targets: PriorityTarget[];
  metric: "mastery" | "tactical" | "strategic";
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 space-y-3">
        {targets.length === 0 ? (
          <p className="text-sm text-slate-500">No scored data yet.</p>
        ) : (
          targets.slice(0, 5).map((target) => {
            const metricValue =
              metric === "tactical"
                ? target.tacticalPercent
                : metric === "strategic"
                  ? target.strategicPercent
                  : target.masteryPercent;

            return (
              <div
                key={`${title}-${target.key}`}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {target.label}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {target.cluster}
                    </p>
                  </div>
                  <span className="rounded-lg bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
                    {metricValue ?? "-"}%
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${metricValue ?? 0}%` }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                  <span>{target.correct}/{target.total} correct</span>
                  <span>
                    Growth{" "}
                    {target.growth === null
                      ? "-"
                      : `${target.growth > 0 ? "+" : ""}${target.growth} pts`}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export default function TargetedInstructionPage() {
  const [activeTab, setActiveTab] =
    useState<TargetedInstructionTab>("overview");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [standardFilter, setStandardFilter] = useState(ALL_FILTER_VALUE);
  const [clusterFilter, setClusterFilter] = useState(ALL_FILTER_VALUE);
  const [rigorFilter, setRigorFilter] = useState(ALL_FILTER_VALUE);
  const [searchTerm, setSearchTerm] = useState("");
  const [questionCount, setQuestionCount] = useState(3);
  const [quickCount, setQuickCount] = useState(3);
  const [setTitle, setSetTitle] = useState("Targeted Instruction Set");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [practiceStandardCode, setPracticeStandardCode] = useState("");
  const [practiceCluster, setPracticeCluster] = useState("");
  const [practiceRigor, setPracticeRigor] =
    useState<PracticeRigorType>("strategic");
  const [practiceTopic, setPracticeTopic] = useState("");
  const [practiceQuestionType, setPracticeQuestionType] =
    useState<PracticeQuestionType>("random practice");
  const [practiceCount, setPracticeCount] = useState(1);
  const [practiceQuestions, setPracticeQuestions] = useState<
    PracticeQuestion[]
  >([]);
  const [shownPracticeAnswerIds, setShownPracticeAnswerIds] = useState<
    string[]
  >([]);
  const [savingPracticeIds, setSavingPracticeIds] = useState<string[]>([]);
  const [sendingPracticeIds, setSendingPracticeIds] = useState<string[]>([]);
  const [isGeneratingPractice, setIsGeneratingPractice] = useState(false);

  useEffect(() => {
    async function loadPageData() {
      const supabase = createClient();
      setIsLoading(true);
      setErrorMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const classesQuery = supabase
        .from("classes")
        .select("id, name")
        .order("created_at", { ascending: true });

      const { data: classData, error: classError } = user?.id
        ? await classesQuery.eq("teacher_id", user.id)
        : await classesQuery;

      if (classError) {
        setErrorMessage(classError.message);
      }

      const classRows = (classData || []) as ClassItem[];
      setClasses(classRows);
      setSelectedClassId((current) => current || classRows[0]?.id || "");

      const { data: questionData, error: questionError } = await supabase
        .from("questions")
        .select(
          "id, question_text, question_html, image_url, standard_code, cluster, rigor_type"
        )
        .order("standard_code", { ascending: true });

      if (questionError) {
        setErrorMessage(questionError.message);
      } else {
        setQuestions((questionData || []) as Question[]);
        setActiveQuestion(((questionData || []) as Question[])[0] || null);
      }

      const { data: standardData } = await supabase
        .from("standards")
        .select("code, description, cluster")
        .eq("grade_level", "7")
        .eq("subject", "Math")
        .order("code", { ascending: true });

      const standardRows = (standardData || []) as Standard[];
      setStandards(standardRows);
      setPracticeStandardCode((current) => current || standardRows[0]?.code || "");
      setPracticeCluster((current) => current || standardRows[0]?.cluster || "");

      const { data: responseData, error: responseError } = await supabase
        .from("responses")
        .select(
          `
          score,
          teacher_score,
          questions (
            standard_code,
            cluster,
            rigor_type
          ),
          assigned_assessments (
            assessments (
              type
            )
          )
        `
        );

      if (responseError) {
        setErrorMessage(responseError.message);
      } else {
        setResponses((responseData || []) as unknown as ResponseRow[]);
      }

      setIsLoading(false);
    }

    loadPageData();
  }, []);

  const priorityTargets = useMemo(
    () => buildPriorityTargets(responses),
    [responses]
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
      const matchesSearch =
        !normalizedSearch ||
        question.question_text?.toLowerCase().includes(normalizedSearch) ||
        stripHtml(question.question_html).toLowerCase().includes(normalizedSearch) ||
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

  const suggestedQuestions = filteredQuestions.slice(0, questionCount);

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

  function useSuggestedQuestions() {
    setSelectedQuestions(suggestedQuestions);
    setActiveQuestion(suggestedQuestions[0] || activeQuestion);
  }

  function setTab(tab: TargetedInstructionTab) {
    setActiveTab(tab);
    setErrorMessage("");
    setStatusMessage("");
  }

  function handlePracticeStandardChange(code: string) {
    const selectedStandard = standards.find((standard) => standard.code === code);
    setPracticeStandardCode(code);
    setPracticeCluster(selectedStandard?.cluster || "");
  }

  function getPracticeTopicInstruction() {
    const focus = practiceTopic.trim() || "teacher-selected practice";
    if (practiceQuestionType === "random practice") return focus;

    return `${focus}. Practice question type: ${practiceQuestionType}.`;
  }

  async function generatePracticeQuestions(append = false) {
    if (!practiceStandardCode) {
      setErrorMessage("Select a standard before generating practice.");
      return;
    }

    setIsGeneratingPractice(true);
    setStatusMessage("");
    setErrorMessage("");
    setShownPracticeAnswerIds([]);

    try {
      const response = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          standard: practiceStandardCode,
          rigor: practiceRigor,
          topic: getPracticeTopicInstruction(),
          questionCount: append ? 1 : practiceCount,
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
        throw new Error(data.error || "Could not generate practice.");
      }

      const nextQuestions: PracticeQuestion[] = data.questions.map((question, index) => ({
          localId: makeLocalId(index),
          question_text: question.question_text || "",
          answer_key: question.answer_key || "",
          rigor_type:
            question.rigor_type === "tactical" ? "tactical" : "strategic",
          standard_code: practiceStandardCode,
          cluster: practiceCluster,
          visual: question.visual,
        }));

      setPracticeQuestions((current) =>
        append ? [...current, ...nextQuestions] : nextQuestions
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not generate practice."
      );
    } finally {
      setIsGeneratingPractice(false);
    }
  }

  function clearPracticeQuestions() {
    setPracticeQuestions([]);
    setShownPracticeAnswerIds([]);
    setStatusMessage("");
    setErrorMessage("");
  }

  function togglePracticeAnswer(localId: string) {
    setShownPracticeAnswerIds((current) =>
      current.includes(localId)
        ? current.filter((id) => id !== localId)
        : [...current, localId]
    );
  }

  async function insertPracticeQuestion(question: PracticeQuestion) {
    if (question.savedQuestionId) {
      const existingQuestion = questions.find(
        (savedQuestion) => savedQuestion.id === question.savedQuestionId
      );
      if (existingQuestion) return existingQuestion;
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
        question_type: "ai_practice",
      })
      .select(
        "id, question_text, question_html, answer_key, image_url, standard_code, cluster, rigor_type"
      )
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const savedQuestion = data as Question;
    setQuestions((current) =>
      current.some((existing) => existing.id === savedQuestion.id)
        ? current
        : [savedQuestion, ...current]
    );
    setPracticeQuestions((current) =>
      current.map((practiceQuestion) =>
        practiceQuestion.localId === question.localId
          ? { ...practiceQuestion, savedQuestionId: savedQuestion.id }
          : practiceQuestion
      )
    );

    return savedQuestion;
  }

  async function savePracticeQuestion(localId: string) {
    const practiceQuestion = practiceQuestions.find(
      (question) => question.localId === localId
    );
    if (!practiceQuestion) return;

    setSavingPracticeIds((current) => [...current, localId]);
    setStatusMessage("");
    setErrorMessage("");

    try {
      await insertPracticeQuestion(practiceQuestion);
      setStatusMessage("Practice question saved to the Question Bank.");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not save practice question."
      );
    } finally {
      setSavingPracticeIds((current) => current.filter((id) => id !== localId));
    }
  }

  async function sendPracticeAsKnowledgeCheck(localId: string) {
    const practiceQuestion = practiceQuestions.find(
      (question) => question.localId === localId
    );
    if (!practiceQuestion) return;

    if (!selectedClassId) {
      setErrorMessage("Select a class before sending a knowledge check.");
      return;
    }

    setSendingPracticeIds((current) => [...current, localId]);
    setStatusMessage("");
    setErrorMessage("");

    try {
      const savedQuestion = await insertPracticeQuestion(practiceQuestion);
      const supabase = createClient();
      const selectedClass = classes.find(
        (classItem) => classItem.id === selectedClassId
      );

      const { data: assessment, error: assessmentError } = await supabase
        .from("assessments")
        .insert({
          title: `AI Practice: ${practiceQuestion.standard_code}`,
          type: "formative",
          week_number: null,
        })
        .select("id")
        .single();

      if (assessmentError) {
        throw new Error(assessmentError.message);
      }

      const { error: questionError } = await supabase
        .from("assessment_questions")
        .insert({
          assessment_id: assessment.id,
          question_id: savedQuestion.id,
          question_order: 1,
        });

      if (questionError) {
        throw new Error(questionError.message);
      }

      const { error: assignError } = await supabase
        .from("assigned_assessments")
        .insert({
          assessment_id: assessment.id,
          class_id: selectedClassId,
          class_name: selectedClass?.name || null,
        });

      if (assignError) {
        throw new Error(assignError.message);
      }

      setStatusMessage("Practice question sent as a knowledge check.");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not send practice knowledge check."
      );
    } finally {
      setSendingPracticeIds((current) => current.filter((id) => id !== localId));
    }
  }

  async function saveInstructionalSet(assign: boolean) {
    const quickQuestions = selectedQuestions.slice(0, quickCount);
    if (quickQuestions.length === 0) {
      setErrorMessage("Add at least one question.");
      return;
    }

    if (assign && !selectedClassId) {
      setErrorMessage("Select a class.");
      return;
    }

    const supabase = createClient();
    setIsSaving(true);
    setStatusMessage("");
    setErrorMessage("");

    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .insert({
        title: setTitle.trim() || "Targeted Instruction Check",
        type: "formative",
        week_number: null,
      })
      .select("id")
      .single();

    if (assessmentError) {
      setErrorMessage(assessmentError.message);
      setIsSaving(false);
      return;
    }

    const { error: questionError } = await supabase
      .from("assessment_questions")
      .insert(
        quickQuestions.map((question, index) => ({
          assessment_id: assessment.id,
          question_id: question.id,
          question_order: index + 1,
        }))
      );

    if (questionError) {
      setErrorMessage(questionError.message);
      setIsSaving(false);
      return;
    }

    if (assign) {
      const selectedClass = classes.find(
        (classItem) => classItem.id === selectedClassId
      );

      const { error: assignError } = await supabase
        .from("assigned_assessments")
        .insert({
          assessment_id: assessment.id,
          class_id: selectedClassId,
          class_name: selectedClass?.name || null,
        });

      if (assignError) {
        setErrorMessage(assignError.message);
        setIsSaving(false);
        return;
      }
    }

    setStatusMessage(assign ? "Quick check sent." : "Instructional set saved.");
    setIsSaving(false);
  }

  return (
    <div>
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">
          Targeted Instruction
        </h1>
        <p className="mt-2 text-slate-600">
          Turn mastery and growth signals into fast instructional responses.
        </p>
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

      <div className="mt-6 inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {[
          ["overview", "Overview"],
          ["recommendations", "Recommendations"],
          ["practice", "Practice with AI"],
        ].map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setTab(tab as TargetedInstructionTab)}
            className={
              activeTab === tab
                ? "rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
                : "rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="mt-8 grid gap-4 xl:grid-cols-4">
          <TargetList
            title="Weakest Standards"
            targets={priorityTargets.standards}
            metric="mastery"
          />
          <TargetList
            title="Weakest Clusters"
            targets={priorityTargets.clusters}
            metric="mastery"
          />
          <TargetList
            title="Tactical Needs"
            targets={priorityTargets.tactical}
            metric="tactical"
          />
          <TargetList
            title="Strategic Needs"
            targets={priorityTargets.strategic}
            metric="strategic"
          />
        </div>
      )}

      {activeTab === "recommendations" && (
        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Manual Instruction Builder
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Filter the bank and collect questions for a response.
              </p>
            </div>
            <button
              onClick={useSuggestedQuestions}
              className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              Use Top {questionCount}
            </button>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-5">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search questions"
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 lg:col-span-2"
            />
            <select
              value={standardFilter}
              onChange={(event) => setStandardFilter(event.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value={ALL_FILTER_VALUE}>Standard</option>
              {standards.map((standard) => (
                <option key={standard.code} value={standard.code}>
                  {standard.code}
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

          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">
              Question count
            </span>
            {[2, 3, 5].map((count) => (
              <button
                key={count}
                onClick={() => setQuestionCount(count)}
                className={
                  questionCount === count
                    ? "rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                    : "rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                }
              >
                {count}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="max-h-[540px] space-y-3 overflow-y-auto pr-1">
              {isLoading ? (
                <p className="text-slate-500">Loading question bank...</p>
              ) : filteredQuestions.length === 0 ? (
                <p className="text-slate-500">No questions match the filters.</p>
              ) : (
                filteredQuestions.map((question) => (
                  <article
                    key={question.id}
                    className="rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50"
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
                            alt="Question preview"
                            className="max-h-32 w-full rounded-xl border border-slate-200 object-contain"
                          />
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                          {question.standard_code || "No standard"}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                          {formatRigorType(question.rigor_type)}
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => addQuestion(question)}
                      className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                    >
                      Add
                    </button>
                  </article>
                ))
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-semibold text-slate-900">Question Preview</h3>
              {!activeQuestion ? (
                <p className="mt-3 text-sm text-slate-500">
                  Select a question to preview.
                </p>
              ) : (
                <div className="mt-3">
                  <p className="whitespace-pre-wrap text-slate-900">
                    {activeQuestion.question_text || "Untitled question"}
                  </p>
                  {activeQuestion.image_url && (
                    <div className="mt-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activeQuestion.image_url}
                        alt="Question visual"
                        className="max-h-80 w-full rounded-2xl border border-slate-200 object-contain"
                      />
                    </div>
                  )}
                  <div className="mt-4 grid gap-2 text-sm">
                    <p>
                      <span className="font-semibold text-slate-700">
                        Standard:
                      </span>{" "}
                      {activeQuestion.standard_code || "-"}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">
                        Cluster:
                      </span>{" "}
                      {activeQuestion.cluster || "-"}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">
                        Rigor:
                      </span>{" "}
                      {formatRigorType(activeQuestion.rigor_type)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Quick Understanding Check
          </h2>

          <label className="mt-5 block">
            <span className="text-sm font-semibold text-slate-700">
              Instructional Set Title
            </span>
            <input
              value={setTitle}
              onChange={(event) => setSetTitle(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="mt-5">
            <p className="text-sm font-semibold text-slate-700">
              Quick Check Length
            </p>
            <div className="mt-2 flex gap-2">
              {[2, 3, 5].map((count) => (
                <button
                  key={count}
                  onClick={() => setQuickCount(count)}
                  className={
                    quickCount === count
                      ? "rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                      : "rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  }
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <label className="mt-5 block">
            <span className="text-sm font-semibold text-slate-700">Class</span>
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
          </label>

          <p className="mt-3 rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            Quick checks are assigned to the selected class.
          </p>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                Selected Questions
              </h3>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {selectedQuestions.length}
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {selectedQuestions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  Add questions from the builder.
                </p>
              ) : (
                selectedQuestions.map((question, index) => (
                  <div
                    key={question.id}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <div className="flex gap-3">
                      <span className="font-semibold text-blue-700">
                        {index + 1}.
                      </span>
                      <p className="flex-1 text-sm text-slate-700">
                        {getQuestionPreview(question)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeQuestion(question.id)}
                      className="mt-2 text-xs font-semibold text-red-600 hover:text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <button
              onClick={() => saveInstructionalSet(true)}
              disabled={isSaving}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSaving ? "Sending..." : "Send Quick Check"}
            </button>
            <button
              onClick={() => saveInstructionalSet(false)}
              disabled={isSaving}
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save Instructional Set
            </button>
          </div>
        </section>
        </div>
      )}

      {activeTab === "practice" && (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                Practice with AI
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Generate quick examples for warm-ups, reteach moments, and guided whole-group practice.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => generatePracticeQuestions()}
                disabled={isGeneratingPractice || !practiceStandardCode}
                className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeneratingPractice ? "Generating..." : "Regenerate"}
              </button>
              <button
                onClick={() => generatePracticeQuestions(true)}
                disabled={isGeneratingPractice || !practiceStandardCode}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Generate Another
              </button>
              <button
                onClick={clearPracticeQuestions}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-5">
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Standard
              </span>
              <select
                value={practiceStandardCode}
                onChange={(event) =>
                  handlePracticeStandardChange(event.target.value)
                }
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select a standard</option>
                {standards.map((standard) => (
                  <option key={standard.code} value={standard.code}>
                    {standard.code} - {standard.description}
                  </option>
                ))}
              </select>
            </label>

            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-slate-700">
                Cluster
              </span>
              <input
                value={practiceCluster}
                readOnly
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-600 outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Rigor
              </span>
              <select
                value={practiceRigor}
                onChange={(event) =>
                  setPracticeRigor(event.target.value as PracticeRigorType)
                }
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="tactical">Tactical</option>
                <option value="strategic">Strategic</option>
                <option value="mixed">Mixed</option>
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px_170px_180px] xl:items-end">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Topic/focus
              </span>
              <input
                value={practiceTopic}
                onChange={(event) => setPracticeTopic(event.target.value)}
                placeholder="Example: inequalities with rational numbers"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Question Type
              </span>
              <select
                value={practiceQuestionType}
                onChange={(event) =>
                  setPracticeQuestionType(
                    event.target.value as PracticeQuestionType
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="random practice">Random practice</option>
                <option value="word problem">Word problem</option>
                <option value="equation/inequality">Equation/inequality</option>
                <option value="geometry">Geometry</option>
                <option value="proportional reasoning">
                  Proportional reasoning
                </option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Number
              </span>
              <select
                value={practiceCount}
                onChange={(event) => setPracticeCount(Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {[1, 2, 3].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={() => generatePracticeQuestions()}
              disabled={isGeneratingPractice || !practiceStandardCode}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isGeneratingPractice ? "Generating..." : "Generate Practice"}
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Class for optional knowledge check
              </span>
              <select
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 md:max-w-sm"
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
            </label>
          </div>

          <div className="mt-6 space-y-5">
            {practiceQuestions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                <p className="text-lg font-semibold text-slate-800">
                  Ready for live practice.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Choose a standard and generate a quick example for the room.
                </p>
              </div>
            ) : (
              practiceQuestions.map((question, index) => {
                const isAnswerShown = shownPracticeAnswerIds.includes(
                  question.localId
                );
                const isSavingPractice = savingPracticeIds.includes(
                  question.localId
                );
                const isSendingPractice = sendingPracticeIds.includes(
                  question.localId
                );

                return (
                  <article
                    key={question.localId}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                          {question.standard_code}
                        </span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                          {question.cluster || "No cluster"}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                          {formatRigorType(question.rigor_type)}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-slate-400">
                        Practice {index + 1}
                      </span>
                    </div>

                    <p className="mt-5 whitespace-pre-wrap text-2xl font-semibold leading-9 text-slate-950 md:text-3xl md:leading-10">
                      {question.question_text}
                    </p>

                    {question.visual && (
                      <VisualMetadataPreview visual={question.visual} />
                    )}

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        onClick={() => togglePracticeAnswer(question.localId)}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                      >
                        {isAnswerShown ? "Hide Answer" : "Show Answer"}
                      </button>
                      <button
                        onClick={() => savePracticeQuestion(question.localId)}
                        disabled={
                          isSavingPractice || Boolean(question.savedQuestionId)
                        }
                        className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSavingPractice
                          ? "Saving..."
                          : question.savedQuestionId
                            ? "Saved"
                            : "Save to Question Bank"}
                      </button>
                      <button
                        onClick={() =>
                          sendPracticeAsKnowledgeCheck(question.localId)
                        }
                        disabled={isSendingPractice}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSendingPractice
                          ? "Sending..."
                          : "Send as Knowledge Check"}
                      </button>
                    </div>

                    {isAnswerShown && (
                      <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                        <p className="text-sm font-semibold text-emerald-800">
                          Answer Key
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-lg leading-7 text-emerald-950">
                          {question.answer_key || "No answer key returned."}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>
      )}
    </div>
  );
}
