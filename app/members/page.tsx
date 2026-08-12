"use client";

import { useCallback, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/utils";
import type { DepartmentDoc, UserDoc } from "@/lib/types";

const ROLE_BADGE: Record<string, string> = {
  member: "bg-sky-100 text-sky-700",
  supervisor: "bg-emerald-100 text-emerald-700",
  admin: "bg-purple-100 text-purple-700",
};

export default function MembersPage() {
  const [me, setMe] = useState<UserDoc | null>(null);
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [departments, setDepartments] = useState<DepartmentDoc[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", role: "member", departmentId: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdmin = me?.role === "admin";

  const load = useCallback(async () => {
    try {
      const meRes = await api<{ user: UserDoc }>("/api/me");
      setMe(meRes.user);
      const u = await api<{ users: UserDoc[] }>("/api/users");
      setUsers(u.users);
      if (meRes.user.role === "admin") {
        const d = await api<{ departments: DepartmentDoc[] }>("/api/departments");
        setDepartments(d.departments);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
      };
      if (isAdmin) {
        body.role = form.role;
        body.departmentId = form.departmentId;
      }
      await api("/api/users", { method: "POST", body: JSON.stringify(body) });
      setSuccess(isAdmin ? "تمت إضافة الحساب" : "تمت إضافة العضو لقسمك");
      setForm({ name: "", email: "", password: "", phone: "", role: "member", departmentId: form.departmentId });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  async function updateUser(id: string, patch: Record<string, unknown>) {
    try {
      await api("/api/users", { method: "PATCH", body: JSON.stringify({ id, ...patch }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    }
  }

  async function deleteUser(id: string) {
    if (!confirm("هل تريد حذف هذا العضو وكل بياناته نهائياً؟")) return;
    try {
      await api(`/api/users?id=${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="mb-5 text-2xl font-bold text-slate-800">
          {isAdmin ? "الأعضاء والحسابات" : "أعضاء قسمي"}
        </h1>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-800">
            {isAdmin ? "إضافة حساب جديد" : "إضافة عضو جديد"}
          </h2>
          <form onSubmit={addMember} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">الاسم بالكامل</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">البريد الإلكتروني</label>
              <input
                type="email"
                required
                dir="ltr"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">كلمة المرور</label>
              <input
                type="password"
                required
                dir="ltr"
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">رقم الهاتف</label>
              <input
                type="text"
                dir="ltr"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            {isAdmin && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">نوع الحساب</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="member">عضو</option>
                    <option value="supervisor">مشرف</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">القسم</label>
                  <select
                    value={form.departmentId}
                    onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="">بدون قسم</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="flex items-end lg:col-span-4">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "جاري الإضافة..." : "إضافة الحساب"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-800">القائمة ({users.length})</h2>
          {users.length === 0 ? (
            <p className="py-8 text-center text-slate-500">لا يوجد أعضاء</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-right text-slate-500">
                    <th className="pb-3 font-medium">الاسم</th>
                    <th className="pb-3 font-medium">البريد</th>
                    <th className="pb-3 font-medium">الدور</th>
                    {isAdmin && <th className="pb-3 font-medium">القسم</th>}
                    <th className="pb-3 font-medium">الحالة</th>
                    <th className="pb-3 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-50">
                      <td className="py-3 font-medium text-slate-700">{u.name}</td>
                      <td className="py-3" dir="ltr">
                        <span className="block text-right">{u.email}</span>
                      </td>
                      <td className="py-3">
                        {isAdmin && u.role !== "admin" ? (
                          <select
                            value={u.role}
                            onChange={(e) => updateUser(u.uid, { role: e.target.value })}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                          >
                            <option value="member">عضو</option>
                            <option value="supervisor">مشرف</option>
                          </select>
                        ) : (
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_BADGE[u.role]}`}>
                            {u.role === "admin" ? "سوبر أدمن" : u.role === "supervisor" ? "مشرف" : "عضو"}
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="py-3">
                          <select
                            value={u.departmentId}
                            onChange={(e) => updateUser(u.uid, { departmentId: e.target.value })}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                          >
                            <option value="">بدون قسم</option>
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                      <td className="py-3">
                        {isAdmin && u.uid !== me?.uid ? (
                          <button
                            onClick={() => updateUser(u.uid, { active: !u.active })}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              u.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {u.active ? "نشط" : "موقوف"}
                          </button>
                        ) : (
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              u.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {u.active ? "نشط" : "موقوف"}
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {isAdmin && u.uid !== me?.uid && (
                          <button
                            onClick={() => deleteUser(u.uid)}
                            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                          >
                            حذف
                          </button>
                        )}
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
