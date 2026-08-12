"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { api, todayStr, fmtTime, fmtDate } from "@/lib/utils";
import type { ShiftWithUser, TaskDoc, UserDoc } from "@/lib/types";

interface DashData {
  user: UserDoc;
  todayShifts: ShiftWithUser[];
  upcomingShifts: ShiftWithUser[];
  todayTasks: TaskDoc[];
  pendingRequests: number;
}

const ROLE_LABEL: Record<string, string> = {
  member: "عضو",
  supervisor: "مشرف",
  admin: "سوبر أدمن",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [error, setError] = useState("");
  const [confirmingId, setConfirmingId] = useState("");
  const today = todayStr();

  const load = useCallback(async () => {
    try {
      const d = await api<DashData>(`/api/dashboard?today=${today}`);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    }
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmShift(id: string) {
    setConfirmingId(id);
    try {
      await api("/api/shifts", { method: "PATCH", body: JSON.stringify({ id, date: today }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setConfirmingId("");
    }
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-xl bg-red-50 p-4 text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              أهلاً، {data?.user.name || "..."}
            </h1>
            <p className="text-sm text-slate-500">
              {ROLE_LABEL[data?.user.role || "member"]} · اليوم {fmtDate(today)}
            </p>
          </div>
          {data?.pendingRequests ? (
            <Link
              href="/requests"
              className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200"
            >
              {data.user.role === "member"
                ? `لديك ${data.pendingRequests} طلب قيد المراجعة`
                : `${data.pendingRequests} طلب تغيير شفت معلق`}
            </Link>
          ) : null}
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {/* شفتات اليوم */}
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-bold text-slate-800">شفتات اليوم</h2>
          {data && data.todayShifts.length === 0 && (
            <p className="rounded-xl bg-white p-6 text-center text-slate-500 shadow-sm">
              لا توجد شفتات لليوم
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data?.todayShifts.map((s) => (
              <div
                key={s.id}
                className={`rounded-xl border p-5 shadow-sm ${
                  s.status === "done" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-lg font-bold text-slate-800">
                    {fmtTime(s.startTime)} — {fmtTime(s.endTime)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      s.status === "done" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {s.status === "done" ? "مؤكد" : "قيد التنفيذ"}
                  </span>
                </div>
                {data.user.role !== "member" && (
                  <p className="mb-1 text-sm font-medium text-slate-600">{s.userName}</p>
                )}
                {s.notes && <p className="mb-3 text-sm text-slate-500">{s.notes}</p>}
                {s.status === "pending" && (
                  <button
                    onClick={() => confirmShift(s.id)}
                    disabled={confirmingId === s.id}
                    className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {confirmingId === s.id ? "جاري التأكيد..." : "أكد انتهاء الشفت"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* الشفتات القادمة */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-bold text-slate-800">الشفتات القادمة</h2>
            {data?.upcomingShifts.length === 0 ? (
              <p className="text-sm text-slate-500">لا توجد شفتات قادمة</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data?.upcomingShifts.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <span className="font-medium text-slate-700">{fmtDate(s.date)}</span>
                      <span className="mr-2 text-sm text-slate-500">
                        {fmtTime(s.startTime)} — {fmtTime(s.endTime)}
                      </span>
                    </div>
                    {data.user.role !== "member" && (
                      <span className="text-sm text-slate-600">{s.userName}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* تاسكات اليوم */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-bold text-slate-800">تاسكات اليوم</h2>
            {data?.todayTasks.length === 0 ? (
              <p className="text-sm text-slate-500">لا توجد تاسكات لليوم</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data?.todayTasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <span className="font-medium text-slate-700">{t.title}</span>
                      {t.description && (
                        <p className="text-sm text-slate-500">{t.description}</p>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        t.status === "done" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {t.status === "done" ? "تم" : "معلق"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
