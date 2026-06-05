import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const SUPABASE_URL = "https://iptpynpbgktwzvgnbvcx.supabase.co";
const SUPABASE_KEY = "sb_publishable_7gVjYC98eAk664wHt_eUBQ_bvtfv5ee";

/*
  Ryan 交易日誌 App_v6
  重點：
  1. 保留 App_v5 的 Supabase 讀寫邏輯
  2. 列表改成深色金融 App 版面
  3. 右側只保留大型金屬狀態圖示，不再顯示綠色小打勾
  4. 交易狀態：持有中 / 獲利完成 / 了結虧損 / 小幅虧損
  5. 台股損益顏色：賺紅、賠綠
*/

const C = {
  bg: "#070B12",
  bg2: "#0B111C",
  panel: "#101722",
  card: "#111A26",
  card2: "#151F2D",
  border: "rgba(255,255,255,0.105)",
  border2: "rgba(255,255,255,0.16)",
  text: "#EEF3FF",
  sub: "#A7B0C0",
  mute: "#6F7A8B",
  blue: "#67B7FF",
  active: "#6D8CFF",
  red: "#FF6B66",
  green: "#8ECB9A",
  amber: "#D9A24A",
};

const ICON_COLOR = {
  hold: "#9DC3FF",
  win: "#FF7B72",
  loss: "#A8D6A7",
  small: "#D6A85E",
};

const STATUS_LABEL = {
  hold: "持有中",
  win: "獲利完成",
  loss: "了結虧損",
  small: "小幅虧損",
};

const ACC_LABEL = { "💰": "準確", "⚠️": "部分準確", "❌": "錯誤", "🔄": "進行中" };
const ACC_COLOR = { "💰": "#FF7B72", "⚠️": "#D6A85E", "❌": "#A8D6A7", "🔄": "#9DC3FF" };

const INDUSTRY = {
  "廣達": "筆電代工",
  "力積電": "記憶體晶圓",
  "聯發科": "IC設計",
  "日月光": "封測",
  "日月光投控": "封測",
  "00830": "半導體ETF",
  "國泰費城半導體": "半導體ETF",
  "欣興": "PCB載板",
  "國巨": "被動元件",
  "國巨*": "被動元件",
  "微星": "電腦週邊",
  "群電": "電源供應器",
  "光寶科": "電腦週邊 / 電源",
  "日電貿": "被動元件通路",
  "南亞": "塑化 / 電子材料",
  "中信金": "金融",
  "國泰金": "金融",
  "鴻海": "電子代工",
  "緯創": "筆電代工",
  "凱基金": "金融",
  "台玻": "玻璃",
  "陽明": "航運",
  "台塑化": "塑化",
  "長榮航": "航空",
  "聯電": "晶圓代工",
  "南茂": "封測",
  "大研生醫": "生技",
};

function pc(v) {
  const n = Number(v) || 0;
  if (n > 0) return "#FF5D5D"; // 台股：賺紅
  if (n < 0) return "#70C987"; // 台股：賠綠
  return "#B8BDC8";
}

function pt(v) {
  const n = Number(v) || 0;
  return `${n > 0 ? "+" : ""}${n.toLocaleString()} 元`;
}

function ptn(v) {
  const n = Number(v) || 0;
  return `${n > 0 ? "+" : ""}${n.toLocaleString()}`;
}

function parseStockName(stock = "") {
  return stock.replace(/\s*\d+.*$/, "").replace(/（.*?）/g, "").trim();
}

function getIndustry(stock) {
  const name = parseStockName(stock);
  return INDUSTRY[name] || INDUSTRY[stock.split(" ")[0]] || "";
}

function getStatusType(t) {
  if (t.status === "open") return "hold";
  const n = Number(t.pnl) || 0;
  if (n > 0) return "win";
  if (n <= -600) return "loss";
  return "small";
}

function calcUnreal(t) {
  const cp = Number(t.currentPrice) || 0;
  const bp = Number(t.buyPrice) || 0;
  const shares = Number(t.shares) || 0;
  if (!cp || !bp || !shares) return 0;
  return Math.round((cp - bp) * shares);
}

