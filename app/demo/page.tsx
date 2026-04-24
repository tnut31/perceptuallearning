"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DemoAssessment() {
  const [answer, setAnswer] = useState("");
  const router = useRouter();

  const handleSubmit = () => {
    router.push(`/feedback?answer=${answer}`);
  };

  return (
    <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10">
        
        <h1 className="text-2xl font-semibold mb-4">Demo Assessment</h1>

        <p className="text-slate-300 mb-6">
          A store sells 18 notebooks for $3. How much would 7 notebooks cost?
        </p>

        <input
          type="text"
          placeholder="Enter your answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white mb-6"
        />

        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 py-3 rounded-xl font-semibold hover:bg-blue-500"
        >
          Submit Answer
        </button>

      </div>
    </div>
  );
}