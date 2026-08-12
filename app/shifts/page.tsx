"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { api, todayStr, monthStr, fmtDate, fmtTime } from "@/lib/utils";
import type { ShiftWithUser, UserDoc } from "@/lib/types";

export default function ShiftsPage() {
  const [me, setMe] = useState<UserDoc | null>(null);
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [shifts, setShifts] = useState<ShiftWithUser[]>([]);
  const [filter, setFilter] = useState<{ date: string; month: string }>({ date: "", month: monthStr() });
  const [form, setForm] = useState({ userId: "", date: todayStr(), startTime: "09:00", endTime: "17:00", notes: "" });
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
        const q = new URLSearchParams();
        if (filter.date) q.set("date", filter.date);
        if (filter.month) q.set("month", filter.month);
        const s = await api<{ shifts: ShiftWithUser[] }>(`/api/shifts?${q.toString()}`);
        setShifts(s.shifts);
      } else {
        const s = await api<{ shifts: ShiftWithUser[] }>(`/api/shifts?month=${filter.month}`);
        setShifts(s.shifts);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    }
  }, [filter.date, filter.month]);

  useEffect(() => {
    load();
  }, [load]);

  async function addShift(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.userId) {
      setError("اختر العضو");
      return;
    }
    setLoading(true);
    try {
      await api("/api/shifts", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setSuccess("تم إضافة الشفت بنجاح");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function deleteShift(id: string) {
    if (!confirm("هل تريد حذف هذا الشفت؟")) return;
    try {
      await api(`/api/shifts?id=${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    }
  }

  async function confirmShift(id: string) {
    try {
      await api("/api/shifts", {
        method: "PATCH",
        body: JSON.stringify({ id, date: todayStr() }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    }
  }

  const today = todayStr();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="mb-5 text-2xl font-bold text-slate-800">الشفتات</h1>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

        {isManager && (
          <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-800">تحديد شفت جديد</h2>
            <form onSubmit={addShift} className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
                <label className="mb-1 block text-sm font-medium text-slate-700">من الساعة</label>
                <input
                  type="time"
                  required
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">إلى الساعة</label>
                <input
                  type="time"
                  required
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div className="md:col-span-2 lg:col-span-1">
                <label className="mb-1 block text-sm font-medium text-slate-700">ملاحظات</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div className="flex items-end lg:col-span-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "جاري الإضافة..." : "إضافة الشفت"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-800">قائمة الشفتات</h2>
            <div className="flex flex-wrap gap-3">
              <input
                type="date"
                value={filter.date}
                onChange={(e) => setFilter({ ...filter, date: e.target.value, month: "" })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <input
                type="month"
                value={filter.month}
                onChange={(e) => setFilter({ ...filter, month: e.target.value, date: "" })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {shifts.length === 0 ? (
            <p className="py-8 text-center text-slate-500">لا توجد شفتات مطابقة</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-right text-slate-500">
                    <th className="pb-3 font-medium">العضو</th>
                    <th className="pb-3 font-medium">اليوم</th>
                    <th className="pb-3 font-medium">الوقت</th>
                    <th className="pb-3 font-medium">ملاحظات</th>
                    <th className="pb-3 font-medium">الحالة</th>
                    <th className="pb-3 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shifts.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-3 font-medium text-slate-700">{s.userName}</td>
                      <td className="py-3">{fmtDate(s.date)}</td>
                      <td className="py-3">
                        {fmtTime(s.startTime)} — {fmtTime(s.endTime)}
                      </td>
                      <td className="py-3 text-slate-500">{s.notes || "—"}</td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            s.status === "done"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {s.status === "done" ? "مؤكد" : "قيد التنفيذ"}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          {me?.role === "member" && s.status === "pending" && s.date === today && (
                            <button
                              onClick={() => confirmShift(s.id)}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                            >
                              تأكيد انتهاء
                            </button>
                          )}
                          {isManager && (
                            <button
                              onClick={() => deleteShift(s.id)}
                              className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                            >
                              حذف
                            </button>
                          )}
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
