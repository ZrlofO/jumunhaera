import { NextResponse } from "next/server";
import { isOwnerRequest } from "@/lib/auth";
import { updateTableMemo } from "@/lib/store";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isOwnerRequest())) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const updated = await updateTableMemo(id, String(body.memo ?? ""));
  return updated ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "테이블을 찾을 수 없습니다." }, { status: 404 });
}

