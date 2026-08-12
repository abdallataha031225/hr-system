import { NextResponse } from "next/server";
import { db } from "@/lib/admin";
import { requireRole } from "@/lib/auth";
import { fetchDocsByUserIds, getUsersMap, listUsersByDept } from "@/lib/db";
import type { ShiftDoc, SwapDoc } from "@/lib/types";

export async function GET() {
  const user = await requireRole("supervisor", "admin");
  if (!user || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  let query: FirebaseFirestore.Query = db.collection("swaps");
  if (user.role === "supervisor") {
    const deptUsers = await listUsersByDept(user.departmentId);
    const deptIds = deptUsers.map((u) => u.uid);
    if (!deptIds.length) return NextResponse.json({ swaps: [] });
    query = query.where("userA", "in", deptIds.slice(0, 10));
  }

  const snap = await query.get();
  const swaps = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<SwapDoc, "id">) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const ids = Array.from(new Set(swaps.flatMap((s) => [s.userA, s.userB])));
  const userMap = await getUsersMap(ids);

  return NextResponse.json({
    swaps: swaps.map((s) => ({
      ...s,
      userNameA: userMap.get(s.userA)?.name || "—",
      userNameB: userMap.get(s.userB)?.name || "—",
    })),
  });
}

export async function POST(req: Request) {
  const user = await requireRole("supervisor", "admin");
  if (!user || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { userA, userB, permanent, date, note } = await req.json();
  if (!userA || !userB || userA === userB) {
    return NextResponse.json({ error: "اختر عضوين مختلفين" }, { status: 400 });
  }
  if (!date) {
    return NextResponse.json(
      { error: permanent ? "أدخل تاريخ بداية التبديل" : "أدخل تاريخ التبديل" },
      { status: 400 }
    );
  }

  const aSnap = await db.collection("users").doc(String(userA)).get();
  const bSnap = await db.collection("users").doc(String(userB)).get();
  if (!aSnap.exists || !bSnap.exists) {
    return NextResponse.json({ error: "أحد الأعضاء غير موجود" }, { status: 400 });
  }

  if (user.role === "supervisor") {
    const deptIds = (await listUsersByDept(user.departmentId)).map((u) => u.uid);
    if (!deptIds.includes(String(userA)) || !deptIds.includes(String(userB))) {
      return NextResponse.json({ error: "كلا العضوين يجب أن يكونا من قسمك" }, { status: 403 });
    }
  }

  const isPermanent = permanent === true;
  const targetDate = String(date);

  const swapRef = await db.collection("swaps").add({
    userA: String(userA),
    userB: String(userB),
    date: targetDate,
    permanent: isPermanent,
    note: String(note || ""),
    appliedCount: 0,
    createdBy: user.uid,
    createdAt: new Date().toISOString(),
  });

  const shiftsSnap = await fetchDocsByUserIds("shifts", [String(userA), String(userB)]);
  let matchedShifts = shiftsSnap.map((d) => ({ id: d.id, ...(d.data() as Omit<ShiftDoc, "id">) }));
  if (isPermanent) {
    matchedShifts = matchedShifts.filter((s) => s.date >= targetDate);
  } else {
    matchedShifts = matchedShifts.filter((s) => s.date === targetDate);
  }

  let applied = 0;
  const updates: Promise<unknown>[] = [];

  matchedShifts.forEach((shift) => {
    const newOwner = shift.userId === String(userA) ? String(userB) : String(userA);
    updates.push(
      db!.collection("shifts").doc(shift.id).update({ userId: newOwner, swapId: swapRef.id })
    );
    applied++;
  });

  await Promise.all(updates);
  await swapRef.update({ appliedCount: applied });

  return NextResponse.json({ ok: true, id: swapRef.id, appliedCount: applied });
}
