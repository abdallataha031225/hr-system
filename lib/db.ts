import { db } from "@/lib/admin";
import type { UserDoc, DepartmentDoc } from "@/lib/types";

export function docToUser(doc: FirebaseFirestore.QueryDocumentSnapshot): UserDoc {
  const d = doc.data();
  return { uid: doc.id, ...(d as Omit<UserDoc, "uid">) } as UserDoc;
}

export function docToDepartment(doc: FirebaseFirestore.QueryDocumentSnapshot): DepartmentDoc {
  const d = doc.data();
  return { id: doc.id, ...(d as Omit<DepartmentDoc, "id">) } as DepartmentDoc;
}

export async function getUsersMap(ids: string[]): Promise<Map<string, UserDoc>> {
  const map = new Map<string, UserDoc>();
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length || !db) return map;
  const snap = await db.collection("users").where("__name__", "in", unique).get();
  snap.forEach((doc) => map.set(doc.id, docToUser(doc)));
  return map;
}

export async function listUsersByDept(deptId: string): Promise<UserDoc[]> {
  if (!db) return [];
  if (!deptId) return [];
  const snap = await db.collection("users").where("departmentId", "==", deptId).get();
  return snap.docs.map(docToUser);
}

export async function listAllUsers(): Promise<UserDoc[]> {
  if (!db) return [];
  const snap = await db.collection("users").get();
  return snap.docs.map(docToUser);
}

export async function listDepartments(): Promise<DepartmentDoc[]> {
  if (!db) return [];
  const snap = await db.collection("departments").orderBy("createdAt", "asc").get();
  return snap.docs.map(docToDepartment);
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * يجلب مستندات مجموعة حسب قائمة معرفات (مع تقسيم تلقائي لشرط in المحدود بـ10)
 * ويستخدم فهارس أحادية فقط حتى لا نحتاج فهارس مركبة في Firebase.
 */
export async function fetchDocsByUserIds(
  collection: string,
  ids: string[],
  field = "userId"
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  if (!db) return [];
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return [];
  const chunks = chunkArray(unique, 10);
  const results = await Promise.all(
    chunks.map((c) =>
      c.length === 1
        ? db!.collection(collection).where(field, "==", c[0]).get()
        : db!.collection(collection).where(field, "in", c).get()
    )
  );
  return results.flatMap((s) => s.docs);
}
