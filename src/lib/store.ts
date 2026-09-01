import { neon } from "@neondatabase/serverless";
import { demoState } from "./demo-data";
import type { ActivityEvent, ActivityEventType, BusinessClosure, MenuCategory, MenuItem, Order, OrderStatus, TableInfo } from "./types";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const db = hasDatabase ? neon(process.env.DATABASE_URL!) : null;
const demoActivity: ActivityEvent[] = [];
const demoClosings: BusinessClosure[] = [];
let activityTableReady: Promise<void> | null = null;
let menuSchemaReady: Promise<void> | null = null;
const connectionNumber = (token: string) => {
  const match = /^table-(\d+)$/.exec(token);
  return match ? Number(match[1]) : null;
};

function mapOrderRow(row: Record<string, unknown>, items: Order["items"]): Order {
  return {
    id: String(row.id), tableId: String(row.table_id), tableNumber: connectionNumber(String(row.qr_token ?? "")) ?? Number(row.table_number),
    status: String(row.status) as OrderStatus, note: String(row.note ?? ""), totalAmount: Number(row.total_amount),
    acknowledged: Boolean(row.acknowledged), createdAt: new Date(String(row.created_at)).toISOString(),
    acceptedAt: row.accepted_at ? new Date(String(row.accepted_at)).toISOString() : null,
    completedAt: row.completed_at ? new Date(String(row.completed_at)).toISOString() : null, items,
  };
}

