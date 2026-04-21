import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const SUPABASE_URL = "https://iptpynpbgktwzvgnbvcx.supabase.co";
const SUPABASE_KEY = "sb_publishable_7gVjYC98eAk664wHt_eUBQ_bvtfv5ee";

const INITIAL_TRADES = [
  { id: 1, date: "2026-01-19", stock: "佶優", buyPrice: 37.1, sellPrice: 34.0, shares: 1000, buyTime: null, sellTime: null, pnl: -3229, status: "closed", entryReason: "原因不明", exitReason: "原因不明", accuracy: "❌", note: "虧損-3,229元，進出場原因不明" },
  { id: 2, date: "2026-01-21", stock: "台玻", buyPrice: 53.5, sellPrice: 66.0, shares: 1000, buyTime: null, sellTime: null, pnl: 12255, status: "closed", entryReason: "原因不明", exitReason: "原因不明", accuracy: "✅", note: "獲利+12,255元，為本期最大獲利" },
  { id: 3, date: "2026-03-04", stock: "陽明 2609", buyPrice: 68.0, sellPrice: 55.2, shares: 1000, buyTime: null, sellTime: null, pnl: -13014, status: "closed", entryReason: "原因不明", exitReason: "融券回補日落空，大盤跌近3%，五檔委賣2,976 vs 委買942，跌破58元停損執行", accuracy: "⚠️", note: "進場成本68元過高，本期最大虧損" },
  { id: 4, date: "2026-03-06", stock: "台塑化", buyPrice: 60.6, sellPrice: 62.0, shares: 500, buyTime: null, sellTime: null, pnl: 583, status: "closed", entryReason: "原因不明", exitReason: "原因不明", accuracy: "✅", note: "小幅獲利+583元" },
  { id: 5, date: "2026-03-06", stock: "凱基金", buyPrice: 20.4, sellPrice: 19.45, shares: 1000, buyTime: null, sellTime: null, pnl: -1023, status: "closed", entryReason: "原因不明", exitReason: "原因不明", accuracy: "❌", note: "虧損-1,023元" },
  { id: 6, date: "2026-03-11", stock: "南茂 8150", buyPrice: 63.0, sellPrice: 63.3, shares: 500, buyTime: null, sellTime: null, pnl: 32, status: "closed", entryReason: "原因不明", exitReason: "大盤走弱，零股流動性極差，保本出場保留子彈", accuracy: "⚠️", note: "保本出場決策正確，獲利僅+32元" },
  { id: 7, date: "2026-03-11", stock: "長榮航 2618", buyPrice: 33.8, sellPrice: 33.85, shares: 300, buyTime: null, sellTime: null, pnl: -23, status: "closed", entryReason: "原因不明", exitReason: "大盤持續走弱，航空股動能不足，小虧出場", accuracy: "⚠️", note: "出場決策正確，損失極小-23元" },
  { id: 8, date: "2026-03-11", stock: "聯電 2303", buyPrice: 62.1, sellPrice: 59.8, shares: 232, buyTime: null, sellTime: null, pnl: -585, status: "closed", entryReason: "TFLN矽光子三方合作，AI資料中心1.6T光傳輸市場，聯電自身故事非跟漲", exitReason: "試撮價59.9元跌破61元停損線，費半-3.43%，MA全空頭排列，果斷停損", accuracy: "⚠️", note: "停損執行正確果斷，但進場時機偏早" },
  { id: 9, date: "2026-03-17", stock: "大研生醫 7780", buyPrice: 19.25, sellPrice: 20.0, shares: 1000, buyTime: null, sellTime: null, pnl: 676, status: "closed", entryReason: "原因不明", exitReason: "發現配息邏輯落空（發放率1,105%不可持續），庫藏股護盤首日漲停20元果斷出場", accuracy: "✅", note: "正確識別風險並把握庫藏股護盤機會出場" },
  { id: 10, date: "2026-03-19", stock: "廣達 2382", buyPrice: 289.0, sellPrice: null, shares: 60, buyTime: "09:10", sellTime: null, pnl: 0, status: "closed", entryReason: "外資持續買超，AI伺服器組裝龍頭，週線MA全上，大盤跌-1.28%仍收+0.68%最抗跌", exitReason: "外資單日大買33,611張，台積電法說前卡位，4/10分批出場（323.5元+315元）", accuracy: "✅", note: "進場判斷準確，分批出場策略有效，獲利+1,746元" },
  { id: 11, date: "2026-03-19", stock: "力積電 6770", buyPrice: 75.0, sellPrice: 57.4, shares: 200, buyTime: null, sellTime: null, pnl: -3563, status: "closed", entryReason: "半導體景氣復甦預期，短線技術面反彈訊號（進場理由薄弱）", exitReason: "外資5日賣超17萬張，持股比例從65%崩跌至12%，基本面連續兩年EPS虧損，停損", accuracy: "❌", note: "進場原因薄弱，基本面虧損未評估，籌碼崩壞後停損過慢" },
  { id: 12, date: "2026-03-20", stock: "緯創 3231", buyPrice: 130.5, sellPrice: 135.0, shares: 210, buyTime: "09:10", sellTime: null, pnl: 839, status: "closed", entryReason: "外資單日大買+11,924張，週線KDJ超賣J值-11.91，大盤跌但外資選擇性進場", exitReason: "五檔賣壓89,070股遠大於買盤4,993股，原掛136元未成交，即時刪單改135元", accuracy: "✅", note: "籌碼訊號準確，即時調整掛單價執行靈活" },
  { id: 13, date: "2026-03-23", stock: "日月光 3711", buyPrice: 344.5, sellPrice: null, shares: 80, buyTime: "09:10", sellTime: null, pnl: 0, status: "closed", entryReason: "CoWoS先進封裝最大外包受益者，外資持股78%+5日買超4,524張，ADR+3.86%", exitReason: "分兩批：4/08以384.5元(40股)，4/14以387元(40股)，法說前後卡位行情趁高鎖利", accuracy: "✅", note: "題材+籌碼+ADR三重確認，分批出場執行優秀，獲利+3,186元" },
  { id: 14, date: "2026-03-26", stock: "鴻海 2317", buyPrice: 204.5, sellPrice: 206.0, shares: 120, buyTime: "09:10", sellTime: null, pnl: 88, status: "closed", entryReason: "17位外資分析師全數買入，蘋果ADR+2.13%，費半大漲，AI伺服器題材", exitReason: "台積電法說正面，股價反彈至206元接近損益兩平，持有19天少量獲利避免反虧", accuracy: "⚠️", note: "方向正確但獲利僅+88元，持有19天效益不佳" },
  { id: 15, date: "2026-04-09", stock: "00830", buyPrice: 59.45, sellPrice: 63.5, shares: 300, buyTime: "09:10", sellTime: "09:10", pnl: 2264, status: "closed", entryReason: "費半止跌反彈，台積電法說前卡位，ETF交易稅0.1%成本優，費半站上8,500點", exitReason: "台積電ADR+3.15%，費半站上9,013點，法說正面，5天獲利6.62%，63.5元出場", accuracy: "✅", note: "時機掌握精準，ETF降低交易成本，開盤09:10成交" },
  { id: 16, date: "2026-02-26", stock: "中信金 2891（第一批）", buyPrice: 55.8, sellPrice: 53.4, shares: 500, buyTime: null, sellTime: "09:10:08", pnl: -1315, status: "closed", entryReason: "投信連續大幅買超，金融股防禦性強，美元走弱有利", exitReason: "法人5日賣超-88,085張，籌碼惡化，MA三線向下死叉，09:10:08分三筆停損", accuracy: "❌", note: "外資與投信方向相反為危險訊號，應更早識別停損" },
  { id: 17, date: "2026-04-16", stock: "中信金 2891（第二批）", buyPrice: 55.8, sellPrice: 53.0, shares: 500, buyTime: null, sellTime: "13:23~13:25", pnl: -1430, status: "closed", entryReason: "同上，剩餘500股持倉", exitReason: "下午盤13:23~13:25分六筆成交，流動性極差，籌碼無改善全部出清", accuracy: "❌", note: "下午盤零股流動性極差分6筆，停損應在上午執行" },
  { id: 18, date: "2026-04-09", stock: "國泰金 2882", buyPrice: 72.9, sellPrice: 75.2, shares: 200, buyTime: null, sellTime: "09:10", pnl: 374, status: "closed", entryReason: "投信5日買超13,723張，外資4/8單日回補4,848張，金融股防禦性適合不確定時期", exitReason: "4/22以75.2元成交，比掛單75元高0.2元，開盤強勢直接成交", accuracy: "✅", note: "掛單75元實際成交75.2元，執行順利，淨利+374元" },
  { id: 19, date: "2026-04-16", stock: "南亞 1303", buyPrice: 87.7, sellPrice: null, shares: 200, buyTime: "09:10:00", sellTime: null, pnl: 260, status: "open", entryReason: "外資5日買超88,216張，塑化轉型電子材料，MACD底部翻轉，J值超賣反彈，五檔買盤22,617 vs 賣盤2,904強勢", exitReason: "掛91元賣單中，4/22現價89元，停損85元以下", accuracy: "🔄", note: "09:10開盤三筆成交，實際87.7元優於掛單88.5元，波動大需注意停損" },
  { id: 20, date: "2026-04-16", stock: "國巨 2327", buyPrice: 312.0, sellPrice: null, shares: 50, buyTime: "09:10:00", sellTime: null, pnl: 625, status: "open", entryReason: "三大法人5日買超84,060張，AI被動元件需求明確，外資+投信+自營商同步加碼", exitReason: "掛328元賣單中，4/22現價324.5元，停損312元以下", accuracy: "🔄", note: "09:10開盤成交，實際312元優於掛單320元，節省400元成本" },
];

