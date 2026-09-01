"use client";

import { Check, ChevronLeft, Clock3, Minus, Plus, ReceiptText, UtensilsCrossed, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MenuItem, Order, TableInfo } from "@/lib/types";

const money = (value: number) => `${value.toLocaleString("ko-KR")}원`;
const statusText: Record<string, string> = { pending: "주문 확인 중", accepted: "주문 수락", preparing: "준비 중", completed: "완료" };

export default function CustomerOrder({ token }: { token: string }) {
  const router = useRouter();
  const qrTableNumber = /^table-(\d+)$/.exec(token)?.[1];
  const [table, setTable] = useState<TableInfo | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [category, setCategory] = useState("전체");
  const [cartOpen, setCartOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  const load = async () => {
    const response = await fetch(`/api/public/${token}`, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json(); setTable(data.table); setMenu(data.menu); setOrders(data.orders);
  };
  useEffect(() => { load(); const timer = setInterval(load, 3000); return () => clearInterval(timer); }, [token]);

  const categories = ["전체", ...Array.from(new Set(menu.map((item) => item.category)))];
  const items = category === "전체" ? menu : menu.filter((item) => item.category === category);
  const count = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const total = useMemo(() => menu.reduce((sum, item) => sum + item.price * (cart[item.id] ?? 0), 0), [cart, menu]);
  const change = (id: string, delta: number) => setCart((current) => ({ ...current, [id]: Math.max(0, (current[id] ?? 0) + delta) }));

  const submitOrder = async () => {
    setSubmitting(true); setMessage("");
    const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tableToken: token, note, items: Object.entries(cart).filter(([, quantity]) => quantity > 0).map(([menuItemId, quantity]) => ({ menuItemId, quantity })) }) });
    const data = await response.json();
    if (response.ok) { setCart({}); setNote(""); setCartOpen(false); setMessage("주문이 접수되었습니다."); await load(); } else setMessage(data.error || "주문을 처리하지 못했습니다.");
    setSubmitting(false);
  };

  const ownerLogin = async () => {
    const response = await fetch("/api/owner/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
    if (response.ok) router.push("/owner/dashboard"); else setPinError((await response.json()).error || "번호를 확인해 주세요.");
  };

  if (!table) return <main className="customer-shell customer-loading">테이블을 확인하고 있습니다…</main>;
  return (
    <main className="customer-shell">
      <header className="customer-header"><div className="customer-brand"><span><UtensilsCrossed size={19} /></span><strong>주문해라</strong></div><div className="table-chip"><small>TABLE</small><b>{qrTableNumber ?? table.connectedNumber ?? table.number}</b></div></header>
      <section className="customer-hero"><p>좋은 식사의 시작</p><h1>오늘은 무엇을<br />드시고 싶으세요?</h1><span>천천히 둘러보고 편하게 주문하세요.</span></section>
      {orders.some((order) => order.status !== "completed") && <section className="order-progress"><div><Clock3 size={18} /><span><b>{statusText[orders[0].status] ?? "주문 진행 중"}</b><small>주문이 매장에 전달되었습니다.</small></span></div><ReceiptText size={20} /></section>}
      {message && <div className="customer-message"><Check size={16} />{message}</div>}
      <nav className="category-tabs">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={category === item ? "active" : ""}>{item}</button>)}</nav>
      <section className="menu-section"><div className="menu-title"><h2>{category === "전체" ? "전체 메뉴" : category}</h2><span>{items.length}개의 메뉴</span></div>
        <div className="customer-menu-grid">{items.map((item, index) => <article className="customer-menu-card" key={item.id}><div className={`food-visual food-${(index % 4) + 1}`}>{item.imageUrl && <img src={item.imageUrl} alt={item.name} />}<span>{item.category}</span></div><div className="food-copy"><small>{item.category}</small><h3>{item.name}</h3><p>{item.description}</p><div><strong>{money(item.price)}</strong>{cart[item.id] ? <span className="quantity"><button onClick={() => change(item.id, -1)}><Minus size={14} /></button><b>{cart[item.id]}</b><button onClick={() => change(item.id, 1)}><Plus size={14} /></button></span> : <button className="add-button" onClick={() => change(item.id, 1)}><Plus size={17} /></button>}</div></div></article>)}</div>
      </section>
      {count > 0 && <button className="cart-bar" onClick={() => setCartOpen(true)}><span className="cart-count">{count}</span><b>주문 확인하기</b><strong>{money(total)}</strong></button>}
      <button className="hidden-owner" aria-label="사장용 접근" onClick={() => setPinOpen(true)} />
      {cartOpen && <div className="sheet-backdrop" onClick={() => setCartOpen(false)}><section className="cart-sheet" onClick={(event) => event.stopPropagation()}><div className="sheet-handle" /><div className="sheet-title"><button onClick={() => setCartOpen(false)}><ChevronLeft /></button><h2>주문 확인</h2><span /></div><div className="cart-items">{menu.filter((item) => cart[item.id]).map((item) => <div key={item.id}><span><b>{item.name}</b><small>{money(item.price)}</small></span><span className="quantity"><button onClick={() => change(item.id, -1)}><Minus size={14} /></button><b>{cart[item.id]}</b><button onClick={() => change(item.id, 1)}><Plus size={14} /></button></span></div>)}</div><label className="note-field"><span>요청사항</span><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} placeholder="예) 소스는 따로 주세요" /></label><div className="checkout-total"><span>총 주문금액</span><strong>{money(total)}</strong></div><button className="checkout-button" disabled={submitting} onClick={submitOrder}>{submitting ? "주문을 전송하고 있어요…" : `${money(total)} 주문하기`}</button></section></div>}
      {pinOpen && <div className="pin-backdrop"><section className="pin-modal"><button className="pin-close" onClick={() => setPinOpen(false)}><X /></button><span className="brand-mark"><UtensilsCrossed size={20} /></span><h2>사장님 접근</h2><p>관리 번호를 입력해 주세요.</p><input autoFocus type="password" inputMode="numeric" maxLength={12} value={pin} onChange={(event) => { setPin(event.target.value); setPinError(""); }} onKeyDown={(event) => event.key === "Enter" && ownerLogin()} placeholder="••••" />{pinError && <small>{pinError}</small>}<button onClick={ownerLogin}>대시보드 열기</button><em>로컬 데모 번호: 1234</em></section></div>}
    </main>
  );
}

