"use client";

import { useSearchParams } from "next/navigation";

export default function FeedbackPage() {
  const params = useSearchParams();
  const answer = params.get("answer") || "No answer submitted";

  const normalizedAnswer = answer.trim().replace("$", "");
  const isCorrect = normalizedAnswer === "1.17";

  return (
    <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10">
        <h1 className="text-2xl font-semibold mb-6">AI Feedback</h1>

        <div className="mb-6">
          <p className="text-slate-400">Your Answer</p>
          <p className="text-xl">{answer}</p>
        </div>

        {!isCorrect && (
          <div className="bg-amber-400/10 border border-amber-300/20 p-4 rounded-2xl mb-6">
            <p className="text-amber-200 text-sm uppercase">
              Likely Misconception
            </p>
            <p className="text-white font-semibold mt-2">
              Reversed ratio in proportional reasoning
            </p>
            <p className="text-slate-300 mt-2">
              You divided notebooks by dollars instead of dollars by notebooks.
            </p>
          </div>
        )}

        {isCorrect && (
          <div className="bg-emerald-400/10 border border-emerald-300/20 p-4 rounded-2xl mb-6">
            <p className="text-emerald-200 text-sm uppercase">Correct</p>
            <p className="text-white font-semibold mt-2">
              Nice work. You found the cost for 7 notebooks correctly.
            </p>
          </div>
        )}

        <div className="bg-slate-900 p-4 rounded-2xl">
          <p className="text-slate-400 text-sm">Feedback</p>
          <p className="mt-2 text-slate-200">
            Find the cost of 1 notebook first, then multiply by 7.
          </p>
        </div>
      </div>
    </div>
  );
}