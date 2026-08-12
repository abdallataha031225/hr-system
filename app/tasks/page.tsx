"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { api, todayStr, fmtDate } from "@/lib/utils";
import type { TaskWithUser, UserDoc } from "@/lib/types";

export default function TasksPage() {
  const [me, setMe] = useState<UserDoc | null>(null);
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [tasks, setTasks] = useState<TaskWithUser[]>([]);
  const [form, setForm] = useState({ userId: "", title: "", description: "", date: todayStr() });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const isManager = me?.role === "supervisor" || me?.role === "admin";

  const load = useCallback(async () => {
    try {
      const meRes = await api<{ user: UserDoc }>("/api/me");
      setMe(meRes.user);
      if (meRes.user.role === "supervisor" || meRes.user.role === "admin") {
        const u = await api<{ users: UserDoc[] }>("/api/users");
        setUsers(u.users.filter((x) => x.active));
      }
      const t = await api<{ tasks: TaskWithUser[] }>("/api/tasks");
      setTasks(t.tasks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.userId || !form.title) {
      setError("اختر العضو وأدخل عنوان التاسك");
      return;
    }
    setLoading(true);
    try {
      await api("/api/tasks", { method: "POST", body: JSON.stringify(form) });
      setSuccess("تمت إضافة التاسك");
      await load();
      setForm({ ...form, title: "", description: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function toggleTask(t: TaskWithUser) {
    try {
      await api("/api/tasks", {
        method: "PATCH",
        body: JSON.stringify({ id: t.id, status: t.status === "done" ? "pending" : "done" }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    }
  }

  async function deleteTask(id: string) {
    if (!confirm("هل تريد حذف هذا التاسك؟")) return;
    try {
      await api(`/api/tasks?id=${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="mb-5 text-2xl font-bold text-slate-800">التاسكات</h1>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

        {isManager && (
          <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-800">إضافة تاسك</h2>
            <form onSubmit={addTask} className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">العضو</label>
                <select
                  required
                  value={form.userId}
                  onChange={(e) => setForm({ ...form, userId: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">اختر العضو...</option>
                  {users.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">العنوان</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">اليوم</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">التفاصيل</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div className="flex items-end md:col-span-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "جاري الإضافة..." : "إضافة التاسك"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-800">قائمة التاسكات</h2>
          {tasks.length === 0 ? (
            <p className="py-8 text-center text-slate-500">لا توجد تاسكات</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className={`rounded-xl border p-4 ${
                    t.status === "done" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-800">{t.title}</h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        t.status === "done" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {t.status === "done" ? "تم" : "معلق"}
                    </span>
                  </div>
                  {isManager && <p className="mb-1 text-sm text-slate-600">{t.userName}</p>}
                  {t.description && <p className="mb-1 text-sm text-slate-500">{t.description}</p>}
                  <p className="mb-3 text-xs text-slate-400">{fmtDate(t.date)}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleTask(t)}
                      className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100"
                    >
                      {t.status === "done" ? "إلغاء الإنجاز" : "أكمل التاسك"}
                    </button>
                    {isManager && (
                      <button
                        onClick={() => deleteTask(t.id)}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