const AL = { "✅": "準確", "⚠️": "部分準確", "❌": "錯誤", "🔄": "進行中" };
const AB = { "✅": "#1a2e1a", "⚠️": "#2e2000", "❌": "#2e0a0a", "🔄": "#0a1e2e" };
const AC = { "✅": "#ff4d4d", "⚠️": "#ffaa00", "❌": "#4dff88", "🔄": "#5ac8fa" };
const pc = v => v > 0 ? "#ff4d4d" : v < 0 ? "#4dff88" : "#8e8e93";
const pt = v => `${v > 0 ? "+" : ""}${v.toLocaleString()}`;
const C = { bg: "#1c1c1e", sf: "#2c2c2e", sf2: "#3a3a3c", bd: "#48484a", tx: "#e5e5ea", sub: "#8e8e93", ac: "#c0c0c0", bl: "#5ac8fa" };

async function fetchTrades() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/trades?order=id.asc`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.length === 0) return null;
    return data.map(t => ({
      id: t.id, date: t.date, stock: t.stock,
      buyPrice: t.buy_price, sellPrice: t.sell_price, shares: t.shares,
      buyTime: t.buy_time, sellTime: t.sell_time,
      pnl: t.pnl, status: t.status,
      entryReason: t.entry_reason, exitReason: t.exit_reason,
      accuracy: t.accuracy, note: t.note
    }));
  } catch (e) { return null; }
}

async function saveTrades(trades) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/trades`, {
      method: "DELETE",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      }
    });
    const rows = trades.map(t => ({
      id: t.id, date: t.date, stock: t.stock,
      buy_price: t.buyPrice, sell_price: t.sellPrice, shares: t.shares,
      buy_time: t.buyTime, sell_time: t.sellTime,
      pnl: t.pnl, status: t.status,
      entry_reason: t.entryReason, exit_reason: t.exitReason,
      accuracy: t.accuracy, note: t.note
    }));
    await fetch(`${SUPABASE_URL}/rest/v1/trades`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(rows)
    });
  } catch (e) {}
}

