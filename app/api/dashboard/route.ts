import { NextResponse } from "next/server";
import { db } from "@/lib/admin";
import { requireRole } from "@/lib/auth";
import { fetchDocsByUserIds, getUsersMap, listAllUsers, listUsersByDept } from "@/lib/db";
import type { ShiftDoc, TaskDoc } from "@/lib/types";

export async function GET(req: Request) {
  const user = await requireRole("member", "supervisor", "admin");
  if (!user || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const url = new URL(req.url);
  const today = url.searchParams.get("today") || "";

  let userIds: string[] = [];
  if (user.role === "member") {
    userIds = [user.uid];
  } else if (user.role === "supervisor") {
    userIds = (await listUsersByDept(user.departmentId)).map((u) => u.uid);
  } else {
    userIds = (await listAllUsers()).map((u) => u.uid);
  }

  const [shiftSnaps, taskSnaps, userMap] = await Promise.all([
    fetchDocsByUserIds("shifts", userIds),
    fetchDocsByUserIds("tasks", userIds),
    getUsersMap(userIds),
  ]);

  const allShifts = shiftSnaps.map((d) => ({ id: d.id, ...(d.data() as Omit<ShiftDoc, "id">) }));
  const todayShifts = today ? allShifts.filter((s) => s.date === today) : [];
  const upcomingShifts = today
    ? allShifts
        .filter((s) => s.date >= today && s.date !== today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 10)
    : [];

  const todayTasks = today
    ? taskSnaps
        .map((d) => ({ id: d.id, ...(d.data() as Omit<TaskDoc, "id">) }))
        .filter((t) => t.date === today)
    : [];

  let pendingRequests = 0;
  if (user.role === "member") {
    const snap = await db.collection("shiftRequests").where("userId", "==", user.uid).get();
    pendingRequests = snap.docs.filter((d) => d.data().status === "pending").length;
  } else if (user.role === "supervisor") {
    const deptUsers = await listUsersByDept(user.departmentId);
    const deptIds = deptUsers.map((u) => u.uid);
    if (deptIds.length) {
      const snap = await db.collection("shiftRequests").where("status", "==", "pending").get();
      pendingRequests = snap.docs.filter((d) => deptIds.includes(d.data().userId)).length;
    }
  } else {
    const snap = await db.collection("shiftRequests").where("status", "==", "pending").get();
    pendingRequests = snap.size;
  }

  return NextResponse.json({
    user,
    todayShifts: todayShifts.map((s) => ({ ...s, userName: userMap.get(s.userId)?.name || "—" })),
    upcomingShifts: upcomingShifts.map((s) => ({ ...s, userName: userMap.get(s.userId)?.name || "—" })),
    todayTasks,
    pendingRequests,
  });
}
