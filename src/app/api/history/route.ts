import { NextResponse } from "next/server";
import { isOwnerRequest } from "@/lib/auth";
import { deleteBusinessClosing, getActivity, getBusinessClosings, recordActivity } from "@/lib/store";
import type { ActivityEventType } from "@/lib/types";

const allowedTypes = new Set<ActivityEventType>(["order_created", "payment_completed", "tables_merged", "tables_unmerged"]);

export async function GET() {
  if (!(await isOwnerRequest())) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  const [events, closings] = await Promise.all([getActivity(), getBusinessClosings()]);
  return NextResponse.json({ events, closings });
}

export async function POST(request: Request) {
  if (!(await isOwnerRequest())) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  try {
    const body = await request.json();
    if (body.action === "delete_closing") {
      const id = String(body.closingId ?? "");
      if (!id) throw new Error("삭제할 마감 기록이 없습니다.");
      const deleted = await deleteBusinessClosing(id);
      if (!deleted) return NextResponse.json({ error: "마감 기록을 찾지 못했습니다." }, { status: 404 });
      return NextResponse.json({ deleted: true });
    }
    const type = String(body.type) as ActivityEventType;
    if (!allowedTypes.has(type)) throw new Error("지원하지 않는 기록 유형입니다.");
    const tableNumbers: number[] = Array.isArray(body.tableNumbers) ? body.tableNumbers.map(Number).filter((number: number) => Number.isInteger(number) && number > 0) : [];
    const event = await recordActivity({ type, tableNumbers, summary: String(body.summary ?? "기록"), payload: typeof body.payload === "object" && body.payload ? body.payload : {} });
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "기록을 저장하지 못했습니다." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isOwnerRequest())) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("closingId");
  if (!id) return NextResponse.json({ error: "삭제할 마감 기록이 없습니다." }, { status: 400 });
  try {
    const deleted = await deleteBusinessClosing(id);
    if (!deleted) return NextResponse.json({ error: "마감 기록을 찾지 못했습니다." }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "마감 기록을 삭제하지 못했습니다." }, { status: 500 });
  }
}

