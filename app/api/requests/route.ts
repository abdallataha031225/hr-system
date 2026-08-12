import { NextResponse } from "next/server";
import { db } from "@/lib/admin";
import { requireRole } from "@/lib/auth";
import { fetchDocsByUserIds, getUsersMap, listUsersByDept } from "@/lib/db";
import type { ShiftRequestDoc } from "@/lib/types";

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
  }

  const snap = await fetchDocsByUserIds("shiftRequests", userIds);
  let requests = snap.map((d) => ({ id: d.id, ...(d.data() as Omit<ShiftRequestDoc, "id">) }));
  if (status) {
    requests = requests.filter((r) => r.status === status);
  }
  requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const userMap = await getUsersMap(requests.map((r) => r.userId));
  return NextResponse.json({
    requests: requests.map((r) => ({ ...r, userName: userMap.get(r.userId)?.name || "—" })),
  });
}

export async function POST(req: Request) {
  const user = await requireRole("member");
  if (!user || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { date, reason } = await req.json();
  if (!date || !reason) {
    return NextResponse.json({ error: "أدخل التاريخ وسبب التغيير" }, { status: 400 });
  }

  const doc = await db.collection("shiftRequests").add({
    userId: user.uid,
    date: String(date),
    reason: String(reason),
    status: "pending",
    decidedBy: "",
    decidedAt: "",
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, id: doc.id });
}

export async function PATCH(req: Request) {
  const user = await requireRole("supervisor", "admin");
  if (!user || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id, action } = await req.json();
  if (!id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });
  }

  const snap = await db.collection("shiftRequests").doc(String(id)).get();
  if (!snap.exists) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  const data = snap.data();

  if (user.role === "supervisor") {
    const deptIds = (await listUsersByDept(user.departmentId)).map((u) => u.uid);
    if (!deptIds.includes(data!.userId)) {
      return NextResponse.json({ error: "الطلب ليس لقسمك" }, { status: 403 });
    }
  }

  await db.collection("shiftRequests").doc(String(id)).update({
    status: action === "approve" ? "approved" : "rejected",
    decidedBy: user.uid,
    decidedAt: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await requireRole("member", "supervisor", "admin");
  if (!user || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "معرف الطلب مفقود" }, { status: 400 });

  const snap = await db.collection("shiftRequests").doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  const data = snap.data();

  if (user.role === "member" && data?.userId !== user.uid) {
    return NextResponse.json({ error: "هذا ليس طلبك" }, { status: 403 });
  }
  if (user.role === "supervisor" && data?.status !== "pending") {
    const deptIds = (await listUsersByDept(user.departmentId)).map((u) => u.uid);
    if (!deptIds.includes(data!.userId)) {
      return NextResponse.json({ error: "الطلب ليس لقسمك" }, { status: 403 });
    }
  }

  await db.collection("shiftRequests").doc(id).delete();
  return NextResponse.json({ ok: true });
}
