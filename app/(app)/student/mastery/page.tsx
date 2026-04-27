"use client";

import Link from "next/link";

type MasteryLabel = "Beginning" | "Developing" | "Proficient" | "Distinguished";

type MasteryCluster = {
  name: string;
  percent: number;
  label: MasteryLabel;
  message: string;
};

const masteryClusters: MasteryCluster[] = [
  {
    name: "Proportional Relationships",
    percent: 72,
    label: "Developing",
    message: "You are building consistency with ratios and rates.",
  },
  {
    name: "Number System",
    percent: 64,
    label: "Developing",
    message: "Keep practicing operations with rational numbers.",
  },
  {
    name: "Expressions & Equations",
    percent: 81,
    label: "Proficient",
    message: "Nice work solving and reasoning with equations.",
  },
  {
    name: "Geometry",
    percent: 58,
    label: "Beginning",
    message: "Focus on shapes, area, and angle relationships next.",
  },
  {
    name: "Statistics & Probability",
    percent: 76,
    label: "Developing",
    message: "You are making progress reading data and chance models.",
  },
];

const masteryStyles: Record<
  MasteryLabel,
  { badge: string; bar: string; soft: string }
> = {
  Beginning: {
    badge: "bg-red-100 text-red-700",
    bar: "bg-red-500",
    soft: "bg-red-50",
  },
  Developing: {
    badge: "bg-yellow-100 text-yellow-700",
    bar: "bg-yellow-500",
    soft: "bg-yellow-50",
  },
  Proficient: {
    badge: "bg-green-100 text-green-700",
    bar: "bg-green-500",
    soft: "bg-green-50",
  },
  Distinguished: {
    badge: "bg-blue-100 text-blue-700",
    bar: "bg-blue-500",
    soft: "bg-blue-50",
  },
};

export default function StudentMasteryPage() {
  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">My Mastery</h1>
          <p className="mt-2 text-slate-600">
            Track your progress across each math skill cluster.
          </p>
        </div>

        <Link
          href="/student"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {masteryClusters.map((cluster) => {
          const styles = masteryStyles[cluster.label];

          return (
            <section
              key={cluster.name}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {cluster.name}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {cluster.message}
                  </p>
                </div>

                <div className={`rounded-xl px-3 py-2 text-right ${styles.soft}`}>
                  <p className="text-2xl font-semibold text-slate-900">
                    {cluster.percent}%
                  </p>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <span
                  className={`rounded-lg px-3 py-1 text-xs font-semibold ${styles.badge}`}
                >
                  {cluster.label}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {cluster.percent}% complete
                </span>
              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${styles.bar}`}
                  style={{ width: `${cluster.percent}%` }}
                />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
