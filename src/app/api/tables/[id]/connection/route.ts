import { NextResponse } from "next/server";
import { isOwnerRequest } from "@/lib/auth";
import { setTableConnection } from "@/lib/store";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isOwnerRequest())) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const number = Number(body.connectedNumber);
  if (!Number.isInteger(number) || number < 1 || number > 99) return NextResponse.json({ error: "연결할 테이블 번호를 확인해 주세요." }, { status: 400 });
  const table = await setTableConnection(id, number);
  return table ? NextResponse.json({ table }) : NextResponse.json({ error: "테이블을 찾을 수 없습니다." }, { status: 404 });
}


