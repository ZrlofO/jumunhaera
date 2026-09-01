import type { MenuItem, Order, TableInfo } from "./types";

type DemoState = { menu: MenuItem[]; tables: TableInfo[]; orders: Order[] };

const seed: DemoState = {
  menu: [
    { id: "menu-1", name: "트러플 크림 파스타", description: "진한 크림과 향긋한 트러플의 조화", price: 18000, category: "파스타", available: true },
    { id: "menu-2", name: "새우 로제 파스타", description: "통통한 새우와 부드러운 로제 소스", price: 17500, category: "파스타", available: true },
    { id: "menu-3", name: "문어 샐러드", description: "구운 문어와 제철 채소, 레몬 드레싱", price: 14500, category: "샐러드", available: true },
    { id: "menu-4", name: "스테이크 덮밥", description: "직화 스테이크와 특제 간장 소스", price: 18500, category: "라이스", available: true },
    { id: "menu-5", name: "바질 토마토 피자", description: "바질과 생모차렐라를 올린 화덕 피자", price: 21000, category: "피자", available: true },
    { id: "menu-6", name: "자몽 에이드", description: "상큼한 생자몽과 탄산", price: 6500, category: "음료", available: true },
  ],
  tables: Array.from({ length: 8 }, (_, index) => ({
    id: `table-${index + 1}`,
    number: index + 1,
    name: `테이블 ${index + 1}`,
    qrToken: `table-${index + 1}`,
    connectedNumber: index + 1,
    status: ["ordering", "active", "empty", "preparing", "payment", "empty", "active", "empty"][index],
    memo: index === 1 ? "창가 자리 요청 / 알레르기 없음" : "",
  })),
  orders: [
    {
      id: "order-demo-1", tableId: "table-1", tableNumber: 1, status: "pending", note: "소스는 따로 부탁드려요", totalAmount: 32500,
      acknowledged: false, createdAt: new Date(Date.now() - 60_000).toISOString(),
      items: [
        { id: "item-1", menuItemId: "menu-1", menuName: "트러플 크림 파스타", unitPrice: 18000, quantity: 1 },
        { id: "item-2", menuItemId: "menu-3", menuName: "문어 샐러드", unitPrice: 14500, quantity: 1 },
      ],
    },
    {
      id: "order-demo-2", tableId: "table-7", tableNumber: 7, status: "pending", note: "", totalAmount: 18500,
      acknowledged: false, createdAt: new Date(Date.now() - 120_000).toISOString(),
      items: [{ id: "item-3", menuItemId: "menu-4", menuName: "스테이크 덮밥", unitPrice: 18500, quantity: 1 }],
    },
    {
      id: "order-demo-3", tableId: "table-2", tableNumber: 2, status: "completed", note: "", totalAmount: 48000,
      acknowledged: true, createdAt: new Date(Date.now() - 3_600_000).toISOString(), completedAt: new Date(Date.now() - 1_800_000).toISOString(),
      items: [
        { id: "item-4", menuItemId: "menu-5", menuName: "바질 토마토 피자", unitPrice: 21000, quantity: 1 },
        { id: "item-5", menuItemId: "menu-3", menuName: "문어 샐러드", unitPrice: 14500, quantity: 1 },
        { id: "item-6", menuItemId: "menu-6", menuName: "자몽 에이드", unitPrice: 6500, quantity: 2 },
      ],
    },
  ],
};

declare global {
  // eslint-disable-next-line no-var
  var __orderyDemo: DemoState | undefined;
}

export const demoState = globalThis.__orderyDemo ?? structuredClone(seed);
if (process.env.NODE_ENV !== "production") globalThis.__orderyDemo = demoState;

