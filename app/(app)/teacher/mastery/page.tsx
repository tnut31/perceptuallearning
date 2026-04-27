"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

const clusters = [
  "Proportional Relationships",
  "Number System",
  "Expressions & Equations",
  "Geometry",
  "Statistics & Probability",
];

type MasteryStudent = {
  name: string;
  scores: Record<string, number>;
};

type StudentRow = {
  id: string;
  first_name: string;
  last_name: string;
};

type ClassItem = {
  id: string;
  name: string;
};

function masteryLabel(score: number) {
  if (score >= 85) return "Distinguished";
  if (score >= 51) return "Proficient";
  if (score >= 26) return "Approaching";
  return "Not Yet";
}

function masteryColor(score: number) {
  if (score >= 85) return "bg-blue-100 text-blue-700 border-blue-200";   // D
  if (score >= 51) return "bg-green-100 text-green-700 border-green-200"; // P
  if (score >= 26) return "bg-yellow-100 text-yellow-700 border-yellow-200"; // A
  return "bg-red-100 text-red-700 border-red-200"; // N
}

export default function MasteryTrackerPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<MasteryStudent[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("Week 1");

  useEffect(() => {
    async function loadClasses() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;

      if (!userId) return;

      const { data: classData } = await supabase
        .from("classes")
        .select("id, name")
        .eq("teacher_id", userId)
        .order("created_at", { ascending: true });

      setClasses(classData || []);

      if (classData && classData.length > 0) {
        setSelectedClassId(classData[0].id);
      }
    }

    loadClasses();
  }, []);

  useEffect(() => {
    async function loadStudents() {
      if (!selectedClassId) {
        setStudents([]);
        return;
      }

      const supabase = createClient();
      const { data: studentData } = await supabase
        .from("students")
        .select("id, first_name, last_name")
        .eq("class_id", selectedClassId)
        .order("last_name", { ascending: true });

      setStudents(
        ((studentData || []) as StudentRow[]).map((student) => ({
          name: `${student.first_name} ${student.last_name}`,
          scores: Object.fromEntries(
            clusters.map((cluster) => [cluster, 0])
          ),
        }))
      );
    }

    loadStudents();
  }, [selectedClassId]);

  const clusterAverages = clusters.map((cluster) => {
    const total = students.reduce(
      (sum, s) => sum + s.scores[cluster],
      0
    );
    return {
      cluster,
      avg: students.length ? Math.round(total / students.length) : 0,
    };
  });

  const classAverage =
    clusterAverages.length
      ? clusterAverages.reduce((sum, c) => sum + c.avg, 0) /
        clusterAverages.length
      : 0;

  return (
    <div>
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Mastery Tracker
          </h1>
          <p className="mt-2 text-slate-600">
            Track mastery by cluster across time.
          </p>
        </div>

        <div className="flex gap-3">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="rounded-xl border px-4 py-2"
          >
            {classes.length === 0 ? (
              <option value="">No classes</option>
            ) : (
              classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </option>
              ))
            )}
          </select>

          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="rounded-xl border px-4 py-2"
          >
            {Array.from({ length: 20 }, (_, i) => (
              <option key={i}>Week {i + 1}</option>
            ))}
          </select>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="mt-8 grid gap-6 md:grid-cols-4">
        <div className="rounded-2xl border p-6">
          <p className="text-sm text-slate-500">Class Average</p>
          <p className="text-4xl font-semibold text-blue-600">
            {Math.round(classAverage)}%
          </p>
        </div>

        <div className="rounded-2xl border p-6">
          <p className="text-sm text-slate-500">Lowest Cluster</p>
          <p className="text-lg font-semibold">
            {
              clusterAverages.sort((a, b) => a.avg - b.avg)[0]
                .cluster
            }
          </p>
        </div>

        <div className="rounded-2xl border p-6">
          <p className="text-sm text-slate-500">Growth</p>
          <p className="text-4xl font-semibold text-green-600">
            +18%
          </p>
        </div>

        <div className="rounded-2xl border p-6">
          <p className="text-sm text-slate-500">
            Students Needing Support
          </p>
          <p className="text-4xl font-semibold text-red-600">
            0
          </p>
        </div>
      </div>

      {/* CLUSTER BARS */}
      <div className="mt-8 rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">
          Cluster Mastery
        </h2>

        <div className="mt-4 space-y-4">
          {clusterAverages.map((c) => (
            <div key={c.cluster}>
              <div className="flex justify-between text-sm">
                <span>{c.cluster}</span>
                <span>{c.avg}%</span>
              </div>

              <div className="h-3 rounded bg-slate-100">
                <div
                  className="h-3 rounded bg-blue-600"
                  style={{ width: `${c.avg}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* HEATMAP */}
      <div className="mt-8 rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">
          Student Heatmap
        </h2>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-3">Student</th>
                {clusters.map((c) => (
                  <th key={c} className="text-left p-3">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {students.length ? (
                students.map((s) => (
                  <tr key={s.name}>
                    <td className="p-3 font-medium">
                      {s.name}
                    </td>

                    {clusters.map((c) => {
                      const score = s.scores[c];

                      return (
                        <td key={c} className="p-3">
                          <div
                            className={`rounded-lg border px-2 py-1 text-center ${masteryColor(
                              score
                            )}`}
                          >
                            {score}%
                            <div className="text-xs">
                              {masteryLabel(score)}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="p-3 text-slate-500"
                    colSpan={clusters.length + 1}
                  >
                    No students to display.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GROWTH */}
      <div className="mt-8 rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">
          Pre → Post Growth
        </h2>

        <div className="mt-4 space-y-4">
          {clusters.map((c, i) => {
            const pre = 45 + i * 5;
            const post = pre + 18;

            return (
              <div key={c}>
                <div className="flex justify-between text-sm">
                  <span>{c}</span>
                  <span className="text-green-600">
                    +{post - pre}%
                  </span>
                </div>

                <div className="h-3 rounded bg-slate-100">
                  <div
                    className="h-3 rounded bg-blue-600"
                    style={{ width: `${post}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
