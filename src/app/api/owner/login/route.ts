import { NextResponse } from "next/server";
import { createOwnerToken, sessionCookie, verifyPin } from "@/lib/auth";

export async function POST(request: Request) {
  const { pin } = await request.json();
  if (!(await verifyPin(String(pin ?? "")))) {
    return NextResponse.json({ error: "번호가 올바르지 않습니다." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie, await createOwnerToken(), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
  return response;
}

