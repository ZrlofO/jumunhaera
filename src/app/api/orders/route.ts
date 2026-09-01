import { NextResponse } from "next/server";
import { createOrder, getOrders } from "@/lib/store";
import { isOwnerRequest } from "@/lib/auth";

export async function GET() {
  if (!(await isOwnerRequest())) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  return NextResponse.json({ orders: await getOrders() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const order = await createOrder({ tableToken: String(body.tableToken ?? ""), note: String(body.note ?? ""), items: Array.isArray(body.items) ? body.items : [] });
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "주문을 처리하지 못했습니다." }, { status: 400 });
  }
}