async function ensureMenuSchema() {
  if (!db) return;
  if (!menuSchemaReady) menuSchemaReady = (async () => {
    await db`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT ''`;
    await db`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0`;
    await db`CREATE TABLE IF NOT EXISTS menu_categories (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
    await db`INSERT INTO menu_categories (id, name, sort_order) SELECT CONCAT('category-', LOWER(REGEXP_REPLACE(category, '\\s+', '-', 'g'))), category, MIN(sort_order) FROM menu_items GROUP BY category ON CONFLICT (name) DO NOTHING`;
  })();
  await menuSchemaReady;
}

async function ensureActivityTable() {
  if (!db) return;
  if (!activityTableReady) {
    activityTableReady = (async () => {
      await db`CREATE TABLE IF NOT EXISTS activity_logs (id TEXT PRIMARY KEY, event_type TEXT NOT NULL, table_numbers JSONB NOT NULL DEFAULT '[]'::jsonb, summary TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await db`CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC)`;
      await db`CREATE TABLE IF NOT EXISTS business_closings (id TEXT PRIMARY KEY, snapshot JSONB NOT NULL, closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await db`CREATE INDEX IF NOT EXISTS idx_business_closings_closed ON business_closings(closed_at DESC)`;
    })();
  }
  await activityTableReady;
}

export async function recordActivity(input: { type: ActivityEventType; tableNumbers: number[]; summary: string; payload?: Record<string, unknown> }): Promise<ActivityEvent> {
  const event: ActivityEvent = { id: crypto.randomUUID(), type: input.type, tableNumbers: [...new Set(input.tableNumbers)].sort((a, b) => a - b), summary: input.summary.slice(0, 500), payload: input.payload ?? {}, createdAt: new Date().toISOString() };
  if (!db) { demoActivity.unshift(event); return event; }
  await ensureActivityTable();
  const row = (await db`INSERT INTO activity_logs (id, event_type, table_numbers, summary, payload, created_at) VALUES (${event.id}, ${event.type}, ${JSON.stringify(event.tableNumbers)}::jsonb, ${event.summary}, ${JSON.stringify(event.payload)}::jsonb, NOW()) RETURNING *`)[0];
  return { ...event, createdAt: new Date(String(row.created_at)).toISOString() };
}

export async function getActivity(): Promise<ActivityEvent[]> {
  if (!db) return [...demoActivity].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  await ensureActivityTable();
  const rows = await db`SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 500`;
  return rows.map((row) => ({ id: String(row.id), type: String(row.event_type) as ActivityEventType, tableNumbers: Array.isArray(row.table_numbers) ? row.table_numbers.map(Number) : [], summary: String(row.summary), payload: typeof row.payload === "object" && row.payload ? row.payload as Record<string, unknown> : {}, createdAt: new Date(String(row.created_at)).toISOString() }));
}

function makeClosure(orders: Order[], events: ActivityEvent[]): BusinessClosure {
  const completed = orders.filter((order) => order.status === "completed");
  const revenue = completed.reduce((sum, order) => sum + order.totalAmount, 0);
  const menuSales = Object.values(completed.flatMap((order) => order.items).reduce<Record<string, { name: string; quantity: number; revenue: number }>>((menu, item) => {
    const current = menu[item.menuItemId] || { name: item.menuName, quantity: 0, revenue: 0 };
    current.quantity += item.quantity;
    current.revenue += item.unitPrice * item.quantity;
    menu[item.menuItemId] = current;
    return menu;
  }, {})).sort((first, second) => second.revenue - first.revenue);
  return { id: crypto.randomUUID(), closedAt: new Date().toISOString(), revenue, paymentCount: completed.length, menuSales, events, orders };
}

export async function getBusinessClosings(): Promise<BusinessClosure[]> {
  if (!db) return [...demoClosings].sort((first, second) => second.closedAt.localeCompare(first.closedAt));
  await ensureActivityTable();
  const rows = await db`SELECT * FROM business_closings ORDER BY closed_at DESC LIMIT 100`;
  return rows.map((row) => {
    const snapshot = (typeof row.snapshot === "object" && row.snapshot ? row.snapshot : {}) as Partial<BusinessClosure>;
    return { id: String(row.id), closedAt: row.closed_at ? new Date(String(row.closed_at)).toISOString() : String(snapshot.closedAt ?? new Date().toISOString()), revenue: Number(snapshot.revenue ?? 0), paymentCount: Number(snapshot.paymentCount ?? 0), menuSales: Array.isArray(snapshot.menuSales) ? snapshot.menuSales as BusinessClosure["menuSales"] : [], events: Array.isArray(snapshot.events) ? snapshot.events as ActivityEvent[] : [], orders: Array.isArray(snapshot.orders) ? snapshot.orders as Order[] : [] };
  });
}

export async function deleteBusinessClosing(id: string): Promise<boolean> {
  if (!db) {
    const index = demoClosings.findIndex((closure) => closure.id === id);
    if (index < 0) return false;
    demoClosings.splice(index, 1);
    return true;
  }
  await ensureActivityTable();
  const result = await db`DELETE FROM business_closings WHERE id = ${id} RETURNING id`;
  return Boolean(result[0]);
}

export async function closeBusiness(): Promise<BusinessClosure> {
  const [orders, events] = await Promise.all([getOrders(), getActivity()]);
  const closure = makeClosure(orders, events);
  if (!db) {
    demoClosings.unshift(closure);
    demoState.orders = [];
    demoActivity.length = 0;
    demoState.tables.forEach((table) => { table.status = "empty"; });
    return closure;
  }
  await ensureActivityTable();
  await db`INSERT INTO business_closings (id, snapshot, closed_at) VALUES (${closure.id}, ${JSON.stringify(closure)}::jsonb, NOW())`;
  await db`DELETE FROM orders`;
  await db`DELETE FROM activity_logs`;
  await db`UPDATE tables SET status = 'empty'`;
  return closure;
}

export async function getTableByToken(token: string): Promise<TableInfo | null> {
  if (!db) return demoState.tables.find((table) => table.qrToken === token) ?? null;
  const rows = await db`SELECT id, number, name, qr_token, status, memo FROM tables WHERE qr_token = ${token} LIMIT 1`;
  if (!rows[0]) return null;
  const row = rows[0];
  const qrToken = String(row.qr_token);
  return { id: String(row.id), number: Number(row.number), name: String(row.name), qrToken, connectedNumber: connectionNumber(qrToken), status: String(row.status), memo: String(row.memo ?? "") };
}

export async function getMenu(): Promise<MenuItem[]> {
  if (!db) return demoState.menu.filter((item) => item.available);
  await ensureMenuSchema();
  const rows = await db`SELECT id, name, description, price, category, available, image_url, sort_order FROM menu_items WHERE available = true ORDER BY sort_order, created_at`;
  return rows.map((row) => ({ id: String(row.id), name: String(row.name), description: String(row.description ?? ""), price: Number(row.price), category: String(row.category), available: Boolean(row.available), imageUrl: String(row.image_url ?? ""), sortOrder: Number(row.sort_order ?? 0) }));
}

export async function getCategories(): Promise<MenuCategory[]> {
  if (!db) return Array.from(new Set(demoState.menu.map((item) => item.category))).map((name, index) => ({ id: `category-${index}`, name, sortOrder: index }));
  await ensureMenuSchema();
  const rows = await db`SELECT id, name, sort_order FROM menu_categories ORDER BY sort_order, created_at`;
  return rows.map((row) => ({ id: String(row.id), name: String(row.name), sortOrder: Number(row.sort_order) }));
}

export async function createCategory(name: string): Promise<MenuCategory> {
  const clean = name.trim().slice(0, 30);
  if (!clean) throw new Error("카테고리 이름을 입력해 주세요.");
  if (!db) return { id: crypto.randomUUID(), name: clean, sortOrder: 0 };
  await ensureMenuSchema();
  const exists = (await db`SELECT id, name, sort_order FROM menu_categories WHERE name = ${clean} LIMIT 1`)[0];
  if (exists) return { id: String(exists.id), name: String(exists.name), sortOrder: Number(exists.sort_order) };
  const id = crypto.randomUUID(); const row = (await db`INSERT INTO menu_categories (id, name, sort_order) VALUES (${id}, ${clean}, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM menu_categories)) RETURNING id, name, sort_order`)[0];
  return { id: String(row.id), name: String(row.name), sortOrder: Number(row.sort_order) };
}

export async function saveMenu(input: { id?: string; name: string; description: string; price: number; category: string; imageUrl: string }): Promise<MenuItem> {
  const name = input.name.trim().slice(0, 80), category = input.category.trim().slice(0, 30), description = input.description.trim().slice(0, 240), imageUrl = input.imageUrl.trim().slice(0, 1000), price = Math.max(0, Math.floor(input.price));
  if (!name || !category || !Number.isFinite(price)) throw new Error("메뉴 이름, 카테고리, 가격을 확인해 주세요.");
  await createCategory(category);
  if (!db) { const item = input.id ? demoState.menu.find((menu) => menu.id === input.id) : undefined; const saved = item ?? { id: crypto.randomUUID(), name, description, price, category, available: true, imageUrl, sortOrder: demoState.menu.length }; Object.assign(saved, { name, description, price, category, imageUrl }); if (!item) demoState.menu.push(saved); return saved; }
  await ensureMenuSchema();
  if (input.id) { const row = (await db`UPDATE menu_items SET name=${name}, description=${description}, price=${price}, category=${category}, image_url=${imageUrl} WHERE id=${input.id} RETURNING id, name, description, price, category, available, image_url, sort_order`)[0]; if (!row) throw new Error("메뉴를 찾지 못했습니다."); return { id: String(row.id), name: String(row.name), description: String(row.description), price: Number(row.price), category: String(row.category), available: Boolean(row.available), imageUrl: String(row.image_url), sortOrder: Number(row.sort_order) }; }
  const id = crypto.randomUUID(); const row = (await db`INSERT INTO menu_items (id,name,description,price,category,available,image_url,sort_order) VALUES (${id},${name},${description},${price},${category},true,${imageUrl},(SELECT COALESCE(MAX(sort_order),-1)+1 FROM menu_items)) RETURNING id,name,description,price,category,available,image_url,sort_order`)[0]; return { id: String(row.id), name: String(row.name), description: String(row.description), price: Number(row.price), category: String(row.category), available: Boolean(row.available), imageUrl: String(row.image_url), sortOrder: Number(row.sort_order) };
}

export async function deleteMenu(id: string): Promise<boolean> {
  if (!db) { const index = demoState.menu.findIndex((item) => item.id === id); if (index < 0) return false; demoState.menu.splice(index, 1); return true; }
  await ensureMenuSchema(); const result = await db`DELETE FROM menu_items WHERE id = ${id} RETURNING id`; return Boolean(result[0]);
}

export async function reorderMenu(ids: string[]): Promise<void> {
  if (!db) { demoState.menu.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)); return; }
  await ensureMenuSchema(); for (const [index, id] of ids.entries()) await db`UPDATE menu_items SET sort_order = ${index} WHERE id = ${id}`;
}

export async function getOrders(): Promise<Order[]> {
  if (!db) return [...demoState.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const rows = await db`SELECT o.*, t.number AS table_number, t.qr_token FROM orders o JOIN tables t ON t.id = o.table_id ORDER BY o.created_at DESC LIMIT 200`;
  if (!rows.length) return [];
  const ids = rows.map((row) => String(row.id));
  const itemRows = await db`SELECT * FROM order_items WHERE order_id = ANY(${ids}) ORDER BY created_at`;
  return rows.map((row) => mapOrderRow(row, itemRows.filter((item) => item.order_id === row.id).map((item) => ({ id: String(item.id), menuItemId: String(item.menu_item_id), menuName: String(item.menu_name), unitPrice: Number(item.unit_price), quantity: Number(item.quantity) }))));
}

export async function getTables(): Promise<TableInfo[]> {
  if (!db) return demoState.tables;
  const rows = await db`SELECT id, number, name, qr_token, status, memo FROM tables ORDER BY number`;
  return rows.map((row) => { const qrToken = String(row.qr_token); return { id: String(row.id), number: Number(row.number), name: String(row.name), qrToken, connectedNumber: connectionNumber(qrToken), status: String(row.status), memo: String(row.memo ?? "") }; });
}

export async function createTable(): Promise<TableInfo> {
  if (!db) {
    const number = Math.max(0, ...demoState.tables.map((table) => table.number)) + 1;
    const id = crypto.randomUUID();
    const table: TableInfo = { id, number, name: "테이블 ?", qrToken: `unassigned-${id}`, connectedNumber: null, status: "empty", memo: "" };
    demoState.tables.push(table);
    return table;
  }
  const row = (await db`SELECT COALESCE(MAX(number), 0) + 1 AS next_number FROM tables`)[0];
  const number = Number(row.next_number);
  const id = crypto.randomUUID();
  const token = `unassigned-${id}`;
  const created = (await db`INSERT INTO tables (id, number, name, qr_token, status, memo) VALUES (${id}, ${number}, ${"테이블 ?"}, ${token}, 'empty', '') RETURNING id, number, name, qr_token, status, memo`)[0];
  return { id: String(created.id), number: Number(created.number), name: String(created.name), qrToken: String(created.qr_token), connectedNumber: null, status: String(created.status), memo: String(created.memo ?? "") };
}

export async function deleteTable(id: string): Promise<boolean> {
  if (!db) {
    const index = demoState.tables.findIndex((table) => table.id === id);
    if (index < 0) return false;
    demoState.tables.splice(index, 1);
    demoState.orders = demoState.orders.filter((order) => order.tableId !== id);
    return true;
  }
  await db`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE table_id = ${id})`;
  await db`DELETE FROM orders WHERE table_id = ${id}`;
  const result = await db`DELETE FROM tables WHERE id = ${id} RETURNING id`;
  return Boolean(result[0]);
}

export async function setTableConnection(id: string, connectedNumber: number): Promise<TableInfo | null> {
  const targetToken = `table-${connectedNumber}`;
  if (!db) {
    const source = demoState.tables.find((table) => table.id === id);
    if (!source) return null;
    const owner = demoState.tables.find((table) => table.qrToken === targetToken);
    const oldToken = source.qrToken;
    const oldNumber = connectionNumber(oldToken);
    if (owner && owner.id !== source.id) {
      owner.qrToken = oldToken;
      owner.connectedNumber = oldNumber;
      owner.name = oldNumber ? `테이블 ${oldNumber}` : `미연결 테이블 ${owner.number}`;
    }
    source.qrToken = targetToken;
    source.connectedNumber = connectedNumber;
    source.name = `테이블 ${connectedNumber}`;
    return source;
  }
  const sourceRows = await db`SELECT id, qr_token FROM tables WHERE id = ${id} LIMIT 1`;
  if (!sourceRows[0]) return null;
  const sourceToken = String(sourceRows[0].qr_token);
  const sourceNumber = connectionNumber(sourceToken);
  const ownerRows = await db`SELECT id, number FROM tables WHERE qr_token = ${targetToken} LIMIT 1`;
  const ownerId = ownerRows[0] ? String(ownerRows[0].id) : null;
  if (ownerId && ownerId !== id) {
    const temporaryToken = `swap-${crypto.randomUUID()}`;
    await db`UPDATE tables SET qr_token = ${temporaryToken} WHERE id = ${id}`;
    const ownerName = sourceNumber ? `테이블 ${sourceNumber}` : `미연결 테이블 ${Number(ownerRows[0].number)}`;
    await db`UPDATE tables SET qr_token = ${sourceToken}, name = ${ownerName} WHERE id = ${ownerId}`;
  }
  await db`UPDATE tables SET qr_token = ${targetToken}, name = ${`테이블 ${connectedNumber}`} WHERE id = ${id}`;
  return (await getTables()).find((table) => table.id === id) ?? null;
}

export async function createOrder(input: { tableToken: string; note: string; items: { menuItemId: string; quantity: number }[] }): Promise<Order> {
  const table = await getTableByToken(input.tableToken);
  if (!table) throw new Error("유효하지 않은 테이블입니다.");
  const menu = await getMenu();
  const selected = input.items.map((entry) => {
    const item = menu.find((candidate) => candidate.id === entry.menuItemId);
    if (!item || entry.quantity < 1 || entry.quantity > 20) throw new Error("주문 항목을 확인해 주세요.");
    return { ...item, quantity: Math.floor(entry.quantity) };
  });
  if (!selected.length) throw new Error("메뉴를 선택해 주세요.");
  const order: Order = {
    id: crypto.randomUUID(), tableId: table.id, tableNumber: table.connectedNumber ?? table.number, status: "pending", note: input.note.slice(0, 300),
    totalAmount: selected.reduce((sum, item) => sum + item.price * item.quantity, 0), acknowledged: false, createdAt: new Date().toISOString(),
    items: selected.map((item) => ({ id: crypto.randomUUID(), menuItemId: item.id, menuName: item.name, unitPrice: item.price, quantity: item.quantity })),
  };
  if (!db) { demoState.orders.unshift(order); table.status = "ordering"; await recordActivity({ type: "order_created", tableNumbers: [order.tableNumber], summary: `테이블 ${order.tableNumber} 주문 접수`, payload: { orderId: order.id, items: order.items, note: order.note, totalAmount: order.totalAmount } }); return order; }
  await db`INSERT INTO orders (id, table_id, status, note, total_amount, acknowledged, created_at) VALUES (${order.id}, ${order.tableId}, ${order.status}, ${order.note}, ${order.totalAmount}, false, NOW())`;
  for (const item of order.items) await db`INSERT INTO order_items (id, order_id, menu_item_id, menu_name, unit_price, quantity, created_at) VALUES (${item.id}, ${order.id}, ${item.menuItemId}, ${item.menuName}, ${item.unitPrice}, ${item.quantity}, NOW())`;
  await db`UPDATE tables SET status = 'ordering' WHERE id = ${table.id}`;
  await recordActivity({ type: "order_created", tableNumbers: [order.tableNumber], summary: `테이블 ${order.tableNumber} 주문 접수`, payload: { orderId: order.id, items: order.items, note: order.note, totalAmount: order.totalAmount } });
  return order;
}

export async function updateOrder(id: string, patch: { status?: OrderStatus; acknowledged?: boolean }): Promise<Order | null> {
  if (!db) {
    const order = demoState.orders.find((entry) => entry.id === id);
    if (!order) return null;
    if (patch.status) { order.status = patch.status; if (patch.status === "accepted") order.acceptedAt = new Date().toISOString(); if (patch.status === "completed") order.completedAt = new Date().toISOString(); }
    if (typeof patch.acknowledged === "boolean") order.acknowledged = patch.acknowledged;
    return order;
  }
  const status = patch.status ?? null;
  const acknowledged = typeof patch.acknowledged === "boolean" ? patch.acknowledged : null;
  await db`UPDATE orders SET status = COALESCE(${status}, status), acknowledged = COALESCE(${acknowledged}, acknowledged), accepted_at = CASE WHEN ${status} = 'accepted' THEN NOW() ELSE accepted_at END, completed_at = CASE WHEN ${status} = 'completed' THEN NOW() ELSE completed_at END WHERE id = ${id}`;
  return (await getOrders()).find((order) => order.id === id) ?? null;
}

export async function updateTableMemo(id: string, memo: string): Promise<boolean> {
  if (!db) { const table = demoState.tables.find((entry) => entry.id === id); if (!table) return false; table.memo = memo.slice(0, 500); return true; }
  const result = await db`UPDATE tables SET memo = ${memo.slice(0, 500)} WHERE id = ${id} RETURNING id`;
  return Boolean(result[0]);
}

export function isDemoMode() { return !hasDatabase; }

