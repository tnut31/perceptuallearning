import { NextResponse } from "next/server";
import { generateQuestions } from "@/lib/ai/generateQuestions";
import { validateStandardAlignment } from "@/lib/ai/standards";
import type { VisualSpec, VisualType } from "@/lib/ai/visualTypes";

type GenerateQuestionsRequest = {
  standard?: unknown;
  rigor?: unknown;
  topic?: unknown;
  questionCount?: unknown;
};

type GeneratedQuestion = {
  question_text: string;
  answer_key: string;
  rigor_type: "tactical" | "strategic";
  visual?: VisualSpec;
};

type GenerateRigor = "tactical" | "strategic" | "mixed";

const ALLOWED_RIGOR = new Set(["tactical", "strategic", "mixed"]);
const ALLOWED_COUNTS = new Set([1, 2, 3, 5, 10]);
const ALLOWED_VISUAL_TYPES = new Set<VisualType>([
  "table",
  "coordinate_plane",
  "bar_graph",
  "number_line",
  "circle",
  "rectangle",
  "triangle",
]);

function isGenerateRigor(value: string): value is GenerateRigor {
  return ALLOWED_RIGOR.has(value);
}

function parseJsonArray(rawOutput: string): unknown {
  try {
    return JSON.parse(rawOutput);
  } catch {
    const match = rawOutput.match(/\[[\s\S]*\]/);
    if (!match) {
      throw new Error("AI response was not valid JSON.");
    }

    return JSON.parse(match[0]);
  }
}

function isNumberPair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}

function normalizeVisual(value: unknown): VisualSpec | undefined {
  if (!value || typeof value !== "object") return undefined;

  const visual = value as Record<string, unknown>;
  const visualType = visual.type;
  if (
    typeof visualType !== "string" ||
    !ALLOWED_VISUAL_TYPES.has(visualType as VisualType)
  ) {
    return undefined;
  }
  const type = visualType as VisualType;

  if (type === "table") {
    const headers = visual.headers;
    const rows = visual.rows;
    if (
      !Array.isArray(headers) ||
      !headers.every((header) => typeof header === "string") ||
      !Array.isArray(rows) ||
      !rows.every(
        (row) =>
          Array.isArray(row) &&
          row.every(
            (cell) => typeof cell === "string" || typeof cell === "number"
          )
      )
    ) {
      return undefined;
    }

    return { type: "table", headers, rows };
  }

  if (type === "coordinate_plane") {
    const points = visual.points;
    if (!Array.isArray(points) || !points.every(isNumberPair)) {
      return undefined;
    }

    return { type: "coordinate_plane", points };
  }

  if (type === "bar_graph") {
    const categories = visual.categories;
    const values = visual.values;
    if (
      !Array.isArray(categories) ||
      !categories.every((category) => typeof category === "string") ||
      !Array.isArray(values) ||
      !values.every((barValue) => typeof barValue === "number") ||
      categories.length !== values.length
    ) {
      return undefined;
    }

    return { type: "bar_graph", categories, values };
  }

  if (type === "number_line") {
    const start = visual.start;
    const end = visual.end;
    const highlight = visual.highlight;
    if (typeof start !== "number" || typeof end !== "number") {
      return undefined;
    }

    return {
      type: "number_line",
      start,
      end,
      highlight: Array.isArray(highlight)
        ? highlight.filter((item): item is number => typeof item === "number")
        : undefined,
    };
  }

  const labels = visual.labels;
  const measurements = visual.measurements;
  const normalizedMeasurements =
    measurements && typeof measurements === "object" && !Array.isArray(measurements)
      ? Object.fromEntries(
          Object.entries(measurements).filter(
            ([, measurement]) =>
              typeof measurement === "string" || typeof measurement === "number"
          )
        )
      : undefined;

  return {
    type,
    labels: Array.isArray(labels)
      ? labels.filter((label): label is string => typeof label === "string")
      : undefined,
    measurements: normalizedMeasurements,
  };
}

function normalizeQuestion(
  value: unknown,
  requestedRigor: string,
  index: number
): GeneratedQuestion {
  if (!value || typeof value !== "object") {
    throw new Error(`Generated question ${index + 1} is not an object.`);
  }

  const question = value as Record<string, unknown>;
  const questionText = question.question_text;
  const answerKey = question.answer_key;
  const rawRigor = question.rigor_type;
  const visual = normalizeVisual(question.visual);

  if (typeof questionText !== "string" || !questionText.trim()) {
    throw new Error(`Generated question ${index + 1} is missing question_text.`);
  }

  if (typeof answerKey !== "string" || !answerKey.trim()) {
    throw new Error(`Generated question ${index + 1} is missing answer_key.`);
  }

  const fallbackRigor = requestedRigor === "tactical" ? "tactical" : "strategic";
  const rigorType =
    rawRigor === "tactical" || rawRigor === "strategic"
      ? rawRigor
      : fallbackRigor;

  return {
    question_text: questionText.trim(),
    answer_key: answerKey.trim(),
    rigor_type: rigorType,
    ...(visual ? { visual } : {}),
  };
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateQuestionsRequest;
    const standard = typeof body.standard === "string" ? body.standard.trim() : "";
    const rigor = typeof body.rigor === "string" ? body.rigor.trim() : "";
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const questionCount = Number(body.questionCount);

    if (!standard) {
      return NextResponse.json(
        { success: false, error: "Standard is required." },
        { status: 400 }
      );
    }

    if (!isGenerateRigor(rigor)) {
      return NextResponse.json(
        { success: false, error: "Rigor must be tactical, strategic, or mixed." },
        { status: 400 }
      );
    }

    if (!ALLOWED_COUNTS.has(questionCount)) {
      return NextResponse.json(
        { success: false, error: "Question count must be 1, 2, 3, 5, or 10." },
        { status: 400 }
      );
    }

    const output = await generateQuestions({
      standard,
      rigor,
      topic,
      questionCount,
    });
    const parsed = parseJsonArray(output);

    if (!Array.isArray(parsed)) {
      return NextResponse.json(
        { success: false, error: "AI response did not return a JSON array." },
        { status: 502 }
      );
    }

    const questions = parsed
      .slice(0, questionCount)
      .map((question, index) => normalizeQuestion(question, rigor, index));
    const alignment = validateStandardAlignment(standard, questions);

    return NextResponse.json({
      success: true,
      questions,
      ...(alignment ? { alignment } : {}),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not generate questions.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
