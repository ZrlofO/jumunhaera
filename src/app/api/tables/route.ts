import { NextResponse } from "next/server";
import { isOwnerRequest } from "@/lib/auth";
import { createTable, getTables } from "@/lib/store";

export async function GET() {
  if (!(await isOwnerRequest())) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  return NextResponse.json({ tables: await getTables() });
}

export async function POST() {
  if (!(await isOwnerRequest())) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  return NextResponse.json({ table: await createTable() }, { status: 201 });
}

