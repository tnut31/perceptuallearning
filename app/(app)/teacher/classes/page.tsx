"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

type ClassItem = {
  id: string;
  name: string;
  grade_level: string | null;
};

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  class_id: string | null;
};

export default function ClassesPage() {
  const supabase = createClient();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const [newClassName, setNewClassName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("7");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [deleteClassId, setDeleteClassId] = useState<string | null>(null);

  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");

  async function getUserId() {
    const { data } = await supabase.auth.getUser();
    return data.user?.id || null;
  }

  async function loadClassesAndStudents() {
    const userId = await getUserId();
    if (!userId) return;

    const { data: classData } = await supabase
      .from("classes")
      .select("*")
      .eq("teacher_id", userId)
      .order("created_at", { ascending: true });

    const { data: studentData } = await supabase
      .from("students")
      .select("*")
      .eq("teacher_id", userId)
      .order("last_name", { ascending: true });

    setClasses(classData || []);
    setStudents(studentData || []);

    if (classData && classData.length > 0 && !selectedClassId) {
      setSelectedClassId(classData[0].id);
    }
  }

  async function createClass() {
    const userId = await getUserId();
    if (!userId || !newClassName.trim()) return;

    await supabase.from("classes").insert({
      name: newClassName,
      grade_level: gradeLevel,
      teacher_id: userId,
    });

    setNewClassName("");
    setGradeLevel("7");
    loadClassesAndStudents();
  }

  async function addStudent() {
    const userId = await getUserId();
    if (!userId || !selectedClassId) return;
    if (!firstName.trim() || !lastName.trim()) return;

    await supabase.from("students").insert({
      first_name: firstName,
      last_name: lastName,
      class_id: selectedClassId,
      teacher_id: userId,
    });

    setFirstName("");
    setLastName("");
    loadClassesAndStudents();
  }

  function startEditingStudent(student: Student) {
    setEditingStudentId(student.id);
    setEditFirstName(student.first_name);
    setEditLastName(student.last_name);
  }

  async function updateStudent() {
    if (!editingStudentId) return;

    const { error } = await supabase
      .from("students")
      .update({
        first_name: editFirstName,
        last_name: editLastName,
      })
      .eq("id", editingStudentId);

    if (error) {
      alert(error.message);
      return;
    }

    setEditingStudentId(null);
    setEditFirstName("");
    setEditLastName("");
    loadClassesAndStudents();
  }

  async function deleteStudent(studentId: string) {
    const confirmDelete = confirm("Delete this student?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", studentId);

    if (error) {
      alert(error.message);
      return;
    }

    loadClassesAndStudents();
  }

  async function deleteClass(mode: "delete_all" | "keep_students") {
    if (!deleteClassId) return;

    if (mode === "keep_students") {
      await supabase
        .from("students")
        .update({ class_id: null })
        .eq("class_id", deleteClassId);
    }

    await supabase.from("classes").delete().eq("id", deleteClassId);

    setDeleteClassId(null);
    setSelectedClassId(null);
    loadClassesAndStudents();
  }

  useEffect(() => {
    loadClassesAndStudents();
  }, []);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const classStudents = students.filter(
    (s) => s.class_id === selectedClassId
  );

  return (
    <div>
      <h1 className="text-3xl font-semibold text-slate-900">Classes</h1>
      <p className="mt-2 text-slate-600">
        Create classes, choose grade levels, add students, and manage class rosters.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Create Class
          </h2>

          <input
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            placeholder="Example: 1st Period"
            className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3"
          />

          <select
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3"
          >
            <option value="6">Grade 6</option>
            <option value="7">Grade 7</option>
            <option value="8">Grade 8</option>
          </select>

          <button
            onClick={createClass}
            className="mt-4 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-500"
          >
            Add Class
          </button>

          <div className="mt-6 space-y-2">
            {classes.map((classItem) => (
              <div key={classItem.id} className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedClassId(classItem.id)}
                  className={`flex-1 rounded-xl border px-4 py-3 text-left ${
                    selectedClassId === classItem.id
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <p>{classItem.name}</p>
                    <p className="text-xs text-slate-500">
                      Grade {classItem.grade_level || "7"}
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setDeleteClassId(classItem.id)}
                  className="rounded-xl border border-red-200 px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-xl font-semibold text-slate-900">
            {selectedClass
              ? `${selectedClass.name} • Grade ${selectedClass.grade_level || "7"}`
              : "Select a Class"}
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="rounded-xl border border-slate-300 px-4 py-3"
            />

            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="rounded-xl border border-slate-300 px-4 py-3"
            />

            <button
              onClick={addStudent}
              className="rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-500"
            >
              Add Student
            </button>
          </div>

          <div className="mt-6 space-y-2">
            {classStudents.length === 0 ? (
              <p className="text-slate-500">
                No students added to this class yet.
              </p>
            ) : (
              classStudents.map((student) => (
                <div
                  key={student.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  {editingStudentId === student.id ? (
                    <div className="grid gap-3 md:grid-cols-4">
                      <input
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        className="rounded-xl border border-slate-300 px-3 py-2"
                      />

                      <input
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        className="rounded-xl border border-slate-300 px-3 py-2"
                      />

                      <button
                        onClick={updateStudent}
                        className="rounded-xl bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-500"
                      >
                        Save
                      </button>

                      <button
                        onClick={() => setEditingStudentId(null)}
                        className="rounded-xl border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-medium text-slate-900">
                        {student.last_name}, {student.first_name}
                      </p>

                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditingStudent(student)}
                          className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deleteStudent(student.id)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {deleteClassId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">
              Delete Class
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              What would you like to do with the students in this class?
            </p>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => deleteClass("delete_all")}
                className="w-full rounded-xl bg-red-600 py-3 font-semibold text-white hover:bg-red-500"
              >
                Delete class + students
              </button>

              <button
                onClick={() => deleteClass("keep_students")}
                className="w-full rounded-xl bg-yellow-500 py-3 font-semibold text-white hover:bg-yellow-400"
              >
                Keep students unassigned
              </button>

              <button
                onClick={() => setDeleteClassId(null)}
                className="w-full rounded-xl border border-slate-300 py-3 font-semibold text-slate-700 hover:bg-slate-50"
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