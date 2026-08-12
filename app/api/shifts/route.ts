import { NextResponse } from "next/server";
import { db } from "@/lib/admin";
import { requireRole } from "@/lib/auth";
import { fetchDocsByUserIds, getUsersMap, listUsersByDept } from "@/lib/db";
import type { ShiftDoc, SwapDoc } from "@/lib/types";

async function getShiftDoc(id: string) {
  const snap = await db!.collection("shifts").doc(id).get();
  if (!snap.exists) return null;
  return { id, ...(snap.data() as Omit<ShiftDoc, "id">) };
}

async function findActivePermanentSwap(userId: string, date: string): Promise<SwapDoc | null> {
  if (!db) return null;
  const [aSnap, bSnap] = await Promise.all([
    db.collection("swaps").where("userA", "==", userId).get(),
    db.collection("swaps").where("userB", "==", userId).get(),
  ]);
  const swaps = [
    ...aSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SwapDoc, "id">) })),
    ...bSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SwapDoc, "id">) })),
  ];
  const active = swaps.filter((s) => s.permanent && s.date <= date);
  if (!active.length) return null;
  active.sort((x, y) => x.date.localeCompare(y.date));
  return active[active.length - 1];
}

function swapPartner(swap: SwapDoc, userId: string): string {
  return swap.userA === userId ? swap.userB : swap.userA;
}

export async function GET(req: Request) {
  const user = await requireRole("member", "supervisor", "admin");
  if (!user || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const url = new URL(req.url);
  const date = url.searchParams.get("date") || "";
  const month = url.searchParams.get("month") || "";

  let userIds: string[] = [];
  if (user.role === "member") {
    userIds = [user.uid];
  } else if (user.role === "supervisor") {
    userIds = (await listUsersByDept(user.departmentId)).map((u) => u.uid);
  } else {
    const all = await db.collection("users").get();
    userIds = all.docs.map((d) => d.id);
  }

  const snap = await fetchDocsByUserIds("shifts", userIds);
  let shifts = snap.map((d) => ({ id: d.id, ...(d.data() as Omit<ShiftDoc, "id">) }));

  if (date) {
    shifts = shifts.filter((s) => s.date === date);
  }
  if (month) {
    shifts = shifts.filter((s) => s.date.startsWith(month));
  }
  shifts.sort((a, b) => b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime));

  const userMap = await getUsersMap(shifts.map((s) => s.userId));
  return NextResponse.json({
    shifts: shifts.map((s) => ({ ...s, userName: userMap.get(s.userId)?.name || "—" })),
  });
}

export async function POST(req: Request) {
  const user = await requireRole("supervisor", "admin");
  if (!user || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { userId, date, startTime, endTime, notes } = await req.json();
  if (!userId || !date || !startTime || !endTime) {
    return NextResponse.json({ error: "أدخل العضو والتاريخ ووقت البدء والانتهاء" }, { status: 400 });
  }

  const target = await db.collection("users").doc(String(userId)).get();
  if (!target.exists) return NextResponse.json({ error: "العضو غير موجود" }, { status: 400 });
  const targetData = target.data();
  if (targetData?.active === false) return NextResponse.json({ error: "العضو غير مفعل" }, { status: 400 });

  if (user.role === "supervisor") {
    const deptIds = (await listUsersByDept(user.departmentId)).map((u) => u.uid);
    if (!deptIds.includes(String(userId))) {
      return NextResponse.json({ error: "العضو ليس من قسمك" }, { status: 403 });
    }
  }

  let finalUserId = String(userId);
  let swapId = "";
  const swap = await findActivePermanentSwap(String(userId), String(date));
  if (swap) {
    finalUserId = swapPartner(swap, String(userId));
    swapId = swap.id;
  }

  const doc = await db.collection("shifts").add({
    userId: finalUserId,
    date: String(date),
    startTime: String(startTime),
    endTime: String(endTime),
    notes: String(notes || ""),
    status: "pending",
    confirmedAt: "",
    swapId,
    createdBy: user.uid,
  });

  return NextResponse.json({ ok: true, id: doc.id });
}

export async function PATCH(req: Request) {
  const user = await requireRole("member", "supervisor", "admin");
  if (!user || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id, date } = await req.json();
  if (!id) return NextResponse.json({ error: "معرف الشفت مفقود" }, { status: 400 });

  const shift = await getShiftDoc(String(id));
  if (!shift) return NextResponse.json({ error: "الشفت غير موجود" }, { status: 404 });

  if (shift.status === "done") return NextResponse.json({ error: "الشفت مؤكد من قبل" }, { status: 400 });

  if (user.role === "member") {
    if (shift.userId !== user.uid) {
      return NextResponse.json({ error: "هذا ليس شفتك" }, { status: 403 });
    }
    if (!date || shift.date !== String(date)) {
      return NextResponse.json({ error: "يمكنك تأكيد شفت اليوم فقط" }, { status: 400 });
    }
  }

  await db.collection("shifts").doc(String(id)).update({
    status: "done",
    confirmedAt: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await requireRole("supervisor", "admin");
  if (!user || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "معرف الشفت مفقود" }, { status: 400 });

  const shift = await getShiftDoc(id);
  if (!shift) return NextResponse.json({ error: "الشفت غير موجود" }, { status: 404 });

  if (user.role === "supervisor") {
    const deptIds = (await listUsersByDept(user.departmentId)).map((u) => u.uid);
    if (!deptIds.includes(shift.userId)) {
      return NextResponse.json({ error: "الشفت ليس لقسمك" }, { status: 403 });
    }
  }

  await db.collection("shifts").doc(id).delete();
  return NextResponse.json({ ok: true });
}
