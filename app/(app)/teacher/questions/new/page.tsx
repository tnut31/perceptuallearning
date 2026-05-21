"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { formatStandardLabel, type Standard } from "@/lib/standards";

type RigorType = "tactical" | "strategic";

type QuestionForm = {
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

const initialForm: QuestionForm = {
  question_text: "",
  question_html: "",
  answer_key: "",
  standard_code: "",
  cluster: "",
  rigor_type: "tactical",
  question_type: "",
  image_url: "",
};

const IMAGE_BUCKET = "question-images";

function sanitizeFileName(fileName: string) {
  return fileName.toLowerCase().replace(/[^a-z0-9.-]/g, "-");
}

export default function NewQuestionPage() {
  const router = useRouter();

  const [form, setForm] = useState<QuestionForm>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [isLoadingStandards, setIsLoadingStandards] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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

  function updateField<Field extends keyof QuestionForm>(
    field: Field,
    value: QuestionForm[Field]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleStandardChange(code: string) {
    const selectedStandard = standards.find((standard) => standard.code === code);

    setForm((current) => ({
      ...current,
      standard_code: code,
      cluster: selectedStandard?.cluster || "",
    }));
  }

  async function uploadImage(file: File) {
    setIsUploadingImage(true);
    setErrorMessage("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const ownerId = user?.id || "teacher";
    const filePath = `${ownerId}/${Date.now()}-${sanitizeFileName(file.name)}`;

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

  async function saveQuestion() {
    if (!form.question_text.trim() && !form.question_html.trim()) {
      setErrorMessage("Question text or rich content is required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const supabase = createClient();

    const { data, error } = await supabase
      .from("questions")
      .insert({
        question_text: form.question_text.trim(),
        question_html: form.question_html.trim(),
        answer_key: form.answer_key.trim(),
        standard_code: form.standard_code.trim(),
        cluster: form.cluster.trim(),
        rigor_type: form.rigor_type,
        question_type: form.question_type.trim(),
        image_url: form.image_url,
      })
      .select("id")
      .single();

    setIsSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push(`/teacher/questions/${data.id}`);
  }

  return (
    <div>
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">
          Create Question
        </h1>
        <p className="mt-2 text-slate-600">
          Add a manually-authored question to the shared bank.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Question Text
            </span>
            <textarea
              value={form.question_text}
              onChange={(event) => updateField("question_text", event.target.value)}
              rows={6}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Rich Question Content
            </span>
            <textarea
              value={form.question_html}
              onChange={(event) => updateField("question_html", event.target.value)}
              rows={9}
              placeholder="Use line breaks and basic HTML such as <strong>, <em>, <ul>, <li>, <table>, <tr>, <td>."
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm leading-6 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-5">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Upload Image
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

            {form.image_url && (
              <div className="mt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.image_url}
                  alt="Question upload preview"
                  className="max-h-80 w-full max-w-2xl rounded-2xl border border-slate-200 object-contain shadow-sm"
                />
              </div>
            )}
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Answer Key
            </span>
            <textarea
              value={form.answer_key}
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
                value={form.standard_code}
                onChange={(event) => handleStandardChange(event.target.value)}
                disabled={isLoadingStandards}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  {isLoadingStandards ? "Loading standards..." : "Select a standard"}
                </option>
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
                value={form.cluster}
                readOnly
                className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Rigor Type
              </span>
              <select
                value={form.rigor_type}
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
                value={form.question_type}
                onChange={(event) => updateField("question_type", event.target.value)}
                placeholder="Example: open_response"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          {errorMessage && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={saveQuestion}
              disabled={isSaving || isUploadingImage}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSaving ? "Saving..." : "Save Question"}
            </button>

            <Link
              href="/teacher/questions"
              className="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
