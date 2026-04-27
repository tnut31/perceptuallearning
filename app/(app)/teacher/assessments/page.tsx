"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type Assessment = {
  id: string;
  title: string;
  week_number: number | null;
  type: string | null;
};

export default function AssessmentsPage() {
  const supabase = createClient();

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] =
    useState<Assessment | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const classes = ["1st Period", "2nd Period", "3rd Period"];

  async function loadAssessments() {
    const { data, error } = await supabase
      .from("assessments")
      .select("*")
      .order("week_number", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setAssessments(data || []);
  }

  useEffect(() => {
    loadAssessments();
  }, []);

  function openAssignPopup(assessment: Assessment) {
    setSelectedAssessment(assessment);
    setSelectedClasses([]);
  }

  function toggleClass(className: string) {
    setSelectedClasses((prev) =>
      prev.includes(className)
        ? prev.filter((c) => c !== className)
        : [...prev, className]
    );
  }

  async function assignAssessment() {
    if (!selectedAssessment) return;

    if (selectedClasses.length === 0) {
      alert("Select at least one class.");
      return;
    }

    const rows = selectedClasses.map((className) => ({
      assessment_id: selectedAssessment.id,
      class_name: className,
    }));

    const { error } = await supabase
      .from("assigned_assessments")
      .insert(rows);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Assessment assigned!");
    setSelectedAssessment(null);
    setSelectedClasses([]);
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold text-slate-900">
        Assessments
      </h1>

      <p className="mt-2 text-slate-600">
        Assign weekly pre-tests and post-tests.
      </p>
      

      <div className="mt-8 space-y-6">
        {Array.from({ length: 20 }, (_, i) => i + 1).map((week) => {
          const weekAssessments = assessments.filter(
            (a) => Number(a.week_number) === week
          );

          return (
            <div
              key={week}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-slate-900">
                Week {week}
              </h2>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {weekAssessments.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <p className="font-semibold text-slate-900">
                      {a.type === "pre" ? "Pre-Test" : "Post-Test"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {a.title}
                    </p>

                    <button
                      onClick={() => openAssignPopup(a)}
                      className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                    >
                      Assign
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900">
              Assign Assessment
            </h2>

            <p className="mt-2 text-slate-600">
              {selectedAssessment.title}
            </p>

            <div className="mt-6 space-y-3">
              {classes.map((className) => (
                <label
                  key={className}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-blue-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedClasses.includes(className)}
                    onChange={() => toggleClass(className)}
                  />
                  <span>{className}</span>
                </label>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={assignAssessment}
                className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-500"
              >
                Assign Selected
              </button>

              <button
                onClick={() => setSelectedAssessment(null)}
                className="flex-1 rounded-xl border border-slate-300 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}