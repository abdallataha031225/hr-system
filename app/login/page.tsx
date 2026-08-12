"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, firebaseReady } from "@/lib/firebase";
import { api } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!auth || !firebaseReady) {
      setError("متغيرات Firebase غير مضبوطة — راجع دليل الإعداد");
      return;
    }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await cred.user.getIdToken();
      await api("/api/login", { method: "POST", body: JSON.stringify({ idToken }) });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message.replace("Firebase: Error (auth/", "").replace(").", "") : "بيانات الدخول غير صحيحة");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-700 via-indigo-600 to-sky-500 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-3xl font-bold text-white">
            ش
          </div>
          <h1 className="text-2xl font-bold text-slate-800">نظام إدارة الشركة</h1>
          <p className="mt-1 text-sm text-slate-500">الشفتات · التاسكات · المرتبات</p>
        </div>

        {!firebaseReady && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            متغيرات Firebase غير مضبوطة في ملف <code className="font-mono">.env.local</code> — اتبع دليل الإعداد في README
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">البريد الإلكتروني</label>
            <input
              type="email"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="name@company.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">كلمة المرور</label>
            <input
              type="password"
              required
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-400">
          أول مرة تستخدم النظام؟{" "}
          <a href="/setup" className="font-medium text-indigo-600 hover:underline">
            أنشئ حساب السوبر أدمن
          </a>
        </p>
      </div>
    </div>
  );
}
