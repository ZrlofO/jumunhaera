import { NextResponse } from "next/server";
import { isOwnerRequest } from "@/lib/auth";
import { getOrders } from "@/lib/store";

export async function GET() {
  if (!(await isOwnerRequest())) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  const completed = (await getOrders()).filter((order) => order.status === "completed");
  const menu = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const order of completed) for (const item of order.items) {
    const current = menu.get(item.menuItemId) ?? { name: item.menuName, quantity: 0, revenue: 0 };
    current.quantity += item.quantity; current.revenue += item.unitPrice * item.quantity; menu.set(item.menuItemId, current);
  }
  return NextResponse.json({ totalRevenue: completed.reduce((sum, order) => sum + order.totalAmount, 0), orderCount: completed.length, menu: [...menu.values()].sort((a, b) => b.revenue - a.revenue) });
}

