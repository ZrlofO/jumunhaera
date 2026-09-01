import { NextResponse } from "next/server";
import { isOwnerRequest } from "@/lib/auth";
import { deleteBusinessClosing } from "@/lib/store";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isOwnerRequest())) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  const { id } = await context.params;
  const deleted = await deleteBusinessClosing(id);
  if (!deleted) return NextResponse.json({ error: "마감 기록을 찾지 못했습니다." }, { status: 404 });
  return NextResponse.json({ deleted: true });
}