export default function TradingJournal() {
  const [trades, setTrades] = useState(INITIAL_TRADES);
  const [tab, setTab] = useState("dashboard");
  const [sel, setSel] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dbStatus, setDbStatus] = useState("載入中...");

  useEffect(() => {
    (async () => {
      setSyncing(true);
      const remote = await fetchTrades();
      if (remote && remote.length > 0) {
        setTrades(remote);
        setDbStatus("✅ 已連線 Supabase");
      } else {
        await saveTrades(INITIAL_TRADES);
        setDbStatus("✅ 資料已初始化");
      }
      setSyncing(false);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveTrades(trades);
  }, [trades, loaded]);

  const allTrades = trades.filter(t => t.pnl !== 0 || t.status === "open");
  const closed = allTrades.filter(t => t.status === "closed");
  const open = allTrades.filter(t => t.status === "open");
  const realized = closed.reduce((s, t) => s + t.pnl, 0);
  const unrealized = open.reduce((s, t) => s + t.pnl, 0);
  const wins = closed.filter(t => t.pnl > 0);
  const losses = closed.filter(t => t.pnl < 0);
  const winRate = closed.length ? Math.round(wins.length / closed.length * 100) : 0;
  const best = closed.length ? closed.reduce((a, b) => a.pnl > b.pnl ? a : b) : null;
  const worst = closed.length ? closed.reduce((a, b) => a.pnl < b.pnl ? a : b) : null;

  const pie1 = [
    { name: "獲利", value: wins.length, color: "#ff4d4d" },
    { name: "虧損", value: losses.length, color: "#4dff88" },
  ].filter(d => d.value > 0);

  const pie2 = [
    { name: "準確✅", value: closed.filter(t => t.accuracy === "✅").length, color: "#ff4d4d" },
    { name: "部分⚠️", value: closed.filter(t => t.accuracy === "⚠️").length, color: "#ffaa00" },
    { name: "錯誤❌", value: closed.filter(t => t.accuracy === "❌").length, color: "#4dff88" },
  ].filter(d => d.value > 0);

  const Box = ({ children, style, onClick }) => (
    <div onClick={onClick} style={{ background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 10, ...style }}>{children}</div>
  );

  return (
    <div style={{ fontFamily: "-apple-system,sans-serif", background: C.bg, minHeight: "100vh", color: C.tx }}>
      <div style={{ background: C.sf, borderBottom: `1px solid ${C.bd}`, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: C.sub, letterSpacing: 2, textTransform: "uppercase" }}>Ryan · 零股交易</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.ac }}>交易日誌</div>
          <div style={{ fontSize: 9, color: syncing ? "#ffaa00" : "#4dff88", marginTop: 2 }}>{syncing ? "⏳ 同步中..." : dbStatus}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: C.sub }}>總損益</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: pc(realized + unrealized) }}>{pt(realized + unrealized)}</div>
        </div>
      </div>

      <div style={{ display: "flex", background: C.sf, borderBottom: `1px solid ${C.bd}` }}>
        {[["dashboard","總覽"],["records","紀錄"],["review","檢討"]].map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id); setSel(null); }} style={{
            flex: 1, padding: "10px 4px", border: "none", cursor: "pointer", background: "transparent",
            color: tab === id ? C.ac : C.sub, fontSize: 12,
            borderBottom: tab === id ? `2px solid ${C.ac}` : "2px solid transparent"
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: 14 }}>
        {tab === "dashboard" && <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[
              ["已實現損益", pt(realized), pc(realized)],
              ["未實現損益", pt(unrealized), pc(unrealized)],
              ["勝率", `${winRate}%`, "#ff4d4d"],
              ["已結筆數", `${closed.length} 筆`, C.ac],
            ].map(([label, value, color], i) => (
              <Box key={i} style={{ padding: 12 }}>
                <div style={{ fontSize: 10, color: C.sub, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
              </Box>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[[pie1, "損益分布"], [pie2, "分析準確率"]].map(([data, title], i) => (
              <Box key={i} style={{ padding: 10 }}>
                <div style={{ fontSize: 10, color: C.sub, marginBottom: 4 }}>{title}</div>
                <ResponsiveContainer width="100%" height={110}>
                  <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={25} outerRadius={42} dataKey="value" paddingAngle={3}>
                      {data.map((e, j) => <Cell key={j} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: C.sf2, border: `1px solid ${C.bd}`, borderRadius: 6, fontSize: 10 }} formatter={(v, n) => [`${v}筆`, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                  {data.map((d, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, color: C.sub }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: d.color }} />
                      {d.name}({d.value})
                    </div>
                  ))}
                </div>
              </Box>
            ))}
          </div>

          <div style={{ fontSize: 10, color: C.sub, letterSpacing: 2, marginBottom: 8, textTransform: "uppercase" }}>持有中</div>
          {open.map(t => (
            <Box key={t.id} style={{ padding: 12, marginBottom: 8, cursor: "pointer" }} onClick={() => { setSel(t); setTab("records"); }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.stock}</div>
                  <div style={{ fontSize: 10, color: C.sub, marginTop: 2 }}>
                    {t.buyPrice}元 × {t.shares}股
                    {t.buyTime && <span style={{ marginLeft: 6, color: C.bl }}>⏱ {t.buyTime}</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: pc(t.pnl) }}>{pt(t.pnl)}</div>
                  <div style={{ fontSize: 9, color: C.sub }}>未實現</div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: C.sub, marginTop: 8, borderTop: `1px solid ${C.bd}`, paddingTop: 6 }}>🎯 {t.exitReason}</div>
            </Box>
          ))}

          {best && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
              <Box style={{ padding: 12 }}>
                <div style={{ fontSize: 10, color: C.sub, marginBottom: 4 }}>🏆 最佳</div>
                <div style={{ fontSize: 11, color: C.tx }}>{best.stock}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#ff4d4d" }}>+{best.pnl.toLocaleString()}</div>
              </Box>
              {worst && <Box style={{ padding: 12 }}>
                <div style={{ fontSize: 10, color: C.sub, marginBottom: 4 }}>⚠️ 最差</div>
                <div style={{ fontSize: 11, color: C.tx }}>{worst.stock}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#4dff88" }}>{worst.pnl.toLocaleString()}</div>
              </Box>}
            </div>
          )}
        </>}

        {tab === "records" && <>
          {sel ? (
            <div>
              <button onClick={() => setSel(null)} style={{ background: C.sf2, border: `1px solid ${C.bd}`, color: C.sub, padding: "6px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 12, fontSize: 11 }}>← 返回</button>
              <Box style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.ac }}>{sel.stock}</div>
                    <div style={{ fontSize: 10, color: C.sub }}>{sel.date}</div>
                  </div>
                  <div style={{ background: AB[sel.accuracy], border: `1px solid ${C.bd}`, padding: "4px 10px", borderRadius: 20, fontSize: 11, color: AC[sel.accuracy] }}>
                    {sel.accuracy} {AL[sel.accuracy]}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {sel.buyTime && <div style={{ background: C.sf2, borderRadius: 6, padding: "4px 10px", fontSize: 10, color: C.bl }}>📈 買入 {sel.buyTime}</div>}
                  {sel.sellTime && <div style={{ background: C.sf2, borderRadius: 6, padding: "4px 10px", fontSize: 10, color: "#ff9f0a" }}>📉 賣出 {sel.sellTime}</div>}
                </div>
                {[["📈 進場原因", sel.entryReason], ["📉 出場原因", sel.exitReason], ["📝 檢討筆記", sel.note]].map(([label, value], i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: C.sub, marginBottom: 4 }}>{label}</div>
                    <div style={{ background: C.sf2, borderRadius: 8, padding: 10, fontSize: 12, color: C.tx, lineHeight: 1.7 }}>{value}</div>
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
                  {[
                    ["買入價", sel.buyPrice ? `${sel.buyPrice}元` : "—", C.tx],
                    ["賣出價", sel.sellPrice ? `${sel.sellPrice}元` : "待出場", C.tx],
                    ["損益", pt(sel.pnl), pc(sel.pnl)],
                  ].map(([label, value, color], i) => (
                    <div key={i} style={{ background: C.sf2, borderRadius: 8, padding: 10, textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: C.sub }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </Box>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 10, color: C.sub, letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>全部紀錄（{allTrades.length}筆）</div>
              {[...allTrades].reverse().map(t => (
                <Box key={t.id} style={{ padding: 12, marginBottom: 8, cursor: "pointer" }} onClick={() => setSel(t)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{t.stock}</span>
                        <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 10, background: C.sf2, color: t.status === "open" ? "#ffaa00" : C.sub }}>
                          {t.status === "open" ? "持有中" : "已結"}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: C.sub, marginTop: 2 }}>
                        {t.date}
                        {t.buyTime && <span style={{ marginLeft: 6, color: C.bl }}>⏱{t.buyTime}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: pc(t.pnl) }}>{pt(t.pnl)}</div>
                      <div style={{ fontSize: 11 }}>{t.accuracy}</div>
                    </div>
                  </div>
                </Box>
              ))}
            </div>
          )}
        </>}

        {tab === "review" && <>
          <div style={{ fontSize: 10, color: C.sub, letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>分析回顧</div>
          <Box style={{ padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: C.ac, marginBottom: 12 }}>準確率分析</div>
            {[["✅","準確","#ff4d4d"],["⚠️","部分準確","#ffaa00"],["❌","錯誤","#4dff88"]].map(([acc, label, color]) => {
              const count = closed.filter(t => t.accuracy === acc).length;
              const pct = closed.length ? Math.round(count / closed.length * 100) : 0;
              return (
                <div key={acc} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11 }}>{acc} {label}</span>
                    <span style={{ fontSize: 11, color: C.sub }}>{count}筆 {pct}%</span>
                  </div>
                  <div style={{ background: C.sf2, borderRadius: 4, height: 6 }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: color }} />
                  </div>
                </div>
              );
            })}
          </Box>

          <Box style={{ padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: C.ac, marginBottom: 10 }}>⏱ 成交時間分析</div>
            {[
              ["09:10 開盤", "最佳時段，零股集中撮合，流動性最高", "#1a2e1a", "#2a4a2a", "#ff4d4d"],
              ["09:10~11:30 上午盤", "可接受，流動性正常", C.sf2, C.bd, C.tx],
              ["13:00+ 下午盤", "流動性極差，停損務必在上午執行", "#2e0a0a", "#4a2a2a", "#4dff88"],
            ].map(([label, desc, bg, border, color], i) => (
              <div key={i} style={{ padding: "8px 10px", borderRadius: 8, marginBottom: 6, background: bg, border: `1px solid ${border}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color }}>{label}</div>
                <div style={{ fontSize: 10, color: C.sub, marginTop: 2 }}>{desc}</div>
              </div>
            ))}
          </Box>

          {[
            { title: "✅ 有效策略", color: "#ff4d4d", items: ["外資連續買超為主要進場訊號", "分批出場確保成交率", "開盤09:10前掛好，集中撮合效率最高", "五檔買賣盤即時調整掛單價", "ADR+籌碼+技術三重確認進場更可靠", "不同族群不套用同一訊號（金融股≠半導體）"] },
            { title: "⚠️ 需要改進", color: "#ffaa00", items: ["陽明68元進場成本過高，本期最大虧損-13,014元", "力積電進場原因薄弱，基本面虧損未評估", "目標價勿設太高，寧可保守快出提高周轉率", "下午盤停損應在上午執行", "籌碼惡化初期應更果斷停損", "富喬等標的需每日固定追蹤籌碼變化"] },
          ].map((section, i) => (
            <Box key={i} style={{ padding: 14, marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: section.color, marginBottom: 10 }}>{section.title}</div>
              {section.items.map((item, j) => (
                <div key={j} style={{ fontSize: 11, color: C.tx, padding: "7px 0", borderBottom: j < section.items.length - 1 ? `1px solid ${C.bd}` : "none" }}>• {item}</div>
              ))}
            </Box>
          ))}
        </>}
      </div>
    </div>
  );
}
