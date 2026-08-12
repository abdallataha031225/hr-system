"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/utils";
import type { UserDoc } from "@/lib/types";

interface DepartmentRow {
  id: string;
  name: string;
  supervisorId: string;
  supervisorName: string;
  memberCount: number;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [supervisors, setSupervisors] = useState<UserDoc[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api<{ departments: DepartmentRow[]; supervisors: UserDoc[] }>("/api/departments");
      setDepartments(d.departments);
      setSupervisors(d.supervisors);
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addDepartment(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!name.trim()) {
      setError("أدخل اسم القسم");
      return;
    }
    setLoading(true);
    try {
      await api("/api/departments", { method: "POST", body: JSON.stringify({ name }) });
      setSuccess("تمت إضافة القسم");
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function setSupervisor(id: string, supervisorId: string) {
    try {
      await api("/api/departments", { method: "PATCH", body: JSON.stringify({ id, supervisorId }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    }
  }

  async function renameDepartment(id: string, currentName: string) {
    const newName = prompt("الاسم الجديد للقسم:", currentName);
    if (!newName || newName.trim() === currentName) return;
    try {
      await api("/api/departments", { method: "PATCH", body: JSON.stringify({ id, name: newName.trim() }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    }
  }

  async function deleteDepartment(id: string) {
    if (!confirm("هل تريد حذف هذا القسم؟ (لن ينجح إذا كان به أعضاء)")) return;
    try {
      await api(`/api/departments?id=${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-5 text-2xl font-bold text-slate-800">الأقسام</h1>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-800">إضافة قسم جديد</h2>
          <form onSubmit={addDepartment} className="flex flex-wrap gap-3">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم القسم (مثال: قسم المبيعات)"
              className="min-w-64 flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "جاري الإضافة..." : "إضافة القسم"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-800">قائمة الأقسام ({departments.length})</h2>
          {departments.length === 0 ? (
            <p className="py-8 text-center text-slate-500">لا توجد أقسام بعد</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-right text-slate-500">
                    <th className="pb-3 font-medium">القسم</th>
                    <th className="pb-3 font-medium">المشرف</th>
                    <th className="pb-3 font-medium">عدد الأعضاء</th>
                    <th className="pb-3 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="py-3 font-medium text-slate-700">{d.name}</td>
                      <td className="py-3">
                        <select
                          value={d.supervisorId}
                          onChange={(e) => setSupervisor(d.id, e.target.value)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="">بدون مشرف</option>
                          {supervisors.map((s) => (
                            <option key={s.uid} value={s.uid}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3">{d.memberCount}</td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => renameDepartment(d.id, d.name)}
                            className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-600 hover:bg-sky-100"
                          >
                            إعادة تسمية
                          </button>
                          <button
                            onClick={() => deleteDepartment(d.id)}
                            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
