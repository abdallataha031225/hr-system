"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { api, todayStr, fmtDate } from "@/lib/utils";
import type { SwapWithUsers, UserDoc } from "@/lib/types";

export default function SwapsPage() {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [swaps, setSwaps] = useState<SwapWithUsers[]>([]);
  const [form, setForm] = useState({
    userA: "",
    userB: "",
    permanent: false,
    date: todayStr(),
    note: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const u = await api<{ users: UserDoc[] }>("/api/users");
      setUsers(u.users.filter((x) => x.active));
      const s = await api<{ swaps: SwapWithUsers[] }>("/api/swaps");
      setSwaps(s.swaps);
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createSwap(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.userA || !form.userB) {
      setError("اختر العضوين");
      return;
    }
    if (form.userA === form.userB) {
      setError("اختر عضوين مختلفين");
      return;
    }
    setLoading(true);
    try {
      const res = await api<{ appliedCount: number }>("/api/swaps", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setSuccess(
        res.appliedCount > 0
          ? `تم التبديل بنجاح — تم نقل ${res.appliedCount} شفت`
          : "تم تسجيل التبديل (لا توجد شفتات مطابقة بعد — سيطبق تلقائياً عند الإضافة)"
      );
      setForm({ ...form, note: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-5 text-2xl font-bold text-slate-800">تبديل الشفتات</h1>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-800">تبديل جديد بين عضوين</h2>
          <form onSubmit={createSwap} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">العضو الأول</label>
              <select
                required
                value={form.userA}
                onChange={(e) => setForm({ ...form, userA: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">اختر...</option>
                {users.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">العضو الثاني</label>
              <select
                required
                value={form.userB}
                onChange={(e) => setForm({ ...form, userB: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">اختر...</option>
                {users.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {form.permanent ? "التبديل الدائم يبدأ من" : "تاريخ التبديل"}
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">ملاحظات</label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="flex items-center gap-3 md:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.permanent}
                  onChange={(e) => setForm({ ...form, permanent: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                تبديل دائم (كل الشفتات المستقبلية من التاريخ ده)
              </label>
            </div>
            <div className="flex items-end md:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "جاري التبديل..." : "تنفيذ التبديل"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-800">سجل التبديلات</h2>
          {swaps.length === 0 ? (
            <p className="py-8 text-center text-slate-500">لا توجد تبديلات بعد</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-right text-slate-500">
                    <th className="pb-3 font-medium">التبديل</th>
                    <th className="pb-3 font-medium">النوع</th>
                    <th className="pb-3 font-medium">التاريخ</th>
                    <th className="pb-3 font-medium">الشفتات المنقولة</th>
                    <th className="pb-3 font-medium">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {swaps.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-3">
                        <span className="font-medium text-slate-700">{s.userNameA}</span>
                        <span className="mx-1 text-slate-400">⇄</span>
                        <span className="font-medium text-slate-700">{s.userNameB}</span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            s.permanent ? "bg-purple-100 text-purple-700" : "bg-sky-100 text-sky-700"
                          }`}
                        >
                          {s.permanent ? "دائم" : "مؤقت"}
                        </span>
                      </td>
                      <td className="py-3">{fmtDate(s.date)}</td>
                      <td className="py-3 text-slate-600">{s.appliedCount}</td>
                      <td className="py-3 text-slate-500">{s.note || "—"}</td>
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
