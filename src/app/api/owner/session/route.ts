import { NextResponse } from "next/server";
import { isOwnerRequest, sessionCookie } from "@/lib/auth";

export async function GET() { return NextResponse.json({ authenticated: await isOwnerRequest() }); }
export async function DELETE() { const response = NextResponse.json({ ok: true }); response.cookies.set(sessionCookie, "", { path: "/", maxAge: 0 }); return response; }

