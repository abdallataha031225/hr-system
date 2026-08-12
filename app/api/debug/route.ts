import { NextResponse } from "next/server";
import { isAdminReady } from "@/lib/admin";

export async function GET() {
  return NextResponse.json({
    saEnv: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT),
    saLength: (process.env.FIREBASE_SERVICE_ACCOUNT || "").length,
    apiKeyEnv: Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    isAdminReady,
  });
}
