import { NextResponse } from "next/server";
import { db } from "@/lib/admin";
import { requireRole } from "@/lib/auth";
import { listDepartments, listUsersByDept } from "@/lib/db";
import type { UserDoc } from "@/lib/types";

interface PerfRow {
  uid: string;
  name: string;
  departmentId: string;
  departmentName: string;
  totalShifts: number;
  doneShifts: number;
  shiftsRate: number;
  totalTasks: number;
  doneTasks: number;
  tasksRate: number;
}

export async function GET(req: Request) {
  const user = await requireRole("member", "supervisor", "admin");
  if (!user || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const url = new URL(req.url);
  const deptFilter = url.searchParams.get("departmentId") || "";

  let targets: UserDoc[];
  if (user.role === "member") {
    targets = [user];
  } else if (user.role === "supervisor") {
    targets = await listUsersByDept(user.departmentId);
  } else {
    const snap = await db.collection("users").get();
    targets = snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<UserDoc, "uid">) }));
    if (deptFilter) targets = targets.filter((u) => u.departmentId === deptFilter);
  }

  const depts = await listDepartments();
  const deptNames = new Map(depts.map((d) => [d.id, d.name]));

  const rows: PerfRow[] = [];
  for (const t of targets) {
    const [shiftsSnap, tasksSnap] = await Promise.all([
      db.collection("shifts").where("userId", "==", t.uid).get(),
      db.collection("tasks").where("userId", "==", t.uid).get(),
    ]);
    const shifts = shiftsSnap.docs.map((d) => d.data());
    const tasks = tasksSnap.docs.map((d) => d.data());
    const totalShifts = shifts.length;
    const doneShifts = shifts.filter((s) => s.status === "done").length;
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t2) => t2.status === "done").length;
    rows.push({
      uid: t.uid,
      name: t.name,
      departmentId: t.departmentId,
      departmentName: deptNames.get(t.departmentId) || "بدون قسم",
      totalShifts,
      doneShifts,
      shiftsRate: totalShifts ? Math.round((doneShifts / totalShifts) * 100) : 0,
      totalTasks,
      doneTasks,
      tasksRate: totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0,
    });
  }

  rows.sort((a, b) => a.departmentName.localeCompare(b.departmentName, "ar") || a.name.localeCompare(b.name, "ar"));

  return NextResponse.json({ rows, departments: depts });
}
