"use client";

import Link from "next/link";

type Result = {
  assessment: string;
  week: string;
  type: "Pre" | "Post";
  score: string;
  status: "Completed" | "Not Started";
};

const results: Result[] = [
  {
    assessment: "Week 1 Pre-Test",
    week: "Week 1",
    type: "Pre",
    score: "45%",
    status: "Completed",
  },
  {
    assessment: "Week 1 Post-Test",
    week: "Week 1",
    type: "Post",
    score: "72%",
    status: "Completed",
  },
  {
    assessment: "Week 2 Pre-Test",
    week: "Week 2",
    type: "Pre",
    score: "51%",
    status: "Completed",
  },
  {
    assessment: "Week 2 Post-Test",
    week: "Week 2",
    type: "Post",
    score: "-",
    status: "Not Started",
  },
];

export default function StudentResultsPage() {
  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            My Results
          </h1>
          <p className="mt-2 text-slate-600">
            Review your assessment scores and see how you are growing.
          </p>
        </div>

        <Link
          href="/student"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Back to Dashboard
        </Link>
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-blue-700">Recent Growth</p>
        <p className="mt-2 text-lg font-semibold text-slate-900">
          Week 1: +27 percentage points from pre-test to post-test
        </p>
      </section>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          Assessment Results
        </h2>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Assessment</th>
                <th className="px-4 py-3 font-semibold">Week</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>

            <tbody>
              {results.map((result) => (
                <tr key={result.assessment} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {result.assessment}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{result.week}</td>
                  <td className="px-4 py-3 text-slate-600">{result.type}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {result.score}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        result.status === "Completed"
                          ? "rounded-lg bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                          : "rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                      }
                    >
                      {result.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