async function fetchTrades() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/trades?order=date.desc,id.desc`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, data: [] };
    const data = await res.json();
    if (!Array.isArray(data)) return { ok: false, error: "資料格式錯誤", data: [] };
    return {
      ok: true,
      error: null,
      data: data.map((t) => ({
        id: t.id,
        date: t.date,
        stock: t.stock,
        buyPrice: t.buy_price,
        sellPrice: t.sell_price,
        shares: t.shares,
        buyTime: t.buy_time,
        sellTime: t.sell_time,
        pnl: t.pnl,
        status: t.status,
        entryReason: t.entry_reason,
        exitReason: t.exit_reason,
        accuracy: t.accuracy,
        note: t.note,
        createdAt: t.created_at,
        currentPrice: t.current_price,
        industry: t.industry,
      })),
    };
  } catch (e) {
    return { ok: false, error: e.message, data: [] };
  }
}

async function updateTrade(id, fields) {
  const body = {};
  if ("buyPrice" in fields) body.buy_price = fields.buyPrice === "" ? null : Number(fields.buyPrice);
  if ("sellPrice" in fields) body.sell_price = fields.sellPrice === "" ? null : Number(fields.sellPrice);
  if ("shares" in fields) body.shares = fields.shares === "" ? null : Number(fields.shares);
  if ("buyTime" in fields) body.buy_time = fields.buyTime || null;
  if ("sellTime" in fields) body.sell_time = fields.sellTime || null;
  if ("pnl" in fields) body.pnl = fields.pnl === "" ? null : Number(fields.pnl);
  if ("status" in fields) body.status = fields.status;
  if ("entryReason" in fields) body.entry_reason = fields.entryReason || "";
  if ("exitReason" in fields) body.exit_reason = fields.exitReason || "";
  if ("accuracy" in fields) body.accuracy = fields.accuracy || null;
  if ("note" in fields) body.note = fields.note || "";
  if ("industry" in fields) body.industry = fields.industry || "";
  if ("currentPrice" in fields) body.current_price = fields.currentPrice === "" ? null : Number(fields.currentPrice);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/trades?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`更新失敗 HTTP ${res.status}`);
  return await res.json();
}

async function insertTrade(fields) {
  const body = {
    date: fields.date,
    stock: fields.stock,
    buy_price: fields.buyPrice === "" ? null : Number(fields.buyPrice),
    sell_price: fields.sellPrice === "" ? null : Number(fields.sellPrice),
    shares: fields.shares === "" ? null : Number(fields.shares),
    buy_time: fields.buyTime || null,
    sell_time: fields.sellTime || null,
    pnl: fields.pnl === "" ? null : Number(fields.pnl),
    status: fields.status || "open",
    entry_reason: fields.entryReason || "",
    exit_reason: fields.exitReason || "",
    accuracy: fields.accuracy || null,
    note: fields.note || "",
    industry: fields.industry || "",
    current_price: fields.currentPrice === "" || fields.currentPrice == null ? null : Number(fields.currentPrice),
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/trades`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`新增失敗 HTTP ${res.status}`);
  return await res.json();
}

