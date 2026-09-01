import { NextResponse } from "next/server";
import { isOwnerRequest } from "@/lib/auth";
import { deleteTable } from "@/lib/store";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isOwnerRequest())) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  const { id } = await params;
  const deleted = await deleteTable(id);
  return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "테이블을 찾을 수 없습니다." }, { status: 404 });
}


