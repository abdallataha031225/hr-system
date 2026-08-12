import { NextResponse } from "next/server";
import { db } from "@/lib/admin";
import { requireRole } from "@/lib/auth";
import { fetchDocsByUserIds, listAllUsers } from "@/lib/db";
import type { SalaryEntryDoc, UserDoc } from "@/lib/types";

export async function GET(req: Request) {
  const user = await requireRole("member", "supervisor", "admin");
  if (!user || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const url = new URL(req.url);
  const month = url.searchParams.get("month") || "";

  let targets: UserDoc[] = [];
  if (user.role === "admin") {
    const deptFilter = url.searchParams.get("departmentId") || "";
    const all = await listAllUsers();
    targets = deptFilter ? all.filter((u) => u.departmentId === deptFilter) : all;
  } else {
    targets = [user];
  }

  const ids = targets.map((t) => t.uid);
  if (!ids.length) return NextResponse.json({ users: [], entries: [] });

  const snap = await fetchDocsByUserIds("salaryEntries", ids);
  let entries = snap.map((d) => ({ id: d.id, ...(d.data() as Omit<SalaryEntryDoc, "id">) }));
  if (month) {
    entries = entries.filter((e) => e.month === month);
  }
  entries.sort((a, b) => b.month.localeCompare(a.month));

  return NextResponse.json({ users: targets, entries });
}

export async function POST(req: Request) {
  const admin = await requireRole("admin");
  if (!admin || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await req.json();

  if (body.type === "base") {
    const { userId, baseSalary } = body;
    if (!userId || baseSalary === undefined || baseSalary === null || baseSalary < 0) {
      return NextResponse.json({ error: "أدخل العضو والمرتب الأساسي" }, { status: 400 });
    }
    await db.collection("users").doc(String(userId)).update({ baseSalary: Number(baseSalary) });
    return NextResponse.json({ ok: true });
  }

  if (body.type === "entry") {
    const { userId, month, bonus, deduction, notes } = body;
    if (!userId || !month || !/^\d{4}-\d{2}$/.test(String(month))) {
      return NextResponse.json({ error: "أدخل العضو والشهر (صيغة YYYY-MM)" }, { status: 400 });
    }
    const existingSnap = await db
      .collection("salaryEntries")
      .where("userId", "==", String(userId))
      .get();
    const existing = existingSnap.docs.find((d) => d.data().month === String(month));
    if (existing) {
      return NextResponse.json({ error: "يوجد إدخال مرتب لهذا الشهر بالفعل — احذفه أولاً أو عدّله" }, { status: 400 });
    }
    const doc = await db.collection("salaryEntries").add({
      userId: String(userId),
      month: String(month),
      bonus: Number(bonus || 0),
      deduction: Number(deduction || 0),
      notes: String(notes || ""),
      createdAt: new Date().toISOString(),
      createdBy: admin.uid,
    });
    return NextResponse.json({ ok: true, id: doc.id });
  }

  return NextResponse.json({ error: "نوع العملية غير معروف" }, { status: 400 });
}

export async function DELETE(req: Request) {
  const admin = await requireRole("admin");
  if (!admin || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "معرف الإدخال مفقود" }, { status: 400 });

  await db.collection("salaryEntries").doc(id).delete();
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const admin = await requireRole("admin");
  if (!admin || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id, bonus, deduction, notes } = await req.json();
  if (!id) return NextResponse.json({ error: "معرف الإدخال مفقود" }, { status: 400 });

  const snap = await db.collection("salaryEntries").doc(String(id)).get();
  if (!snap.exists) return NextResponse.json({ error: "الإدخال غير موجود" }, { status: 404 });

  const update: Record<string, unknown> = { notes: String(notes || "") };
  if (bonus !== undefined) update.bonus = Number(bonus);
  if (deduction !== undefined) update.deduction = Number(deduction);

  await db.collection("salaryEntries").doc(String(id)).update(update);
  return NextResponse.json({ ok: true });
}
