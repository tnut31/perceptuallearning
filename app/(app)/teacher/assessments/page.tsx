"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type AssignmentClassInfo = {
  class_id: string | null;
  class_name: string;
  assigned_at: string | null;
};

type Assignment = {
  id: string;
  title: string;
  week_number: number | null;
  type: string | null;
  question_count: number;
  assigned_classes: AssignmentClassInfo[];
  last_assigned_at: string | null;
  assigned_student_count: number;
  completed_student_count: number;
};

type AssignmentRow = {
  id: string;
  title: string;
  week_number: number | null;
  type: string | null;
};

type AssessmentQuestionRow = {
  assessment_id: string;
};

type DuplicateQuestionRow = {
  question_id: string;
  question_order: number | null;
};

type AssignedAssessmentRow = {
  id: string;
  assessment_id: string;
  class_id: string | null;
  class_name: string | null;
  assigned_at: string | null;
};

type StudentRow = {
  id: string;
  class_id: string | null;
};

type SubmissionRow = {
  assigned_assessment_id: string;
  student_id: string;
};

type AttemptRow = {
  assigned_assessment_id: string;
  student_id: string;
  submitted_at: string | null;
};

type ClassItem = {
  id: string;
  name: string;
};

type AssignmentStatus =
  | "assigned"
  | "completed"
  | "incomplete"
  | "not_started"
  | "not_assigned";

const ASSIGNMENT_FILTERS = [
  { value: "pre", label: "Pre Tests" },
  { value: "post", label: "Post Tests" },
  { value: "formative", label: "Knowledge Checks" },
  { value: "practice", label: "Practice" },
  { value: "reteach", label: "Reteach" },
  { value: "enrichment", label: "Enrichment" },
] as const;

const STATUS_FILTERS: Array<{ value: AssignmentStatus; label: string }> = [
  { value: "assigned", label: "Assigned" },
  { value: "completed", label: "Completed" },
  { value: "incomplete", label: "Incomplete" },
  { value: "not_started", label: "Not Started" },
  { value: "not_assigned", label: "Not Assigned" },
];

function formatAssignmentType(value: string | null) {
  if (value === "pre") return "Pre Test";
  if (value === "post") return "Post Test";
  if (value === "formative") return "Knowledge Check";
  if (value === "practice") return "Practice";
  if (value === "reteach") return "Reteach";
  if (value === "enrichment") return "Enrichment";
  return "Not set";
}

function formatAssignedDate(value: string | null) {
  if (!value) return "Not assigned";
  return new Date(value).toLocaleDateString();
}

function getLatestDate(values: Array<string | null>) {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value));

  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

function getCompletionPercentage(assignment: Assignment) {
  if (assignment.assigned_student_count === 0) return null;

  return Math.round(
    (assignment.completed_student_count / assignment.assigned_student_count) *
      100
  );
}

function getAssignmentStatuses(assignment: Assignment): AssignmentStatus[] {
  const hasAssignments = assignment.assigned_classes.length > 0;

  if (!hasAssignments) return ["not_assigned"];

  const statuses: AssignmentStatus[] = ["assigned"];

  if (assignment.completed_student_count === 0) {
    statuses.push("not_started");
  } else if (
    assignment.assigned_student_count > 0 &&
    assignment.completed_student_count >= assignment.assigned_student_count
  ) {
    statuses.push("completed");
  } else {
    statuses.push("incomplete");
  }

  return statuses;
}

function getAssignmentStatusLabel(status: AssignmentStatus) {
  return STATUS_FILTERS.find((filter) => filter.value === status)?.label || status;
}