function GlobalStyle() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      body { margin: 0; background: ${C.bg}; }
      button, input, textarea, select { font-family: inherit; }
      .app-shell {
        min-height: 100vh;
        background:
          radial-gradient(circle at 18% 0%, rgba(70, 104, 160, .18), transparent 36%),
          radial-gradient(circle at 80% 8%, rgba(255, 123, 114, .10), transparent 32%),
          linear-gradient(180deg, #0B111C 0%, #070B12 42%, #05070B 100%);
        color: ${C.text};
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", sans-serif;
        padding-bottom: 86px;
      }
      .topbar {
        position: sticky;
        top: 0;
        z-index: 20;
        background: rgba(8, 12, 18, .86);
        backdrop-filter: blur(18px);
        border-bottom: 1px solid ${C.border};
      }
      .header {
        padding: 22px 22px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }
      .title {
        font-size: clamp(26px, 5vw, 46px);
        line-height: 1.05;
        font-weight: 900;
        letter-spacing: -1.2px;
        text-shadow: 0 2px 18px rgba(112, 145, 255, .16);
      }
      .add-btn {
        background: linear-gradient(145deg, rgba(112, 140, 255, .34), rgba(54, 70, 128, .58));
        border: 1px solid rgba(135, 160, 255, .55);
        color: ${C.text};
        border-radius: 12px;
        padding: 10px 14px;
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
        box-shadow: inset 0 1px 1px rgba(255,255,255,.18), 0 8px 18px rgba(0,0,0,.25);
        white-space: nowrap;
      }
      .tabs {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        height: 58px;
        border-top: 1px solid rgba(255,255,255,.04);
      }
      .tab-btn {
        background: transparent;
        border: none;
        color: ${C.mute};
        font-size: 18px;
        font-weight: 800;
        cursor: pointer;
        position: relative;
      }
      .tab-btn.active { color: ${C.text}; }
      .tab-btn.active::after {
        content: "";
        position: absolute;
        left: 22%;
        right: 22%;
        bottom: 0;
        height: 3px;
        border-radius: 999px;
        background: linear-gradient(90deg, transparent, #6B89FF, transparent);
        box-shadow: 0 0 12px rgba(105, 135, 255, .8);
      }
      .content { padding: 18px 20px; max-width: 1024px; margin: 0 auto; }
      .section-title {
        color: ${C.sub};
        font-size: 16px;
        font-weight: 800;
        letter-spacing: .6px;
        margin: 8px 0 14px;
      }
      .glass-card {
        background:
          linear-gradient(180deg, rgba(255,255,255,.052), rgba(255,255,255,.025)),
          linear-gradient(145deg, rgba(20,31,45,.96), rgba(10,15,24,.98));
        border: 1px solid ${C.border};
        border-radius: 16px;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 8px 24px rgba(0,0,0,.28);
      }
      .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1.35fr; gap: 12px; margin-bottom: 20px; }
      .summary-card { padding: 18px; min-height: 120px; position: relative; overflow: hidden; }
      .summary-card::after {
        content: "";
        position: absolute;
        inset: auto 18px 15px 18px;
        height: 36px;
        background: linear-gradient(100deg, transparent, rgba(255,93,93,.45), transparent);
        opacity: .42;
        filter: blur(12px);
      }
      .summary-label { color: ${C.sub}; font-size: 15px; font-weight: 700; margin-bottom: 9px; }
      .summary-value { font-size: 25px; font-weight: 900; letter-spacing: .2px; }
      .record-tools { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 12px; }
      .tool-btn {
        background: rgba(255,255,255,.045);
        border: 1px solid ${C.border};
        color: ${C.sub};
        border-radius: 12px;
        padding: 10px 14px;
        font-size: 14px;
        font-weight: 700;
      }
      .trade-card {
        min-height: 96px;
        padding: 16px 18px;
        margin-bottom: 10px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        column-gap: 16px;
        align-items: center;
        cursor: pointer;
        transition: transform .15s ease, border-color .15s ease, background .15s ease;
      }
      .trade-card:hover { transform: translateY(-1px); border-color: rgba(157,195,255,.22); }
      .trade-name-row { display: flex; align-items: center; gap: 10px; min-width: 0; }
      .trade-name { font-size: 22px; font-weight: 900; letter-spacing: .2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .badge {
        display: inline-flex;
        align-items: center;
        height: 27px;
        padding: 0 10px;
        border-radius: 999px;
        font-size: 14px;
        font-weight: 900;
        border: 1px solid currentColor;
        background: rgba(255,255,255,.04);
        flex: 0 0 auto;
      }
      .badge.hold { color: ${ICON_COLOR.hold}; background: rgba(80,115,170,.16); }
      .badge.win { color: ${ICON_COLOR.win}; background: rgba(255,123,114,.14); }
      .badge.loss { color: ${ICON_COLOR.loss}; background: rgba(120,170,128,.13); }
      .badge.small { color: ${ICON_COLOR.small}; background: rgba(214,168,94,.13); }
      .industry { color: #C4CAD5; font-size: 15px; margin-top: 5px; min-height: 21px; }
      .meta { display: flex; align-items: center; gap: 8px; color: ${C.sub}; font-size: 14px; margin-top: 7px; flex-wrap: wrap; }
      .time { color: ${C.blue}; font-weight: 700; }
      .pnl-col { min-width: 118px; text-align: right; padding-right: 2px; }
      .pnl { font-size: 24px; font-weight: 900; letter-spacing: .1px; text-shadow: 0 0 16px currentColor; }
      .right-divider { width: 1px; align-self: stretch; background: linear-gradient(180deg, transparent, rgba(255,255,255,.09), transparent); }
      .icon-wrap { display: grid; place-items: center; }
      .bottom-nav {
        position: fixed;
        left: 0; right: 0; bottom: 0;
        height: 72px;
        z-index: 30;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        background: rgba(12,18,28,.92);
        backdrop-filter: blur(18px);
        border-top: 1px solid ${C.border};
        box-shadow: 0 -10px 28px rgba(0,0,0,.35);
      }
      .nav-item {
        background: transparent; border: none; color: ${C.sub};
        font-size: 12px; font-weight: 800; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
      }
      .nav-item.active { color: #6D8CFF; }
      .nav-icon { font-size: 22px; line-height: 1; }
      .detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
      .detail-box { padding: 12px; background: rgba(255,255,255,.035); border: 1px solid ${C.border}; border-radius: 12px; }
      .detail-label { font-size: 12px; color: ${C.sub}; margin-bottom: 6px; }
      .detail-value { font-size: 16px; font-weight: 800; color: ${C.text}; }
      .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
      .field { margin-bottom: 10px; }
      .field label { display: block; color: ${C.sub}; font-size: 12px; font-weight: 700; margin-bottom: 5px; }
      .field input, .field textarea, .field select {
        width: 100%; background: rgba(255,255,255,.045); border: 1px solid ${C.border}; color: ${C.text}; border-radius: 10px;
        padding: 10px 11px; outline: none; font-size: 14px;
      }
      .field textarea { min-height: 72px; resize: vertical; }
      .primary-btn {
        background: linear-gradient(145deg, #6D8CFF, #4059DA);
        border: 1px solid rgba(165,185,255,.35);
        color: white; border-radius: 12px; padding: 12px; font-weight: 900; cursor: pointer;
      }
      .secondary-btn {
        background: rgba(255,255,255,.045); border: 1px solid ${C.border}; color: ${C.sub}; border-radius: 12px; padding: 12px; font-weight: 800; cursor: pointer;
      }
      .modal-backdrop {
        position: fixed; inset: 0; background: rgba(0,0,0,.74); z-index: 80; display: flex; justify-content: center; align-items: flex-start; overflow: auto; padding: 18px;
      }
      .modal { width: min(520px, 100%); margin: auto; padding: 18px; }
      .top-btn {
        position: fixed; right: 15px; bottom: 82px; z-index: 40;
        width: 58px; height: 58px; border-radius: 50%; border: 1px solid rgba(135,160,255,.45);
        background: linear-gradient(145deg, #6D8CFF, #34408D); color: white; font-weight: 900; cursor: pointer;
        box-shadow: 0 10px 22px rgba(0,0,0,.4);
      }
      @media (max-width: 720px) {
        .header { padding: 18px 18px 12px; }
        .summary-grid { grid-template-columns: 1fr 1fr; }
        .summary-grid .wide { grid-column: 1 / -1; }
        .trade-card { grid-template-columns: minmax(0, 1fr) auto auto; padding: 14px 14px; column-gap: 10px; min-height: 90px; }
        .trade-name { font-size: 20px; }
        .pnl-col { min-width: 98px; }
        .pnl { font-size: 20px; }
      }
      @media (max-width: 430px) {
        .content { padding: 14px 12px; }
        .title { font-size: 25px; }
        .tabs { height: 52px; }
        .tab-btn { font-size: 16px; }
        .summary-card { padding: 14px; min-height: 105px; }
        .trade-card { min-height: 86px; }
        .trade-name { font-size: 19px; }
        .industry { font-size: 13px; }
        .meta { font-size: 12px; gap: 5px; }
        .pnl-col { min-width: 78px; }
        .pnl { font-size: 18px; }
        .form-grid, .detail-grid { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}

function MetalIcon({ type, size = 58 }) {
  const color = ICON_COLOR[type] || ICON_COLOR.hold;
  const id = `grad-${type}-${size}`;
  const glow =
    type === "win" ? "rgba(255,123,114,.55)" :
    type === "loss" ? "rgba(168,214,167,.42)" :
    type === "small" ? "rgba(214,168,94,.48)" :
    "rgba(157,195,255,.55)";

  const common = {
    filter: `drop-shadow(0 5px 10px rgba(0,0,0,.42)) drop-shadow(0 0 12px ${glow})`,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={common} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="12" y1="8" x2="52" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="0.18" stopColor={color} stopOpacity="0.98" />
          <stop offset="0.52" stopColor={color} stopOpacity="0.72" />
          <stop offset="0.78" stopColor="#1C2530" stopOpacity="0.86" />
          <stop offset="1" stopColor={color} stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id={`${id}-bg`} cx="50%" cy="45%" r="55%">
          <stop offset="0" stopColor={color} stopOpacity="0.18" />
          <stop offset="1" stopColor="#05070B" stopOpacity="0.8" />
        </radialGradient>
      </defs>

      {type !== "loss" && type !== "small" && (
        <circle cx="32" cy="32" r="27" fill={`url(#${id}-bg)`} stroke={`url(#${id})`} strokeWidth="2.6" />
      )}

      {type === "hold" && (
        <g stroke={`url(#${id})`} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M45.5 21.5A18.5 18.5 0 1 0 50 35.5" />
          <path d="M45.5 12.5v11.8h-11.8" />
          <path d="M18.5 42.5A18.5 18.5 0 0 0 46 44" opacity="0.35" />
        </g>
      )}

      {type === "win" && (
        <g stroke={`url(#${id})`} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 42l10.3-10.3 7.4 7.1L49 24.5" />
          <path d="M39 24.5h10v10" />
        </g>
      )}

      {type === "loss" && (
        <g>
          <path d="M32 7l20 7.5v15.2c0 12.6-8.2 19.7-20 27.3-11.8-7.6-20-14.7-20-27.3V14.5L32 7z" fill={`url(#${id}-bg)`} stroke={`url(#${id})`} strokeWidth="2.8" />
          <path d="M32 20v22" stroke={`url(#${id})`} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M23.5 34.5L32 43l8.5-8.5" stroke={`url(#${id})`} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}

      {type === "small" && (
        <g>
          <path d="M32 8L57 53H7L32 8z" fill={`url(#${id}-bg)`} stroke={`url(#${id})`} strokeWidth="3" strokeLinejoin="round" />
          <path d="M18.5 39.5c5-8 9 5 14.3-1.5 4.2-5.2 6.3-6.8 12.6-2" stroke={`url(#${id})`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </svg>
  );
}

function MiniStatusIcon({ type, size = 24 }) {
  return <MetalIcon type={type} size={size} />;
}

function Badge({ type, text }) {
  return <span className={`badge ${type}`}>{text}</span>;
}

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function TextField({ label, value, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SelectField({ label, value, onChange, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>{children}</select>
    </div>
  );
}

function SummaryCard({ label, value, color, icon, className = "" }) {
  return (
    <div className={`glass-card summary-card ${className}`}>
      <div className="summary-label">{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {icon && <MetalIcon type={icon} size={52} />}
        <div className="summary-value" style={{ color }}>{value}</div>
      </div>
    </div>
  );
}

function TradeCard({ trade, onClick }) {
  const stype = getStatusType(trade);
  const isOpen = trade.status === "open";
  const industry = trade.industry || getIndustry(trade.stock);

  return (
    <div className="glass-card trade-card" onClick={onClick}>
      <div style={{ minWidth: 0 }}>
        <div className="trade-name-row">
          <div className="trade-name">{trade.stock}</div>
          <Badge type={stype} text={isOpen ? "持有中" : "已結"} />
        </div>
        <div className="industry">{industry || "—"}</div>
        <div className="meta">
          <span>▣ {trade.date || "—"}</span>
          <span>•</span>
          <span>◷ <span className="time">{trade.buyTime || trade.sellTime || "—"}</span></span>
        </div>
      </div>

      <div className="pnl-col">
        <div className="pnl" style={{ color: isOpen ? "#B8BDC8" : pc(trade.pnl) }}>
          {isOpen ? "0" : pt(trade.pnl)}
        </div>
      </div>

      <div className="right-divider" />

      <div className="icon-wrap">
        <MetalIcon type={stype} size={62} />
      </div>
    </div>
  );
}

function Dashboard({ allTrades, closed, open, setTab }) {
  const wins = closed.filter((t) => Number(t.pnl) > 0);
  const losses = closed.filter((t) => Number(t.pnl) < 0);
  const realized = closed.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
  const unrealized = open.reduce((s, t) => s + calcUnreal(t), 0);
  const winRate = closed.length ? Math.round((wins.length / closed.length) * 100) : 0;

  const statusData = [
    { name: STATUS_LABEL.win, value: allTrades.filter((t) => getStatusType(t) === "win").length, color: ICON_COLOR.win, icon: "win" },
    { name: STATUS_LABEL.small, value: allTrades.filter((t) => getStatusType(t) === "small").length, color: ICON_COLOR.small, icon: "small" },
    { name: STATUS_LABEL.loss, value: allTrades.filter((t) => getStatusType(t) === "loss").length, color: ICON_COLOR.loss, icon: "loss" },
    { name: STATUS_LABEL.hold, value: allTrades.filter((t) => getStatusType(t) === "hold").length, color: ICON_COLOR.hold, icon: "hold" },
  ].filter((d) => d.value > 0);

  return (
    <>
      <div className="summary-grid">
        <SummaryCard label="總損益" value={pt(realized + unrealized)} color={pc(realized + unrealized)} icon="win" />
        <SummaryCard label="分析準確率" value={`${winRate}%`} color="#7D95FF" icon="hold" />
        <div className="glass-card summary-card wide" style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 10, alignItems: "center" }}>
          <div>
            <div className="summary-label">交易狀態分布</div>
            <ResponsiveContainer width="100%" height={100}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={30} outerRadius={48} dataKey="value" paddingAngle={2}>
                  {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text }} formatter={(v, n) => [`${v}筆`, n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "grid", gap: 7 }}>
            {statusData.map((d) => (
              <div key={d.name} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 7, alignItems: "center", fontSize: 14, color: C.text }}>
                <MiniStatusIcon type={d.icon} size={25} />
                <span>{d.name}</span>
                <span style={{ color: C.sub }}>{d.value} 筆</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="record-tools">
        <div className="section-title" style={{ margin: 0 }}>最近紀錄</div>
        <button className="tool-btn" onClick={() => setTab("records")}>查看全部</button>
      </div>
      {allTrades.slice(0, 6).map((t) => <TradeCard key={t.id} trade={t} onClick={() => setTab("records")} />)}
    </>
  );
}

function CurrentPriceEditor({ sel, onSave, saving }) {
  const [val, setVal] = useState(sel.currentPrice ?? "");

  useEffect(() => {
    setVal(sel.currentPrice ?? "");
  }, [sel.id, sel.currentPrice]);

  const bp = Number(sel.buyPrice) || 0;
  const shares = Number(sel.shares) || 0;
  const cp = Number(val) || 0;
  const preview = cp && bp && shares ? Math.round((cp - bp) * shares) : 0;
  const dirty = String(val) !== String(sel.currentPrice ?? "");

  return (
    <div className="detail-box" style={{ marginBottom: 14 }}>
      <div className="detail-label">現價（持有中・即時試算未實現損益）</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="number"
          inputMode="decimal"
          value={val}
          placeholder="輸入現價"
          onChange={(e) => setVal(e.target.value)}
          style={{ flex: 1, background: "rgba(255,255,255,.045)", color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, fontSize: 14, outline: "none" }}
        />
        <button
          className="primary-btn"
          style={{ padding: "10px 14px", whiteSpace: "nowrap" }}
          disabled={saving || !dirty}
          onClick={() => onSave(val)}
        >
          {saving ? "儲存中..." : "儲存現價"}
        </button>
      </div>
      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: C.sub, fontSize: 13 }}>未實現損益</span>
        <span style={{ fontWeight: 900, fontSize: 18, color: pc(preview) }}>{pt(preview)}</span>
      </div>
    </div>
  );
}

function Records({ allTrades, sel, setSel, editing, setEditing, form, setForm, saveEdit, saveCurrentPrice, saving, openEdit, openAdd }) {
  if (sel) {
    const idx = allTrades.findIndex((t) => t.id === sel.id);
    const prev = idx > 0 ? allTrades[idx - 1] : null;
    const next = idx < allTrades.length - 1 ? allTrades[idx + 1] : null;
    const stype = getStatusType(sel);
    const industry = sel.industry || getIndustry(sel.stock);

    return (
      <div>
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginBottom: 12 }}>
          <button className="secondary-btn" disabled={!prev} onClick={() => { if (prev) { setSel(prev); setEditing(false); } }}>上一筆</button>
          <button className="secondary-btn" onClick={() => { setSel(null); setEditing(false); }}>返回列表</button>
          <button className="secondary-btn" disabled={!next} onClick={() => { if (next) { setSel(next); setEditing(false); } }}>下一筆</button>
        </div>

        <div className="glass-card" style={{ padding: 18 }}>
          {!editing ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
                <div>
                  <div className="trade-name-row">
                    <div className="trade-name">{sel.stock}</div>
                    <Badge type={stype} text={sel.status === "open" ? "持有中" : "已結"} />
                  </div>
                  <div className="industry">{industry}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <MetalIcon type={stype} size={62} />
                  <div className="pnl" style={{ color: sel.status === "open" ? pc(calcUnreal(sel)) : pc(sel.pnl), marginTop: 8 }}>
                    {sel.status === "open" ? pt(calcUnreal(sel)) : pt(sel.pnl)}
                  </div>
                </div>
              </div>

              <div className="detail-grid" style={{ marginBottom: 14 }}>
                {[
                  ["產業類別", industry || "—"],
                  ["買入價", sel.buyPrice ?? "—"],
                  ["賣出價", sel.sellPrice ?? "待出場"],
                  ["股數", sel.shares ? `${sel.shares} 股` : "—"],
                  ["買入時間", `${sel.date || ""} ${sel.buyTime || "—"}`],
                  ["賣出時間", sel.sellTime || "—"],
                ].map(([label, value]) => (
                  <div className="detail-box" key={label}>
                    <div className="detail-label">{label}</div>
                    <div className="detail-value">{value}</div>
                  </div>
                ))}
              </div>

              {sel.status === "open" && (
                <CurrentPriceEditor sel={sel} onSave={saveCurrentPrice} saving={saving} />
              )}

              {[
                ["進場原因", sel.entryReason || "—"],
                ["出場原因", sel.exitReason || "—"],
                ["檢討筆記", sel.note || "—"],
              ].map(([label, value]) => (
                <div className="detail-box" key={label} style={{ marginBottom: 10 }}>
                  <div className="detail-label">{label}</div>
                  <div style={{ lineHeight: 1.7, color: C.text }}>{value}</div>
                </div>
              ))}

              <button className="primary-btn" style={{ width: "100%", marginTop: 8 }} onClick={() => openEdit(sel)}>編輯</button>
            </>
          ) : (
            <EditForm form={form} setForm={setForm} onSave={saveEdit} onCancel={() => setEditing(false)} saving={saving} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="record-tools">
        <div className="section-title" style={{ margin: 0 }}>全部紀錄（{allTrades.length} 筆）</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="tool-btn">最新在前⌄</button>
          <button className="tool-btn" onClick={openAdd}>＋ Add New</button>
        </div>
      </div>
      {allTrades.map((t) => <TradeCard key={t.id} trade={t} onClick={() => setSel(t)} />)}
    </div>
  );
}

function EditForm({ form, setForm, onSave, onCancel, saving }) {
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>編輯交易</div>
      <div className="form-grid">
        <Field label="買入價" type="number" value={form.buyPrice} onChange={(v) => set("buyPrice", v)} />
        <Field label="賣出價" type="number" value={form.sellPrice} onChange={(v) => set("sellPrice", v)} />
      </div>
      <div className="form-grid">
        <Field label="股數" type="number" value={form.shares} onChange={(v) => set("shares", v)} />
        <Field label="損益（元）" type="number" value={form.pnl} onChange={(v) => set("pnl", v)} />
      </div>
      <div className="form-grid">
        <Field label="買入時間" value={form.buyTime} placeholder="09:10" onChange={(v) => set("buyTime", v)} />
        <Field label="賣出時間" value={form.sellTime} placeholder="13:05" onChange={(v) => set("sellTime", v)} />
      </div>
      <div className="form-grid">
        <Field label="產業類別" value={form.industry} onChange={(v) => set("industry", v)} />
        <Field label="現價（持有中用）" type="number" value={form.currentPrice} onChange={(v) => set("currentPrice", v)} />
      </div>
      <div className="form-grid">
        <SelectField label="狀態" value={form.status} onChange={(v) => set("status", v)}>
          <option value="open">持有中</option>
          <option value="closed">已結</option>
        </SelectField>
        <SelectField label="分析準確率" value={form.accuracy} onChange={(v) => set("accuracy", v)}>
          <option value="💰">準確</option>
          <option value="⚠️">部分準確</option>
          <option value="❌">錯誤</option>
          <option value="🔄">進行中</option>
        </SelectField>
      </div>
      <TextField label="進場原因" value={form.entryReason} onChange={(v) => set("entryReason", v)} />
      <TextField label="出場原因" value={form.exitReason} onChange={(v) => set("exitReason", v)} />
      <TextField label="檢討筆記" value={form.note} onChange={(v) => set("note", v)} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
        <button className="primary-btn" onClick={onSave} disabled={saving}>{saving ? "儲存中..." : "儲存修改"}</button>
        <button className="secondary-btn" onClick={onCancel}>取消</button>
      </div>
    </div>
  );
}

function AddModal({ form, setForm, onSave, onClose, saving }) {
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="glass-card modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>＋ Add New</div>
        <div style={{ color: C.sub, marginBottom: 14 }}>新增一筆交易紀錄</div>
        <Field label="股票名稱與代號" value={form.stock} placeholder="光寶科 2301" onChange={(v) => set("stock", v)} />
        <div className="form-grid">
          <Field label="日期" value={form.date} placeholder="2026-06-01" onChange={(v) => set("date", v)} />
          <Field label="產業類別" value={form.industry} placeholder="電腦週邊 / 電源" onChange={(v) => set("industry", v)} />
        </div>
        <div className="form-grid">
          <Field label="買入價" type="number" value={form.buyPrice} onChange={(v) => set("buyPrice", v)} />
          <Field label="股數" type="number" value={form.shares} onChange={(v) => set("shares", v)} />
        </div>
        <div className="form-grid">
          <Field label="買入時間" value={form.buyTime} placeholder="10:56" onChange={(v) => set("buyTime", v)} />
          <SelectField label="狀態" value={form.status} onChange={(v) => set("status", v)}>
            <option value="open">持有中</option>
            <option value="closed">已結</option>
          </SelectField>
        </div>
        {form.status === "closed" && (
          <>
            <div className="form-grid">
              <Field label="賣出價" type="number" value={form.sellPrice} onChange={(v) => set("sellPrice", v)} />
              <Field label="賣出時間" value={form.sellTime} placeholder="13:05" onChange={(v) => set("sellTime", v)} />
            </div>
            <Field label="損益（元）" type="number" value={form.pnl} onChange={(v) => set("pnl", v)} />
          </>
        )}
        <TextField label="進場原因" value={form.entryReason} onChange={(v) => set("entryReason", v)} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          <button className="primary-btn" onClick={onSave} disabled={saving}>{saving ? "建立中..." : "建立"}</button>
          <button className="secondary-btn" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}

function Review({ closed }) {
  const rows = [
    { label: "準確", key: "💰", color: ACC_COLOR["💰"] },
    { label: "部分準確", key: "⚠️", color: ACC_COLOR["⚠️"] },
    { label: "錯誤", key: "❌", color: ACC_COLOR["❌"] },
    { label: "進行中", key: "🔄", color: ACC_COLOR["🔄"] },
  ];

  return (
    <div>
      <div className="section-title">分析回顧</div>
      <div className="glass-card" style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 14 }}>準確率分析</div>
        {rows.map((r) => {
          const count = closed.filter((t) => t.accuracy === r.key).length;
          const pct = closed.length ? Math.round((count / closed.length) * 100) : 0;
          return (
            <div key={r.key} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: C.text, fontWeight: 700, marginBottom: 6 }}>
                <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: r.color, marginRight: 8 }} />{r.label}</span>
                <span style={{ color: C.sub }}>{count} 筆 · {pct}%</span>
              </div>
              <div style={{ height: 7, background: "rgba(255,255,255,.06)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: r.color }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-card" style={{ padding: 16 }}>
        <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 14 }}>交易狀態圖示說明</div>
        {[
          ["hold", "持有中", "冷霧銀藍循環圖，表示交易尚未結案"],
          ["win", "獲利完成", "玫瑰金屬紅上升圖，表示已結獲利"],
          ["loss", "了結虧損", "偏綠灰綠盾牌，表示風險已控管並結案"],
          ["small", "小幅虧損", "琥珀銅三角圖，表示輕微回撤"],
        ].map(([type, title, desc]) => (
          <div key={type} style={{ display: "grid", gridTemplateColumns: "42px 1fr", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            <MetalIcon type={type} size={38} />
            <div>
              <div style={{ fontWeight: 900 }}>{title}</div>
              <div style={{ color: C.sub, fontSize: 13, marginTop: 3 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TradingJournal() {
  const [trades, setTrades] = useState([]);
  const [tab, setTab] = useState("records");
  const [sel, setSel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showTop, setShowTop] = useState(false);

  async function load() {
    setLoading(true);
    const result = await fetchTrades();
    if (result.ok) setTrades(result.data);
    else {
      console.error(result.error);
      setTrades([]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 260);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const allTrades = useMemo(() => {
    return trades
      .filter((t) => Number(t.pnl) !== 0 || t.status === "open")
      .map((t) => ({
        ...t,
        accuracy: t.accuracy || (t.status === "open" ? "🔄" : Number(t.pnl) > 0 ? "💰" : Number(t.pnl) < 0 ? "❌" : "⚠️"),
        note: t.note || "",
        entryReason: t.entryReason || "",
        exitReason: t.exitReason || "",
        industry: t.industry || getIndustry(t.stock),
      }));
  }, [trades]);

  const closed = allTrades.filter((t) => t.status === "closed");
  const open = allTrades.filter((t) => t.status === "open");

  function openEdit(t) {
    setForm({
      buyPrice: t.buyPrice ?? "",
      sellPrice: t.sellPrice ?? "",
      shares: t.shares ?? "",
      buyTime: t.buyTime ?? "",
      sellTime: t.sellTime ?? "",
      pnl: t.pnl ?? "",
      status: t.status ?? "open",
      entryReason: t.entryReason ?? "",
      exitReason: t.exitReason ?? "",
      accuracy: t.accuracy ?? (t.status === "open" ? "🔄" : "💰"),
      note: t.note ?? "",
      industry: t.industry ?? getIndustry(t.stock),
      currentPrice: t.currentPrice ?? "",
    });
    setEditing(true);
  }

  async function saveEdit() {
    if (!sel) return;
    setSaving(true);
    try {
      await updateTrade(sel.id, form);
      await load();
      setSel((s) => ({ ...s, ...form }));
      setEditing(false);
    } catch (e) {
      alert("儲存失敗：" + e.message);
    }
    setSaving(false);
  }

  async function saveCurrentPrice(price) {
    if (!sel) return;
    setSaving(true);
    try {
      await updateTrade(sel.id, { currentPrice: price });
      await load();
      setSel((s) => ({ ...s, currentPrice: price === "" ? null : Number(price) }));
    } catch (e) {
      alert("現價儲存失敗：" + e.message);
    }
    setSaving(false);
  }

  function openAdd() {
    setForm({
      date: new Date().toISOString().slice(0, 10),
      stock: "",
      buyPrice: "",
      sellPrice: "",
      shares: "",
      buyTime: "",
      sellTime: "",
      pnl: "",
      status: "open",
      entryReason: "",
      exitReason: "",
      accuracy: "🔄",
      note: "",
      industry: "",
      currentPrice: "",
    });
    setAdding(true);
  }

  async function saveAdd() {
    if (!form.stock || !form.date) {
      alert("請至少填股票名稱和日期");
      return;
    }
    setSaving(true);
    try {
      await insertTrade(form);
      await load();
      setAdding(false);
    } catch (e) {
      alert("新增失敗：" + e.message);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="app-shell" style={{ display: "grid", placeItems: "center" }}>
        <GlobalStyle />
        <div style={{ color: C.sub, fontWeight: 800 }}>載入中...</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <GlobalStyle />

      <div className="topbar">
        <div className="header">
          <div className="title">Ryan’s Transaction Records</div>
          <button className="add-btn" onClick={openAdd}>Add New ＋</button>
        </div>
        <div className="tabs">
          {[
            ["dashboard", "總覽"],
            ["records", "紀錄"],
            ["review", "檢討"],
          ].map(([id, label]) => (
            <button key={id} className={`tab-btn ${tab === id ? "active" : ""}`} onClick={() => { setTab(id); setSel(null); setEditing(false); }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="content">
        {tab === "dashboard" && <Dashboard allTrades={allTrades} closed={closed} open={open} setTab={setTab} />}
        {tab === "records" && (
          <Records
            allTrades={allTrades}
            sel={sel}
            setSel={setSel}
            editing={editing}
            setEditing={setEditing}
            form={form}
            setForm={setForm}
            saveEdit={saveEdit}
            saveCurrentPrice={saveCurrentPrice}
            saving={saving}
            openEdit={openEdit}
            openAdd={openAdd}
          />
        )}
        {tab === "review" && <Review closed={closed} />}
      </main>

      <div className="bottom-nav">
        {[
          ["dashboard", "◔", "總覽"],
          ["records", "☷", "紀錄"],
          ["add", "＋", "新增"],
          ["review", "▣", "檢討"],
          ["mine", "♙", "我的"],
        ].map(([id, icon, label]) => (
          <button
            key={id}
            className={`nav-item ${tab === id ? "active" : ""}`}
            onClick={() => {
              if (id === "add") openAdd();
              else if (id !== "mine") { setTab(id); setSel(null); setEditing(false); }
            }}
          >
            <span className="nav-icon">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {showTop && <button className="top-btn" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑<br /><span style={{ fontSize: 11 }}>置頂</span></button>}

      {adding && <AddModal form={form} setForm={setForm} onSave={saveAdd} onClose={() => setAdding(false)} saving={saving} />}
    </div>
  );
}
