import { NextResponse } from "next/server";
import { createOwnerToken, sessionCookie, verifyPin } from "@/lib/auth";

type Attempt = { count: number; resetAt: number };
const attempts = new Map<string, Attempt>();

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const attempt = attempts.get(ip);
  if (attempt && attempt.resetAt > now && attempt.count >= 5) return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 429 });
  const { pin } = await request.json();
  if (!(await verifyPin(String(pin ?? "")))) {
    attempts.set(ip, { count: attempt && attempt.resetAt > now ? attempt.count + 1 : 1, resetAt: now + 10 * 60_000 });
    return NextResponse.json({ error: "번호가 올바르지 않습니다." }, { status: 401 });
  }
  attempts.delete(ip);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie, await createOwnerToken(), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
  return response;
}

