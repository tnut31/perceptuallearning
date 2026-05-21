"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatStandardLabel, type Standard } from "@/lib/standards";

type RigorType = "tactical" | "strategic";

type QuestionForm = {
  id: string;
  question_text: string;
  // TODO: Ensure questions.question_html exists in the database.
  question_html: string;
  answer_key: string;
  // TODO: Ensure questions.standard_code exists in the database.
  standard_code: string;
  // TODO: Ensure questions.cluster exists in the database.
  cluster: string;
  // TODO: Ensure questions.rigor_type exists in the database.
  rigor_type: RigorType;
  // TODO: Ensure questions.question_type exists in the database.
  question_type: string;
  // TODO: Ensure questions.grade_level exists in the database.
  grade_level?: string;
  // TODO: Ensure questions.tags exists in the database.
  tags?: string[];
  // TODO: Ensure questions.is_ai_generated exists in the database.
  is_ai_generated?: boolean;
  // TODO: Ensure questions.image_url exists in the database.
  image_url: string;
};

const IMAGE_BUCKET = "question-images";

function sanitizeFileName(fileName: string) {
  return fileName.toLowerCase().replace(/[^a-z0-9.-]/g, "-");
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

export default function QuestionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [question, setQuestion] = useState<QuestionForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [isLoadingStandards, setIsLoadingStandards] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadStandards() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("standards")
        .select("id, code, description, cluster, grade_level, subject")
        .eq("subject", "Math")
        .eq("grade_level", "7")
        .order("code", { ascending: true });

      if (error) {
        setErrorMessage(error.message);
        setStandards([]);
      } else {
        setStandards((data || []) as Standard[]);
      }

      setIsLoadingStandards(false);
    }

    loadStandards();
  }, []);

  useEffect(() => {
    async function loadQuestion() {
      if (!params.id) return;

      const supabase = createClient();

      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("questions")
        .select("id, question_text, question_html, answer_key, standard_code, cluster, rigor_type, question_type, image_url")
        .eq("id", params.id)
        .single();

      if (error) {
        setErrorMessage(error.message);
        setQuestion(null);
      } else {
        setQuestion({
          id: data.id,
          question_text: data.question_text || "",
          question_html: data.question_html || "",
          answer_key: data.answer_key || "",
          standard_code: data.standard_code || "",
          cluster: data.cluster || "",
          rigor_type: data.rigor_type === "strategic" ? "strategic" : "tactical",
          question_type: data.question_type || "",
          image_url: data.image_url || "",
        });
      }

      setIsLoading(false);
    }

    loadQuestion();
  }, [params.id]);

  function updateField<Field extends keyof QuestionForm>(
    field: Field,
    value: QuestionForm[Field]
  ) {
    setQuestion((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current
    );
  }

  function handleStandardChange(code: string) {
    const selectedStandard = standards.find((standard) => standard.code === code);

    setQuestion((current) =>
      current
        ? {
            ...current,
            standard_code: code,
            cluster: selectedStandard?.cluster || "",
          }
        : current
    );
  }

  async function uploadImage(file: File) {
    if (!question) return;

    setIsUploadingImage(true);
    setErrorMessage("");
    setSuccessMessage("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const ownerId = user?.id || "teacher";
    const filePath = `${ownerId}/${question.id}-${Date.now()}-${sanitizeFileName(
      file.name
    )}`;

    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setIsUploadingImage(false);
      setErrorMessage(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(filePath);
    updateField("image_url", data.publicUrl);
    setIsUploadingImage(false);
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    uploadImage(file);
  }

  async function updateQuestion() {
    if (!question) return;

    if (!question.question_text.trim() && !question.question_html.trim()) {
      setErrorMessage("Question text or rich content is required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const supabase = createClient();

    const { error } = await supabase
      .from("questions")
      .update({
        question_text: question.question_text.trim(),
        question_html: question.question_html.trim(),
        answer_key: question.answer_key.trim(),
        standard_code: question.standard_code.trim(),
        cluster: question.cluster.trim(),
        rigor_type: question.rigor_type,
        question_type: question.question_type.trim(),
        image_url: question.image_url,
      })
      .eq("id", question.id);

    setIsSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Question updated.");
  }

  async function deleteQuestion() {
    if (!question) return;

    const confirmed = confirm("Delete this question?");
    if (!confirmed) return;

    setIsDeleting(true);
    setErrorMessage("");

    const supabase = createClient();

    const { error } = await supabase
      .from("questions")
      .delete()
      .eq("id", question.id);

    setIsDeleting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push("/teacher/questions");
  }

  if (isLoading) {
    return <p className="text-slate-500">Loading question...</p>;
  }

  if (!question) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-red-600">{errorMessage || "Question not found."}</p>
        <Link
          href="/teacher/questions"
          className="mt-4 inline-flex rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to Question Bank
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Question Detail
          </h1>
          <p className="mt-2 text-slate-600">
            View, edit, update, or delete this question.
          </p>
        </div>

        <Link
          href="/teacher/questions"
          className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to Bank
        </Link>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Question Text
            </span>
            <textarea
              value={question.question_text}
              onChange={(event) => updateField("question_text", event.target.value)}
              rows={7}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Rich Question Content
            </span>
            <textarea
              value={question.question_html}
              onChange={(event) => updateField("question_html", event.target.value)}
              rows={9}
              placeholder="Use line breaks and basic HTML such as <strong>, <em>, <ul>, <li>, <table>, <tr>, <td>."
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm leading-6 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-5">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Replace Image
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="mt-2 block w-full text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-500"
              />
            </label>

            {isUploadingImage && (
              <p className="mt-3 text-sm font-medium text-blue-700">
                Uploading image...
              </p>
            )}

            {question.image_url && (
              <div className="mt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={question.image_url}
                  alt="Question image preview"
                  className="max-h-80 w-full max-w-2xl rounded-2xl border border-slate-200 object-contain shadow-sm"
                />
              </div>
            )}
          </div>

          {(question.question_html || question.image_url) && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-sm font-semibold text-slate-700">Preview</h2>

              {question.question_html && (
                <div
                  className="mt-3 max-w-3xl whitespace-normal text-slate-900 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2"
                  dangerouslySetInnerHTML={{
                    __html: formatQuestionHtml(question.question_html),
                  }}
                />
              )}

              {question.image_url && (
                <div className="mt-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={question.image_url}
                    alt="Question visual"
                    className="h-auto w-full max-w-2xl rounded-2xl border border-slate-200 object-contain shadow-sm"
                  />
                </div>
              )}
            </div>
          )}

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Answer Key
            </span>
            <textarea
              value={question.answer_key}
              onChange={(event) => updateField("answer_key", event.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Standard
              </span>
              <select
                value={question.standard_code}
                onChange={(event) => handleStandardChange(event.target.value)}
                disabled={isLoadingStandards}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  {isLoadingStandards ? "Loading standards..." : "Select a standard"}
                </option>
                {question.standard_code &&
                  !standards.some(
                    (standard) => standard.code === question.standard_code
                  ) && (
                    <option value={question.standard_code}>
                      {question.standard_code}
                    </option>
                  )}
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
                value={question.cluster}
                readOnly
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Rigor Type
              </span>
              <select
                value={question.rigor_type}
                onChange={(event) =>
                  updateField("rigor_type", event.target.value as RigorType)
                }
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
                value={question.question_type}
                onChange={(event) => updateField("question_type", event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          {errorMessage && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {successMessage}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              onClick={updateQuestion}
              disabled={isSaving || isUploadingImage}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSaving ? "Updating..." : "Update Question"}
            </button>

            <button
              onClick={deleteQuestion}
              disabled={isDeleting}
              className="rounded-xl border border-red-200 px-5 py-3 font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? "Deleting..." : "Delete Question"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
