export type OrderStatus = "pending" | "accepted" | "preparing" | "completed" | "rejected" | "cancelled";

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  imageUrl?: string;
  sortOrder?: number;
};

export type MenuCategory = { id: string; name: string; sortOrder: number };

export type TableInfo = {
  id: string;
  number: number;
  name: string;
  qrToken: string;
  connectedNumber: number | null;
  status: string;
  memo: string;
};

export type OrderItem = {
  id: string;
  menuItemId: string;
  menuName: string;
  unitPrice: number;
  quantity: number;
};

export type Order = {
  id: string;
  tableId: string;
  tableNumber: number;
  status: OrderStatus;
  note: string;
  totalAmount: number;
  acknowledged: boolean;
  createdAt: string;
  acceptedAt?: string | null;
  completedAt?: string | null;
  items: OrderItem[];
};

export type ActivityEventType = "order_created" | "payment_completed" | "tables_merged" | "tables_unmerged";

export type ActivityEvent = {
  id: string;
  type: ActivityEventType;
  tableNumbers: number[];
  summary: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type BusinessClosure = {
  id: string;
  closedAt: string;
  revenue: number;
  paymentCount: number;
  menuSales: { name: string; quantity: number; revenue: number }[];
  events: ActivityEvent[];
  orders: Order[];
};

