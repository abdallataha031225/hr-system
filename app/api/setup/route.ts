import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, db, isAdminReady } from "@/lib/admin";

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !db || !isAdminReady) {
      return NextResponse.json({ error: "المشروع غير مُهيأ بعد" }, { status: 500 });
    }

    const admins = await db
      .collection("users")
      .where("role", "==", "admin")
      .limit(1)
      .get();
    if (!admins.empty) {
      return NextResponse.json({ error: "تم إعداد النظام مسبقاً" }, { status: 403 });
    }

    const { name, email, password } = await req.json();
    if (!name || !email || !password || password.length < 6) {
      return NextResponse.json({ error: "أدخل الاسم والبريد وكلمة مرور 6 أحرف على الأقل" }, { status: 400 });
    }

    const userRecord = await adminAuth.createUser({
      email: String(email).trim(),
      password: String(password),
      displayName: String(name).trim(),
    });

    await adminAuth.setCustomUserClaims(userRecord.uid, { role: "admin" });

    await db.collection("users").doc(userRecord.uid).set({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      role: "admin",
      departmentId: "",
      baseSalary: 0,
      phone: "",
      active: true,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "حدث خطأ";
    return NextResponse.json(
      { error: msg.includes("EMAIL_EXISTS") ? "البريد مسجل بالفعل في Firebase" : msg },
      { status: 400 }
    );
  }
}
