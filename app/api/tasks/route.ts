import { NextResponse } from "next/server";
import { db } from "@/lib/admin";
import { requireRole } from "@/lib/auth";
import { fetchDocsByUserIds, getUsersMap, listUsersByDept } from "@/lib/db";
import type { TaskDoc } from "@/lib/types";

export async function GET(req: Request) {
  const user = await requireRole("member", "supervisor", "admin");
  if (!user || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "";

  let userIds: string[] = [];
  if (user.role === "member") {
    userIds = [user.uid];
  } else if (user.role === "supervisor") {
    userIds = (await listUsersByDept(user.departmentId)).map((u) => u.uid);
  } else {
    const all = await db.collection("users").get();
    userIds = all.docs.map((d) => d.id);
  }

  const snap = await fetchDocsByUserIds("tasks", userIds);
  let tasks = snap.map((d) => ({ id: d.id, ...(d.data() as Omit<TaskDoc, "id">) }));
  if (status) {
    tasks = tasks.filter((t) => t.status === status);
  }
  tasks.sort((a, b) => b.date.localeCompare(a.date));

  const userMap = await getUsersMap(tasks.map((t) => t.userId));
  return NextResponse.json({
    tasks: tasks.map((t) => ({ ...t, userName: userMap.get(t.userId)?.name || "—" })),
  });
}

export async function POST(req: Request) {
  const user = await requireRole("supervisor", "admin");
  if (!user || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { userId, title, description, date } = await req.json();
  if (!userId || !title || !date) {
    return NextResponse.json({ error: "أدخل العضو والعنوان والتاريخ" }, { status: 400 });
  }

  const target = await db.collection("users").doc(String(userId)).get();
  if (!target.exists) return NextResponse.json({ error: "العضو غير موجود" }, { status: 400 });

  if (user.role === "supervisor") {
    const deptIds = (await listUsersByDept(user.departmentId)).map((u) => u.uid);
    if (!deptIds.includes(String(userId))) {
      return NextResponse.json({ error: "العضو ليس من قسمك" }, { status: 403 });
    }
  }

  const doc = await db.collection("tasks").add({
    userId: String(userId),
    title: String(title),
    description: String(description || ""),
    date: String(date),
    status: "pending",
    doneAt: "",
    createdAt: new Date().toISOString(),
    createdBy: user.uid,
  });

  return NextResponse.json({ ok: true, id: doc.id });
}

export async function PATCH(req: Request) {
  const user = await requireRole("member", "supervisor", "admin");
  if (!user || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id, status } = await req.json();
  if (!id || !["pending", "done"].includes(status)) {
    return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  }

  const snap = await db.collection("tasks").doc(String(id)).get();
  if (!snap.exists) return NextResponse.json({ error: "التاسك غير موجود" }, { status: 404 });
  const data = snap.data();

  if (user.role === "member" && data?.userId !== user.uid) {
    return NextResponse.json({ error: "هذا ليس تاسكك" }, { status: 403 });
  }

  await db.collection("tasks").doc(String(id)).update({
    status,
    doneAt: status === "done" ? new Date().toISOString() : "",
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await requireRole("supervisor", "admin");
  if (!user || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "معرف التاسك مفقود" }, { status: 400 });

  const snap = await db.collection("tasks").doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: "التاسك غير موجود" }, { status: 404 });

  if (user.role === "supervisor") {
    const deptIds = (await listUsersByDept(user.departmentId)).map((u) => u.uid);
    if (!deptIds.includes(snap.data()!.userId)) {
      return NextResponse.json({ error: "التاسك ليس لقسمك" }, { status: 403 });
    }
  }

  await db.collection("tasks").doc(id).delete();
  return NextResponse.json({ ok: true });
}
