import { NextResponse } from "next/server";
import { generateQuestions } from "@/lib/ai/generateQuestions";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await generateQuestions({
      standard: "KY.7.EE.4",
      rigor: "strategic",
      topic: "inequalities with rational numbers",
      questionCount: 2,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: unknown) {
    console.error(error);

    const message =
      error instanceof Error ? error.message : "Unknown AI generation error";

    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}
