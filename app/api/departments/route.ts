import { NextResponse } from "next/server";
import { db } from "@/lib/admin";
import { requireRole } from "@/lib/auth";
import { listAllUsers } from "@/lib/db";
import type { DepartmentDoc } from "@/lib/types";

export async function GET() {
  const user = await requireRole("admin");
  if (!user || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const deptSnap = await db.collection("departments").orderBy("createdAt", "asc").get();
  const departments = deptSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DepartmentDoc, "id">) }));

  const allUsers = await listAllUsers();
  const userMap = new Map(allUsers.map((u) => [u.uid, u]));
  const supervisors = allUsers.filter((u) => u.role === "supervisor");

  return NextResponse.json({
    departments: departments.map((d) => ({
      ...d,
      supervisorName: d.supervisorId ? userMap.get(d.supervisorId)?.name || "—" : "—",
      memberCount: allUsers.filter((u) => u.departmentId === d.id).length,
    })),
    supervisors,
  });
}

export async function POST(req: Request) {
  const user = await requireRole("admin");
  if (!user || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { name } = await req.json();
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "أدخل اسم القسم" }, { status: 400 });
  }

  const doc = await db.collection("departments").add({
    name: String(name).trim(),
    supervisorId: "",
    createdAt: new Date().toISOString(),
    createdBy: user.uid,
  });

  return NextResponse.json({ ok: true, id: doc.id });
}

export async function PATCH(req: Request) {
  const user = await requireRole("admin");
  if (!user || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id, name, supervisorId } = await req.json();
  if (!id) return NextResponse.json({ error: "معرف القسم مفقود" }, { status: 400 });

  const snap = await db.collection("departments").doc(String(id)).get();
  if (!snap.exists) return NextResponse.json({ error: "القسم غير موجود" }, { status: 404 });

  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = String(name).trim();
  if (supervisorId !== undefined) update.supervisorId = String(supervisorId);

  await db.collection("departments").doc(String(id)).update(update);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await requireRole("admin");
  if (!user || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "معرف القسم مفقود" }, { status: 400 });

  const members = await db.collection("users").where("departmentId", "==", id).limit(1).get();
  if (!members.empty) {
    return NextResponse.json({ error: "لا يمكن حذف قسم به أعضاء — انقل الأعضاء أولاً" }, { status: 400 });
  }

  await db.collection("departments").doc(id).delete();
  return NextResponse.json({ ok: true });
}
