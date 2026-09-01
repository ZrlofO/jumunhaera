CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  qr_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'empty',
  memo TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS menu_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES tables(id),
  status TEXT NOT NULL CHECK (status IN ('pending','accepted','preparing','completed','rejected','cancelled')),
  note TEXT NOT NULL DEFAULT '',
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id TEXT NOT NULL,
  menu_name TEXT NOT NULL,
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_table_created ON orders(table_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  table_numbers JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS business_closings (
  id TEXT PRIMARY KEY,
  snapshot JSONB NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_closings_closed ON business_closings(closed_at DESC);

INSERT INTO tables (id, number, name, qr_token) VALUES
('table-1',1,'테이블 1','table-1'),('table-2',2,'테이블 2','table-2'),
('table-3',3,'테이블 3','table-3'),('table-4',4,'테이블 4','table-4'),
('table-5',5,'테이블 5','table-5'),('table-6',6,'테이블 6','table-6'),
('table-7',7,'테이블 7','table-7'),('table-8',8,'테이블 8','table-8')
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_items (id, name, description, price, category) VALUES
('menu-1','트러플 크림 파스타','진한 크림과 향긋한 트러플의 조화',18000,'파스타'),
('menu-2','새우 로제 파스타','통통한 새우와 부드러운 로제 소스',17500,'파스타'),
('menu-3','문어 샐러드','구운 문어와 제철 채소, 레몬 드레싱',14500,'샐러드'),
('menu-4','스테이크 덮밥','직화 스테이크와 특제 간장 소스',18500,'라이스'),
('menu-5','바질 토마토 피자','바질과 생모차렐라를 올린 화덕 피자',21000,'피자'),
('menu-6','자몽 에이드','상큼한 생자몽과 탄산',6500,'음료')
ON CONFLICT (id) DO NOTHING;

