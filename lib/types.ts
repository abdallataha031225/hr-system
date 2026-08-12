export type Role = "member" | "supervisor" | "admin";

export interface UserDoc {
  uid: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string;
  baseSalary: number;
  phone: string;
  active: boolean;
  createdAt: string;
}

export interface DepartmentDoc {
  id: string;
  name: string;
  supervisorId: string;
  createdAt: string;
}

export interface ShiftDoc {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  notes: string;
  status: "pending" | "done";
  confirmedAt: string;
  swapId: string;
}

export interface TaskDoc {
  id: string;
  userId: string;
  title: string;
  description: string;
  date: string;
  status: "pending" | "done";
  doneAt: string;
  createdAt: string;
}

export interface ShiftRequestDoc {
  id: string;
  userId: string;
  date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  decidedBy: string;
  decidedAt: string;
  createdAt: string;
}

export interface SwapDoc {
  id: string;
  userA: string;
  userB: string;
  date: string; // for temporary: the date; for permanent: from-date
  permanent: boolean;
  note: string;
  appliedCount: number;
  createdAt: string;
}

export interface SalaryEntryDoc {
  id: string;
  userId: string;
  month: string; // YYYY-MM
  bonus: number;
  deduction: number;
  notes: string;
  createdAt: string;
}

export interface ShiftWithUser extends ShiftDoc {
  userName: string;
}

export interface TaskWithUser extends TaskDoc {
  userName: string;
}

export interface RequestWithUser extends ShiftRequestDoc {
  userName: string;
}

export interface SwapWithUsers extends SwapDoc {
  userNameA: string;
  userNameB: string;
}

export interface SalaryEntryWithUser extends SalaryEntryDoc {
  userName: string;
}
