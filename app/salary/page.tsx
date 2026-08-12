"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { api, monthStr, fmtMoney } from "@/lib/utils";
import type { SalaryEntryDoc, UserDoc } from "@/lib/types";

interface SalaryData {
  users: UserDoc[];
  entries: SalaryEntryDoc[];
}

export default function SalaryPage() {
  const [me, setMe] = useState<UserDoc | null>(null);
  const [data, setData] = useState<SalaryData>({ users: [], entries: [] });
  const [month, setMonth] = useState(monthStr());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [baseForm, setBaseForm] = useState({ userId: "", baseSalary: "" });
  const [entryForm, setEntryForm] = useState({ userId: "", bonus: "0", deduction: "0", notes: "" });

  const isAdmin = me?.role === "admin";
  const entryMap = new Map(data.entries.map((e) => [e.userId, e]));

  const load = useCallback(async () => {
    try {
      const meRes = await api<{ user: UserDoc }>("/api/me");
      setMe(meRes.user);
      const d = await api<SalaryData>(`/api/salary?month=${month}`);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  async function setBase(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!baseForm.userId || baseForm.baseSalary === "") {
      setError("اختر العضو وأدخل المرتب");
      return;
    }
    setLoading(true);
    try {
      await api("/api/salary", {
        method: "POST",
        body: JSON.stringify({ type: "base", userId: baseForm.userId, baseSalary: Number(baseForm.baseSalary) }),
      });
      setSuccess("تم تحديث المرتب الأساسي");
      setBaseForm({ userId: "", baseSalary: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!entryForm.userId) {
      setError("اختر العضو");
      return;
    }
    setLoading(true);
    try {
      await api("/api/salary", {
        method: "POST",
        body: JSON.stringify({ ...entryForm, type: "entry", month }),
      });
      setSuccess("تمت إضافة تفاصيل الشهر");
      setEntryForm({ userId: "", bonus: "0", deduction: "0", notes: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm("هل تريد حذف هذا الإدخال؟")) return;
    try {
      await api(`/api/salary?id=${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    }
  }

  const myUser = data.users.find((u) => u.uid === me?.uid) || me;
  const myEntry = myUser ? entryMap.get(myUser.uid) : null;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-5 text-2xl font-bold text-slate-800">المرتبات</h1>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

        {/* بطاقة المرتب الخاص */}
        {myUser && (
          <section className="mb-6 rounded-xl border border-indigo-200 bg-gradient-to-l from-indigo-600 to-sky-600 p-6 text-white shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-indigo-100">{isAdmin ? "المرتب الخاص بك" : "مرتبك"}</p>
                <p className="mt-1 text-3xl font-bold">{fmtMoney(myUser.baseSalary)}</p>
                <p className="mt-1 text-sm text-indigo-100">المرتب الأساسي</p>
              </div>
              <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
                <p className="text-sm text-indigo-100">تفاصيل شهر {month}</p>
                <p className="mt-1 text-sm">حوافز: {fmtMoney(myEntry?.bonus || 0)}</p>
                <p className="text-sm">خصومات: {fmtMoney(myEntry?.deduction || 0)}</p>
                {myEntry?.notes && <p className="mt-1 text-xs text-indigo-100">{myEntry.notes}</p>}
                <p className="mt-2 border-t border-white/20 pt-2 font-bold">
                  الصافي: {fmtMoney(myUser.baseSalary + (myEntry?.bonus || 0) - (myEntry?.deduction || 0))}
                </p>
              </div>
            </div>
          </section>
        )}

        {isAdmin && (
          <section className="mb-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-slate-800">تحديد المرتب الأساسي</h2>
              <form onSubmit={setBase} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">العضو</label>
                  <select
                    required
                    value={baseForm.userId}
                    onChange={(e) => setBaseForm({ ...baseForm, userId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="">اختر العضو...</option>
                    {data.users.map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.name} ({u.role === "admin" ? "سوبر أدمن" : u.role === "supervisor" ? "مشرف" : "عضو"})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">المرتب الشهري (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={baseForm.baseSalary}
                    onChange={(e) => setBaseForm({ ...baseForm, baseSalary: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "جاري الحفظ..." : "حفظ المرتب"}
                </button>
              </form>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-slate-800">
                تفاصيل الشهر — {month}
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="mr-3 inline-block rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </h2>
              <form onSubmit={addEntry} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">العضو</label>
                  <select
                    required
                    value={entryForm.userId}
                    onChange={(e) => setEntryForm({ ...entryForm, userId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="">اختر العضو...</option>
                    {data.users.map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">حوافز</label>
                    <input
                      type="number"
                      min="0"
                      value={entryForm.bonus}
                      onChange={(e) => setEntryForm({ ...entryForm, bonus: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">خصومات</label>
                    <input
                      type="number"
                      min="0"
                      value={entryForm.deduction}
                      onChange={(e) => setEntryForm({ ...entryForm, deduction: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">تفاصيل الشهر (ملاحظات)</label>
                  <textarea
                    rows={2}
                    value={entryForm.notes}
                    onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="مثال: خصم غياب يومين، حافز إنجاز..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "جاري الحفظ..." : "حفظ تفاصيل الشهر"}
                </button>
              </form>
            </div>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-800">
            {isAdmin ? "تفاصيل المرتبات" : "سجل المرتبات"}
          </h2>
          {data.entries.length === 0 ? (
            <p className="py-8 text-center text-slate-500">لا توجد تفاصيل مرتبات</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-right text-slate-500">
                    {isAdmin && <th className="pb-3 font-medium">العضو</th>}
                    <th className="pb-3 font-medium">الشهر</th>
                    <th className="pb-3 font-medium">الأساسي</th>
                    <th className="pb-3 font-medium">حوافز</th>
                    <th className="pb-3 font-medium">خصومات</th>
                    <th className="pb-3 font-medium">الصافي</th>
                    <th className="pb-3 font-medium">التفاصيل</th>
                    {isAdmin && <th className="pb-3 font-medium">إجراءات</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.entries.map((en) => {
                    const user = data.users.find((u) => u.uid === en.userId);
                    const net = (user?.baseSalary || 0) + en.bonus - en.deduction;
                    return (
                      <tr key={en.id} className="hover:bg-slate-50">
                        {isAdmin && (
                          <td className="py-3 font-medium text-slate-700">{user?.name || "—"}</td>
                        )}
                        <td className="py-3">{en.month}</td>
                        <td className="py-3">{fmtMoney(user?.baseSalary || 0)}</td>
                        <td className="py-3 text-emerald-600">+{fmtMoney(en.bonus)}</td>
                        <td className="py-3 text-red-600">-{fmtMoney(en.deduction)}</td>
                        <td className="py-3 font-bold text-slate-800">{fmtMoney(net)}</td>
                        <td className="py-3 text-slate-500">{en.notes || "—"}</td>
                        {isAdmin && (
                          <td className="py-3">
                            <button
                              onClick={() => deleteEntry(en.id)}
                              className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                            >
                              حذف
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
