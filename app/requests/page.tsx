"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { api, todayStr, fmtDate } from "@/lib/utils";
import type { RequestWithUser, UserDoc } from "@/lib/types";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "موافق عليه",
  rejected: "مرفوض",
};

export default function RequestsPage() {
  const [me, setMe] = useState<UserDoc | null>(null);
  const [requests, setRequests] = useState<RequestWithUser[]>([]);
  const [form, setForm] = useState({ date: todayStr(), reason: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const isManager = me?.role === "supervisor" || me?.role === "admin";

  const load = useCallback(async () => {
    try {
      const meRes = await api<{ user: UserDoc }>("/api/me");
      setMe(meRes.user);
      const r = await api<{ requests: RequestWithUser[] }>("/api/requests");
      setRequests(r.requests);
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createRequest(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.reason) {
      setError("اكتب سبب التغيير");
      return;
    }
    setLoading(true);
    try {
      await api("/api/requests", { method: "POST", body: JSON.stringify(form) });
      setSuccess("تم إرسال الطلب إلى المشرف");
      setForm({ ...form, reason: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function decide(id: string, action: "approve" | "reject") {
    try {
      await api("/api/requests", { method: "PATCH", body: JSON.stringify({ id, action }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    }
  }

  async function deleteRequest(id: string) {
    if (!confirm("هل تريد حذف هذا الطلب؟")) return;
    try {
      await api(`/api/requests?id=${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-5 text-2xl font-bold text-slate-800">
          {isManager ? "طلبات تغيير الشفت" : "طلباتي لتغيير الشفت"}
        </h1>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

        {!isManager && (
          <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-800">طلب تغيير شفت</h2>
            <form onSubmit={createRequest} className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">تاريخ الشفت المطلوب تغييره</label>
                <input
                  type="date"
                  required
                  min={todayStr()}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">سبب التغيير</label>
                <input
                  type="text"
                  required
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="مثال: عندي موعد طبي يوم الشفت"
                />
              </div>
              <div className="flex items-end md:col-span-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "جاري الإرسال..." : "إرسال الطلب"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-800">قائمة الطلبات</h2>
          {requests.length === 0 ? (
            <p className="py-8 text-center text-slate-500">لا توجد طلبات</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {requests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isManager && <span className="font-medium text-slate-700">{r.userName}</span>}
                      <span className="text-sm text-slate-500">{fmtDate(r.date)}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{r.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    {isManager && r.status === "pending" && (
                      <>
                        <button
                          onClick={() => decide(r.id, "approve")}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                        >
                          موافقة
                        </button>
                        <button
                          onClick={() => decide(r.id, "reject")}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                        >
                          رفض
                        </button>
                      </>
                    )}
                    {(me?.role === "member" && r.status === "pending") || isManager ? (
                      <button
                        onClick={() => deleteRequest(r.id)}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                      >
                        حذف
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
