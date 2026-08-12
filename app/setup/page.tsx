import { redirect } from "next/navigation";
import { db, isAdminReady } from "@/lib/admin";
import SetupForm from "./SetupForm";

export default async function SetupPage() {
  if (!isAdminReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-xl font-bold text-slate-800">متغيرات Firebase ناقصة</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            أضف <code className="rounded bg-slate-100 px-1 font-mono">FIREBASE_SERVICE_ACCOUNT</code> ومتغيرات
            <code className="rounded bg-slate-100 px-1 font-mono">NEXT_PUBLIC_FIREBASE_*</code> في ملف{" "}
            <code className="rounded bg-slate-100 px-1 font-mono">.env.local</code> ثم أعد تشغيل السيرفر. راجع
            README للحصول على الخطوات كاملة.
          </p>
        </div>
      </div>
    );
  }

  const admins = await db!
    .collection("users")
    .where("role", "==", "admin")
    .limit(1)
    .get();

  if (!admins.empty) redirect("/login");

  return <SetupForm />;
}
