export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function monthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function fmtDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function fmtTime(timeStr: string): string {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":");
  const hour = Number(h);
  if (Number.isNaN(hour)) return timeStr;
  return new Date(2000, 0, 1, hour, Number(m || 0)).toLocaleTimeString("ar-EG", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fmtMoney(n: number): string {
  return `${Number(n || 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج.م`;
}

export function roleLabel(role: string): string {
  if (role === "admin") return "سوبر أدمن";
  if (role === "supervisor") return "مشرف";
  return "عضو";
}

export async function api<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || "حدث خطأ غير متوقع");
  }
  return data as T;
}
