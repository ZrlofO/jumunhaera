import { NextResponse } from "next/server";
import { isOwnerRequest } from "@/lib/auth";
import { closeBusiness } from "@/lib/store";

export async function POST() {
  if (!(await isOwnerRequest())) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  const closure = await closeBusiness();
  return NextResponse.json({ closure });
}