function filterChipClass(isActive: boolean) {
  return isActive
    ? "h-9 rounded-full border border-blue-600 bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm"
    : "h-9 rounded-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50";
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [classStudentCounts, setClassStudentCounts] = useState<
    Record<string, number>
  >({});
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [activeStatusFilters, setActiveStatusFilters] = useState<
    AssignmentStatus[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyAssignmentId, setBusyAssignmentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      const supabase = createClient();

      setIsLoading(true);
      setErrorMessage("");

      const { data: assignmentData, error: assignmentError } = await supabase
        .from("assessments")
        .select("id, title, week_number, type")
        .order("week_number", { ascending: true })
        .order("type", { ascending: true });

      if (assignmentError) {
        setErrorMessage(assignmentError.message);
        setAssignments([]);
        setIsLoading(false);
        return;
      }

      const { data: questionRows, error: questionRowsError } = await supabase
        .from("assessment_questions")
        .select("assessment_id");

      if (questionRowsError) {
        setErrorMessage(questionRowsError.message);
        setAssignments([]);
        setIsLoading(false);
        return;
      }

      const { data: assignedRows, error: assignedRowsError } = await supabase
        .from("assigned_assessments")
        .select("id, assessment_id, class_id, class_name, assigned_at");

      if (assignedRowsError) {
        setErrorMessage(assignedRowsError.message);
        setAssignments([]);
        setIsLoading(false);
        return;
      }

      const { data: studentRows, error: studentRowsError } = await supabase
        .from("students")
        .select("id, class_id");

      if (studentRowsError) {
        setErrorMessage(studentRowsError.message);
        setAssignments([]);
        setIsLoading(false);
        return;
      }

      const assignedAssessmentIds = ((assignedRows || []) as AssignedAssessmentRow[])
        .map((row) => row.id)
        .filter((id): id is string => Boolean(id));

      const { data: responseRows, error: responseRowsError } =
        assignedAssessmentIds.length > 0
          ? await supabase
              .from("responses")
              .select("assigned_assessment_id, student_id")
              .in("assigned_assessment_id", assignedAssessmentIds)
          : { data: [], error: null };

      if (responseRowsError) {
        setErrorMessage(responseRowsError.message);
        setAssignments([]);
        setIsLoading(false);
        return;
      }

      const { data: attemptRows, error: attemptRowsError } =
        assignedAssessmentIds.length > 0
          ? await supabase
              .from("assessment_attempts")
              .select("assigned_assessment_id, student_id, submitted_at")
              .in("assigned_assessment_id", assignedAssessmentIds)
          : { data: [], error: null };

      if (attemptRowsError) {
        setErrorMessage(attemptRowsError.message);
        setAssignments([]);
        setIsLoading(false);
        return;
      }

      const counts = new Map<string, number>();
      ((questionRows || []) as AssessmentQuestionRow[]).forEach((row) => {
        counts.set(row.assessment_id, (counts.get(row.assessment_id) || 0) + 1);
      });

      const assignedByAssessment = new Map<string, AssignmentClassInfo[]>();
      const assignedRowsByAssessment = new Map<string, AssignedAssessmentRow[]>();
      ((assignedRows || []) as AssignedAssessmentRow[]).forEach((row) => {
        const current = assignedByAssessment.get(row.assessment_id) || [];
        current.push({
          class_id: row.class_id,
          class_name: row.class_name || "Unnamed class",
          assigned_at: row.assigned_at,
        });
        assignedByAssessment.set(row.assessment_id, current);

        const currentRows = assignedRowsByAssessment.get(row.assessment_id) || [];
        currentRows.push(row);
        assignedRowsByAssessment.set(row.assessment_id, currentRows);
      });

      const studentsByClass = new Map<string, Set<string>>();
      ((studentRows || []) as StudentRow[]).forEach((student) => {
        if (!student.class_id) return;
        const current = studentsByClass.get(student.class_id) || new Set<string>();
        current.add(student.id);
        studentsByClass.set(student.class_id, current);
      });
      setClassStudentCounts(
        Object.fromEntries(
          Array.from(studentsByClass.entries()).map(([classId, students]) => [
            classId,
            students.size,
          ])
        )
      );

      const completedByAssignedAssessment = new Map<string, Set<string>>();
      ((responseRows || []) as SubmissionRow[]).forEach((response) => {
        const current =
          completedByAssignedAssessment.get(response.assigned_assessment_id) ||
          new Set<string>();
        current.add(response.student_id);
        completedByAssignedAssessment.set(
          response.assigned_assessment_id,
          current
        );
      });
      ((attemptRows || []) as AttemptRow[]).forEach((attempt) => {
        if (!attempt.submitted_at) return;
        const current =
          completedByAssignedAssessment.get(attempt.assigned_assessment_id) ||
          new Set<string>();
        current.add(attempt.student_id);
        completedByAssignedAssessment.set(
          attempt.assigned_assessment_id,
          current
        );
      });

      setAssignments(
        ((assignmentData || []) as AssignmentRow[]).map((assignment) => {
          const assignedClasses =
            assignedByAssessment.get(assignment.id) || [];
          const assignmentRows = assignedRowsByAssessment.get(assignment.id) || [];
          const assignedStudents = new Set<string>();
          const completedStudents = new Set<string>();

          assignmentRows.forEach((row) => {
            if (row.class_id) {
              studentsByClass
                .get(row.class_id)
                ?.forEach((studentId) => assignedStudents.add(studentId));
            }

            completedByAssignedAssessment
              .get(row.id)
              ?.forEach((studentId) => completedStudents.add(studentId));
          });

          return {
            ...assignment,
            question_count: counts.get(assignment.id) || 0,
            assigned_classes: assignedClasses,
            last_assigned_at: getLatestDate(
              assignedClasses.map((item) => item.assigned_at)
            ),
            assigned_student_count: assignedStudents.size,
            completed_student_count: Array.from(completedStudents).filter(
              (studentId) => assignedStudents.has(studentId)
            ).length,
          };
        })
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      let classQuery = supabase
        .from("classes")
        .select("id, name")
        .order("name", { ascending: true });

      if (user?.id) {
        classQuery = classQuery.eq("teacher_id", user.id);
      }

      const { data: classData } = await classQuery;
      setClasses((classData || []) as ClassItem[]);
      setIsLoading(false);
    }

    loadDashboard();
  }, []);

  const filteredAssignments = useMemo(
    () =>
      assignments.filter((assignment) => {
        const matchesType =
          activeFilters.length === 0 ||
          (assignment.type !== null && activeFilters.includes(assignment.type));
        const assignmentStatuses = getAssignmentStatuses(assignment);
        const matchesStatus =
          activeStatusFilters.length === 0 ||
          activeStatusFilters.some((status) =>
            assignmentStatuses.includes(status)
          );

        return matchesType && matchesStatus;
      }),
    [activeFilters, activeStatusFilters, assignments]
  );

  const groupedAssignments = useMemo(() => {
    const groups = new Map<string, Assignment[]>();

    filteredAssignments.forEach((assignment) => {
      const key =
        assignment.week_number === null || assignment.week_number === undefined
          ? "No week"
          : `Week ${assignment.week_number}`;
      groups.set(key, [...(groups.get(key) || []), assignment]);
    });

    return Array.from(groups.entries());
  }, [filteredAssignments]);

  function toggleFilter(type: string) {
    setActiveFilters((current) =>
      current.includes(type)
        ? current.filter((selectedType) => selectedType !== type)
        : [...current, type]
    );
  }

  function toggleStatusFilter(status: AssignmentStatus) {
    setActiveStatusFilters((current) =>
      current.includes(status)
        ? current.filter((selectedStatus) => selectedStatus !== status)
        : [...current, status]
    );
  }

  function openAssignPopup(assignment: Assignment) {
    setSelectedAssignment(assignment);
    setSelectedClasses([]);
  }

  function toggleClass(classId: string) {
    setSelectedClasses((current) =>
      current.includes(classId)
        ? current.filter((selectedClass) => selectedClass !== classId)
        : [...current, classId]
    );
  }

  async function assignAssignment() {
    if (!selectedAssignment) return;

    if (selectedClasses.length === 0) {
      setErrorMessage("Select at least one class.");
      return;
    }

    const supabase = createClient();
    const rows = selectedClasses.map((classId) => {
      const classItem = classes.find((item) => item.id === classId);

      return {
        assessment_id: selectedAssignment.id,
        class_id: classId,
        class_name: classItem?.name || null,
      };
    });

    const { data, error } = await supabase
      .from("assigned_assessments")
      .insert(rows)
      .select("assessment_id, class_id, class_name, assigned_at");

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const insertedAssignments = ((data || []) as AssignedAssessmentRow[]).map(
      (row) => ({
        class_id: row.class_id,
        class_name: row.class_name || "Unnamed class",
        assigned_at: row.assigned_at,
      })
    );

    setAssignments((current) =>
      current.map((assignment) => {
        if (assignment.id !== selectedAssignment.id) return assignment;

        const nextAssignedClasses = [
          ...assignment.assigned_classes,
          ...insertedAssignments,
        ];
        const existingClassIds = new Set(
          assignment.assigned_classes
            .map((item) => item.class_id)
            .filter((classId): classId is string => Boolean(classId))
        );
        const newStudentCount = insertedAssignments.reduce((total, item) => {
          if (!item.class_id || existingClassIds.has(item.class_id)) {
            return total;
          }

          return total + (classStudentCounts[item.class_id] || 0);
        }, 0);

        return {
          ...assignment,
          assigned_classes: nextAssignedClasses,
          last_assigned_at: getLatestDate(
            nextAssignedClasses.map((item) => item.assigned_at)
          ),
          assigned_student_count:
            assignment.assigned_student_count + newStudentCount,
        };
      })
    );
    setSelectedAssignment(null);
    setSelectedClasses([]);
  }

  async function duplicateAssignment(assignment: Assignment) {
    const supabase = createClient();
    setBusyAssignmentId(assignment.id);
    setErrorMessage("");

    const { data: copiedAssignment, error: copyError } = await supabase
      .from("assessments")
      .insert({
        title: `${assignment.title} (Copy)`,
        week_number: assignment.week_number,
        type: assignment.type,
      })
      .select("id, title, week_number, type")
      .single();

    if (copyError) {
      setErrorMessage(copyError.message);
      setBusyAssignmentId(null);
      return;
    }

    const { data: questionRows, error: questionRowsError } = await supabase
      .from("assessment_questions")
      .select("question_id, question_order")
      .eq("assessment_id", assignment.id)
      .order("question_order", { ascending: true });

    if (questionRowsError) {
      setErrorMessage(questionRowsError.message);
      setBusyAssignmentId(null);
      return;
    }

    const copiedQuestionRows = ((questionRows || []) as DuplicateQuestionRow[])
      .filter((row) => row.question_id)
      .map((row, index) => ({
        assessment_id: copiedAssignment.id,
        question_id: row.question_id,
        question_order: row.question_order ?? index + 1,
      }));

    if (copiedQuestionRows.length > 0) {
      const { error: insertQuestionsError } = await supabase
        .from("assessment_questions")
        .insert(copiedQuestionRows);

      if (insertQuestionsError) {
        await supabase
          .from("assessments")
          .delete()
          .eq("id", copiedAssignment.id);
        setErrorMessage(insertQuestionsError.message);
        setBusyAssignmentId(null);
        return;
      }
    }

    setAssignments((current) => [
      ...current,
      {
        ...((copiedAssignment || {}) as AssignmentRow),
        question_count: copiedQuestionRows.length,
        assigned_classes: [],
        last_assigned_at: null,
        assigned_student_count: 0,
        completed_student_count: 0,
      },
    ]);
    setBusyAssignmentId(null);
  }

  async function deleteAssignment() {
    if (!deleteTarget) return;

    const supabase = createClient();
    setBusyAssignmentId(deleteTarget.id);
    setErrorMessage("");

    const { error: questionDeleteError } = await supabase
      .from("assessment_questions")
      .delete()
      .eq("assessment_id", deleteTarget.id);

    if (questionDeleteError) {
      setErrorMessage(questionDeleteError.message);
      setBusyAssignmentId(null);
      return;
    }

    const { error: assignmentDeleteError } = await supabase
      .from("assigned_assessments")
      .delete()
      .eq("assessment_id", deleteTarget.id);

    if (assignmentDeleteError) {
      setErrorMessage(assignmentDeleteError.message);
      setBusyAssignmentId(null);
      return;
    }

    const { error: assessmentDeleteError } = await supabase
      .from("assessments")
      .delete()
      .eq("id", deleteTarget.id);

    if (assessmentDeleteError) {
      setErrorMessage(assessmentDeleteError.message);
      setBusyAssignmentId(null);
      return;
    }

    setAssignments((current) =>
      current.filter((assignment) => assignment.id !== deleteTarget.id)
    );
    setDeleteTarget(null);
    setBusyAssignmentId(null);
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Assignments
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Manage tests, knowledge checks, practice, reteach, and enrichment
            in one instructional hub.
          </p>
        </div>

        <Link
          href="/teacher/assessments/create"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          Create Assignment
        </Link>
      </div>

      {errorMessage && (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Filters</h2>
              <p className="text-sm text-slate-500">
                Narrow assignments by type and current student progress.
              </p>
            </div>
            <p className="text-sm font-medium text-slate-500">
              {filteredAssignments.length} of {assignments.length} shown
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-[140px_minmax(0,1fr)] xl:items-center">
            <p className="text-sm font-semibold text-slate-700">Type</p>
            <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveFilters([])}
              className={filterChipClass(activeFilters.length === 0)}
            >
              All
            </button>
            {ASSIGNMENT_FILTERS.map((filter) => {
              const isActive = activeFilters.includes(filter.value);

              return (
                <button
                  key={filter.value}
                  onClick={() => toggleFilter(filter.value)}
                  className={filterChipClass(isActive)}
                >
                  {filter.label}
                </button>
              );
            })}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[140px_minmax(0,1fr)] xl:items-center">
            <p className="text-sm font-semibold text-slate-700">Status</p>
            <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveStatusFilters([])}
              className={filterChipClass(activeStatusFilters.length === 0)}
            >
              All
            </button>
            {STATUS_FILTERS.map((filter) => {
              const isActive = activeStatusFilters.includes(filter.value);

              return (
                <button
                  key={filter.value}
                  onClick={() => toggleStatusFilter(filter.value)}
                  className={filterChipClass(isActive)}
                >
                  {filter.label}
                </button>
              );
            })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <p className="p-6 text-slate-500">Loading assignments...</p>
        ) : assignments.length === 0 ? (
          <div className="p-6">
            <p className="text-slate-500">No assignments created yet.</p>
            <Link
              href="/teacher/assessments/create"
              className="mt-4 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
            >
              Create Assignment
            </Link>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <p className="p-6 text-slate-500">
            No assignments match those filters.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {groupedAssignments.map(([groupLabel, groupAssignments]) => (
              <section key={groupLabel} className="p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {groupLabel}
                </h2>

                <div className="mt-3 grid gap-3 xl:grid-cols-2">
                  {groupAssignments.map((assignment) => {
                    const completionPercentage =
                      getCompletionPercentage(assignment);
                    const completionWidth = completionPercentage ?? 0;
                    const statusLabel = getAssignmentStatuses(assignment)
                      .map(getAssignmentStatusLabel)
                      .join(" / ");

                    return (
                      <article
                        key={assignment.id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                  {formatAssignmentType(assignment.type)}
                                </span>
                                <span className="text-xs font-medium text-slate-500">
                                  {assignment.week_number
                                    ? `Week ${assignment.week_number}`
                                    : "No week"}
                                </span>
                              </div>
                              <h3 className="mt-2 text-lg font-semibold leading-6 text-slate-950">
                                {assignment.title}
                              </h3>
                              <p className="mt-1 text-sm text-slate-500">
                                {assignment.question_count} questions - Last assigned{" "}
                                {formatAssignedDate(assignment.last_assigned_at)}
                              </p>
                            </div>

                            <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              {statusLabel}
                            </span>
                          </div>

                          <div className="border-t border-slate-100 pt-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {assignment.completed_student_count}/
                                  {assignment.assigned_student_count} Completed
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {assignment.assigned_student_count} students assigned
                                </p>
                              </div>
                              <p className="text-sm font-semibold text-blue-700">
                                {completionPercentage === null
                                  ? "Not assigned"
                                  : `${completionPercentage}% Completion`}
                              </p>
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-blue-600"
                                style={{ width: `${completionWidth}%` }}
                              />
                            </div>
                          </div>

                          <div className="text-sm text-slate-600">
                            <span className="font-semibold text-slate-700">
                              Classes:
                            </span>{" "}
                            {assignment.assigned_classes.length > 0
                              ? assignment.assigned_classes
                                  .map((item) => item.class_name)
                                  .join(", ")
                              : "No classes assigned"}
                          </div>

                          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                            <Link
                              href={`/teacher/assessments/${assignment.id}/edit`}
                              className="inline-flex h-9 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => duplicateAssignment(assignment)}
                              disabled={busyAssignmentId === assignment.id}
                              className="inline-flex h-9 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Duplicate
                            </button>
                            <button
                              onClick={() => openAssignPopup(assignment)}
                              className="inline-flex h-9 items-center rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-500"
                            >
                              Assign
                            </button>
                            <button
                              onClick={() => setDeleteTarget(assignment)}
                              disabled={busyAssignmentId === assignment.id}
                              className="inline-flex h-9 items-center rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900">
              Assign Assignment
            </h2>

            <p className="mt-2 text-slate-600">{selectedAssignment.title}</p>

            <div className="mt-6 space-y-3">
              {classes.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Create a class before assigning assignments.
                </p>
              ) : (
                classes.map((classItem) => (
                  <label
                    key={classItem.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-blue-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedClasses.includes(classItem.id)}
                      onChange={() => toggleClass(classItem.id)}
                    />
                    <span>{classItem.name}</span>
                  </label>
                ))
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={assignAssignment}
                className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-500"
              >
                Assign Selected
              </button>

              <button
                onClick={() => setSelectedAssignment(null)}
                className="flex-1 rounded-xl border border-slate-300 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900">
              Delete Assignment?
            </h2>
            <p className="mt-2 text-slate-600">
              This removes <span className="font-semibold">{deleteTarget.title}</span> and its question links and
              class assignments. Student results are left untouched.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={deleteAssignment}
                disabled={busyAssignmentId === deleteTarget.id}
                className="flex-1 rounded-xl bg-red-600 py-3 font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                Delete
              </button>

              <button
                onClick={() => setDeleteTarget(null)}
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
