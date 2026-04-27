"use client";

import Link from "next/link";

type Priority = "High Priority" | "Medium Priority" | "Review";

type PracticeCluster = {
  name: string;
  description: string;
  priority: Priority;
};

const practiceClusters: PracticeCluster[] = [
  {
    name: "Proportional Relationships",
    description: "Practice ratios, rates, unit rates, and proportional graphs.",
    priority: "Medium Priority",
  },
  {
    name: "Number System",
    description: "Build confidence with integers, fractions, and decimals.",
    priority: "Medium Priority",
  },
  {
    name: "Expressions & Equations",
    description: "Review expressions, equations, inequalities, and solutions.",
    priority: "Review",
  },
  {
    name: "Geometry",
    description: "Focus on area, surface area, volume, and angle relationships.",
    priority: "High Priority",
  },
  {
    name: "Statistics & Probability",
    description: "Practice interpreting data, samples, probability, and models.",
    priority: "Review",
  },
];

const priorityStyles: Record<Priority, string> = {
  "High Priority": "bg-red-100 text-red-700",
  "Medium Priority": "bg-yellow-100 text-yellow-700",
  Review: "bg-blue-100 text-blue-700",
};

export default function StudentPracticePage() {
  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Skills Practice
          </h1>
          <p className="mt-2 text-slate-600">
            Choose a skill cluster to practice with targeted review.
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
        {practiceClusters.map((cluster) => (
          <section
            key={cluster.name}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {cluster.name}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {cluster.description}
                </p>
              </div>

              <span
                className={`w-fit rounded-lg px-3 py-1 text-xs font-semibold ${priorityStyles[cluster.priority]}`}
              >
                {cluster.priority}
              </span>
            </div>

            <Link
              href="#"
              aria-disabled="true"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm opacity-60"
            >
              Start Practice
            </Link>
          </section>
        ))}
      </div>
    </div>
  );
}
