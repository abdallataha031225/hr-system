"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/utils";
import type { DepartmentDoc, UserDoc } from "@/lib/types";

interface PerfRow {
  uid: string;
  name: string;
  departmentId: string;
  departmentName: string;
  totalShifts: number;
  doneShifts: number;
  shiftsRate: number;
  totalTasks: number;
  doneTasks: number;
  tasksRate: number;
}

export default function PerformancePage() {
  const [me, setMe] = useState<UserDoc | null>(null);
  const [rows, setRows] = useState<PerfRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentDoc[]>([]);
  const [deptFilter, setDeptFilter] = useState("");
  const [error, setError] = useState("");

  const isAdmin = me?.role === "admin";

  const load = useCallback(async () => {
    try {
      const meRes = await api<{ user: UserDoc }>("/api/me");
      setMe(meRes.user);
      const q = isAdmin && deptFilter ? `?departmentId=${deptFilter}` : "";
      const p = await api<{ rows: PerfRow[]; departments: DepartmentDoc[] }>(`/api/performance${q}`);
      setRows(p.rows);
      setDepartments(p.departments);
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    }
  }, [isAdmin, deptFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-5 text-2xl font-bold text-slate-800">أداء الأعضاء</h1>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {isAdmin && (
          <div className="mb-4 flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">تصفية حسب القسم:</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">كل الأقسام</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-slate-500">لا توجد بيانات</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-right text-slate-500">
                    <th className="pb-3 font-medium">العضو</th>
                    {me?.role !== "member" && <th className="pb-3 font-medium">القسم</th>}
                    <th className="pb-3 font-medium">الشفتات</th>
                    <th className="pb-3 font-medium">المؤكدة</th>
                    <th className="pb-3 font-medium">نسبة الالتزام</th>
                    <th className="pb-3 font-medium">التاسكات</th>
                    <th className="pb-3 font-medium">المُنجزة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.uid} className="hover:bg-slate-50">
                      <td className="py-3 font-medium text-slate-700">{r.name}</td>
                      {me?.role !== "member" && <td className="py-3 text-slate-600">{r.departmentName}</td>}
                      <td className="py-3">{r.totalShifts}</td>
                      <td className="py-3">{r.doneShifts}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                r.shiftsRate >= 80 ? "bg-emerald-500" : r.shiftsRate >= 50 ? "bg-amber-500" : "bg-red-500"
                              }`}
                              style={{ width: `${r.shiftsRate}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600">%{r.shiftsRate}</span>
                        </div>
                      </td>
                      <td className="py-3">{r.totalTasks}</td>
                      <td className="py-3">
                        <span className="text-slate-700">
                          {r.doneTasks}
                          {r.totalTasks > 0 && (
                            <span className="mr-1 text-xs text-slate-400">(%{r.tasksRate})</span>
                          )}
                        </span>
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
