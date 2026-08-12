import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, db, isAdminReady } from "@/lib/admin";

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !db || !isAdminReady) {
      return NextResponse.json({ error: "المشروع غير مُهيأ بعد — أضف متغيرات Firebase" }, { status: 500 });
    }
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ error: "رمز الدخول غير موجود" }, { status: 400 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);

    const snap = await db.collection("users").doc(decoded.uid).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "الحساب غير مسجل في النظام" }, { status: 403 });
    }
    const data = snap.data();
    if (!data || data.active === false) {
      return NextResponse.json({ error: "الحساب موقوف — تواصل مع الإدارة" }, { status: 403 });
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: 60 * 60 * 24 * 7 * 1000,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set("session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
  }
}
