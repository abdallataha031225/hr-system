import { cookies } from "next/headers";
import { adminAuth, db } from "@/lib/admin";
import type { Role, UserDoc } from "@/lib/types";

export async function getSessionUser(): Promise<UserDoc | null> {
  try {
    if (!adminAuth || !db) return null;
    const store = await cookies();
    const session = store.get("session")?.value;
    if (!session) return null;
    const decoded = await adminAuth.verifySessionCookie(session, true);
    const snap = await db.collection("users").doc(decoded.uid).get();
    if (!snap.exists) return null;
    const data = snap.data();
    if (!data) return null;
    return { uid: decoded.uid, ...(data as Omit<UserDoc, "uid">) } as UserDoc;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<UserDoc | null> {
  const user = await getSessionUser();
  if (!user || user.active === false) return null;
  return user;
}

export async function requireRole(...roles: Role[]): Promise<UserDoc | null> {
  const user = await requireUser();
  if (!user) return null;
  if (roles.length > 0 && !roles.includes(user.role)) return null;
  return user;
}
