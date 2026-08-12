import { NextResponse } from "next/server";
import { adminAuth, db } from "@/lib/admin";
import { requireRole } from "@/lib/auth";
import { listUsersByDept } from "@/lib/db";
import type { UserDoc } from "@/lib/types";

function toUser(doc: FirebaseFirestore.QueryDocumentSnapshot): UserDoc {
  return { uid: doc.id, ...(doc.data() as Omit<UserDoc, "uid">) };
}

export async function GET() {
  const user = await requireRole("supervisor", "admin");
  if (!user || !db) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  let users: UserDoc[];
  if (user.role === "supervisor") {
    users = await listUsersByDept(user.departmentId);
  } else {
    const snap = await db.collection("users").get();
    users = snap.docs.map(toUser);
  }

  users.sort((a, b) => a.name.localeCompare(b.name, "ar"));
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const user = await requireRole("supervisor", "admin");
  if (!user || !db || !adminAuth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { name, email, password, phone, departmentId, role } = await req.json();
  if (!name || !email || !password || password.length < 6) {
    return NextResponse.json({ error: "أدخل الاسم والبريد وكلمة مرور 6 أحرف على الأقل" }, { status: 400 });
  }

  let targetDept = String(departmentId || "");
  let targetRole = "member";
  if (user.role === "admin") {
    targetRole = role === "supervisor" ? "supervisor" : "member";
  } else {
    targetDept = user.departmentId;
    if (!targetDept) {
      return NextResponse.json({ error: "أنت لست مسنداً لقسم — تواصل مع السوبر أدمن" }, { status: 403 });
    }
  }

  if (targetDept) {
    const deptSnap = await db.collection("departments").doc(targetDept).get();
    if (!deptSnap.exists) {
      return NextResponse.json({ error: "القسم غير موجود" }, { status: 400 });
    }
  }

  try {
    const userRecord = await adminAuth.createUser({
      email: String(email).trim(),
      password: String(password),
      displayName: String(name).trim(),
    });
    await adminAuth.setCustomUserClaims(userRecord.uid, { role: targetRole });

    await db.collection("users").doc(userRecord.uid).set({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      role: targetRole,
      departmentId: targetDept,
      baseSalary: 0,
      phone: String(phone || ""),
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: user.uid,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "حدث خطأ";
    return NextResponse.json(
      { error: msg.includes("EMAIL_EXISTS") ? "البريد مسجل بالفعل" : msg },
      { status: 400 }
    );
  }
}

export async function PATCH(req: Request) {
  const admin = await requireRole("admin");
  if (!admin || !db || !adminAuth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id, name, phone, departmentId, role, active } = await req.json();
  if (!id) return NextResponse.json({ error: "معرف المستخدم مفقود" }, { status: 400 });

  if (String(id) === admin.uid && (role || active === false)) {
    return NextResponse.json({ error: "لا يمكنك تغيير دورك أو تعطيل حسابك" }, { status: 403 });
  }

  const snap = await db.collection("users").doc(String(id)).get();
  if (!snap.exists) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  const current = snap.data() as Omit<UserDoc, "uid">;

  if (role && role !== current.role) {
    if (current.role === "admin") {
      const admins = await db.collection("users").where("role", "==", "admin").get();
      if (admins.size <= 1) {
        return NextResponse.json({ error: "لا يمكن إزالة السوبر أدمن الوحيد" }, { status: 403 });
      }
    }
    await adminAuth.setCustomUserClaims(String(id), { role });
  }

  if (departmentId) {
    const deptSnap = await db.collection("departments").doc(String(departmentId)).get();
    if (!deptSnap.exists) {
      return NextResponse.json({ error: "القسم غير موجود" }, { status: 400 });
    }
  }

  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = String(name).trim();
  if (phone !== undefined) update.phone = String(phone);
  if (departmentId !== undefined) update.departmentId = String(departmentId);
  if (role !== undefined) update.role = role;
  if (active !== undefined) update.active = active === true;

  await db.collection("users").doc(String(id)).update(update);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const admin = await requireRole("admin");
  if (!admin || !db || !adminAuth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "معرف المستخدم مفقود" }, { status: 400 });

  if (String(id) === admin.uid) {
    return NextResponse.json({ error: "لا يمكنك حذف حسابك" }, { status: 403 });
  }

  const snap = await db.collection("users").doc(id).get();
  if (!snap.exists) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  const data = snap.data();

  if (data?.role === "admin") {
    const admins = await db.collection("users").where("role", "==", "admin").get();
    if (admins.size <= 1) {
      return NextResponse.json({ error: "لا يمكن حذف السوبر أدمن الوحيد" }, { status: 403 });
    }
  }

  const deletes: Promise<unknown>[] = [
    db.collection("shifts").where("userId", "==", id).get().then((s) => Promise.all(s.docs.map((d) => d.ref.delete()))),
    db.collection("tasks").where("userId", "==", id).get().then((s) => Promise.all(s.docs.map((d) => d.ref.delete()))),
    db.collection("shiftRequests").where("userId", "==", id).get().then((s) => Promise.all(s.docs.map((d) => d.ref.delete()))),
    db.collection("salaryEntries").where("userId", "==", id).get().then((s) => Promise.all(s.docs.map((d) => d.ref.delete()))),
  ];

  if (data?.departmentId) {
    const deptSnap = await db.collection("departments").where("supervisorId", "==", id).get();
    deptSnap.forEach((d) => {
      deletes.push(db!.collection("departments").doc(d.id).update({ supervisorId: "" }));
    });
  }

  await Promise.all(deletes);
  await db.collection("users").doc(id).delete();
  await adminAuth.deleteUser(String(id)).catch(() => {});

  return NextResponse.json({ ok: true });
}
