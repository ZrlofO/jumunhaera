import { NextResponse } from "next/server";
import { getMenu, getOrders, getTableByToken, isDemoMode } from "@/lib/store";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const table = await getTableByToken(token);
  if (!table) return NextResponse.json({ error: "테이블을 찾을 수 없습니다." }, { status: 404 });
  const [menu, allOrders] = await Promise.all([getMenu(), getOrders()]);
  const orders = allOrders.filter((order) => order.tableId === table.id && !["rejected", "cancelled"].includes(order.status));
  return NextResponse.json({ table, menu, orders, demoMode: isDemoMode() });
}

