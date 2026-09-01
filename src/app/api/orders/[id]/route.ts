import { NextResponse } from "next/server";
import { isOwnerRequest } from "@/lib/auth";
import { updateOrder } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";

const statuses = new Set<OrderStatus>(["pending", "accepted", "preparing", "completed", "rejected", "cancelled"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isOwnerRequest())) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const status = body.status && statuses.has(body.status) ? body.status as OrderStatus : undefined;
  const acknowledged = typeof body.acknowledged === "boolean" ? body.acknowledged : undefined;
  const order = await updateOrder(id, { status, acknowledged });
  if (!order) return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ order });
}

