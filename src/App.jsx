import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const SUPABASE_URL = "https://iptpynpbgktwzvgnbvcx.supabase.co";
const SUPABASE_KEY = "sb_publishable_7gVjYC98eAk664wHt_eUBQ_bvtfv5ee";

const AL = { "✅": "準確", "⚠️": "部分準確", "❌": "錯誤", "🔄": "進行中" };
const AB = { "✅": "#1a2e1a", "⚠️": "#2e2000", "❌": "#2e0a0a", "🔄": "#0a1e2e" };
const AC = { "✅": "#ff4d4d", "⚠️": "#ffaa00", "❌": "#4dff88", "🔄": "#5ac8fa" };
const pc = v => v > 0 ? "#ff4d4d" : v < 0 ? "#4dff88" : "#8e8e93";
const pt = v => `${v > 0 ? "+" : ""}${v.toLocaleString()}`;
const C = { bg: "#1c1c1e", sf: "#2c2c2e", sf2: "#3a3a3c", bd: "#48484a", tx: "#e5e5ea", sub: "#8e8e93", ac: "#c0c0c0", bl: "#5ac8fa" };

// 只讀取，不寫回（避免 INITIAL_TRADES bug）
async function fetchTrades() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/trades?order=date.desc,id.desc`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      }
    });
    if (!res.ok) {
      console.error("Supabase 回應錯誤", res.status);
      return { ok: false, error: `HTTP ${res.status}`, data: [] };
    }
    const data = await res.json();
    if (!data || !Array.isArray(data)) {
      return { ok: false, error: "資料格式錯誤", data: [] };
    }
    return {
      ok: true,
      error: null,
      data: data.map(t => ({
        id: t.id, date: t.date, stock: t.stock,
        buyPrice: t.buy_price, sellPrice: t.sell_price, shares: t.shares,
        buyTime: t.buy_time, sellTime: t.sell_time,
        pnl: t.pnl, status: t.status,
        entryReason: t.entry_reason, exitReason: t.exit_reason,
        accuracy: t.accuracy, note: t.note
      }))
    };
  } catch (e) {
    console.error("fetchTrades 例外:", e);
    return { ok: false, error: e.message, data: [] };
  }
}

export default function TradingJournal() {
  const [trades, setTrades] = useState([]); // ✅ 不再用 INITIAL_TRADES 預填
  const [tab, setTab] = useState("dashboard");
  const [sel, setSel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState("⏳ 載入中...");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await fetchTrades();
      if (result.ok) {
        setTrades(result.data);
        setDbStatus(`✅ 已連線 Supabase（${result.data.length} 筆）`);
      } else {
        setTrades([]);
        setDbStatus(`❌ 載入失敗：${result.error}`);
      }
      setLoading(false);
    })();
  }, []);

  // ✅ 不再寫 useEffect 自動寫回 Supabase（避免 DELETE 災難）
  // 新增/編輯交易要走獨立按鈕，未來再加

  // 自動補 accuracy 預設值（資料庫沒填的情況下）
  const allTrades = trades
    .filter(t => t.pnl !== 0 || t.status === "open")
    .map(t => ({
      ...t,
      accuracy: t.accuracy || (t.status === "open" ? "🔄" : (t.pnl > 0 ? "✅" : t.pnl < 0 ? "❌" : "⚠️")),
      note: t.note || "",
      entryReason: t.entryReason || "—",
      exitReason: t.exitReason || "—"
    }));
  const closed = allTrades.filter(t => t.status === "closed");
  const open = allTrades.filter(t => t.status === "open");
  const realized = closed.reduce((s, t) => s + (t.pnl || 0), 0);
  const unrealized = open.reduce((s, t) => s + (t.pnl || 0), 0);
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

  if (loading) {
    return (
      <div style={{ fontFamily: "-apple-system,sans-serif", background: C.bg, minHeight: "100vh", color: C.tx, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, color: C.ac, marginBottom: 8 }}>⏳ 載入中...</div>
          <div style={{ fontSize: 11, color: C.sub }}>{dbStatus}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "-apple-system,sans-serif", background: C.bg, minHeight: "100vh", color: C.tx }}>
      <div style={{ background: C.sf, borderBottom: `1px solid ${C.bd}`, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: C.sub, letterSpacing: 2, textTransform: "uppercase" }}>Ryan · 零股交易</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.ac }}>交易日誌</div>
          <div style={{ fontSize: 9, color: dbStatus.startsWith("✅") ? "#4dff88" : "#ff4d4d", marginTop: 2 }}>{dbStatus}</div>
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

          {trades.length === 0 && (
            <Box style={{ padding: 20, textAlign: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: C.sub }}>📭 目前沒有交易紀錄</div>
              <div style={{ fontSize: 10, color: C.sub, marginTop: 4 }}>請從 Supabase SQL Editor 匯入資料</div>
            </Box>
          )}

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

          {open.length > 0 && <>
            <div style={{ fontSize: 10, color: C.sub, letterSpacing: 2, marginBottom: 8, textTransform: "uppercase" }}>持有中（{open.length}）</div>
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
                {t.exitReason && t.exitReason !== "—" && (
                  <div style={{ fontSize: 10, color: C.sub, marginTop: 8, borderTop: `1px solid ${C.bd}`, paddingTop: 6 }}>🎯 {t.exitReason}</div>
                )}
              </Box>
            ))}
          </>}

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
              {(() => {
                const idx = allTrades.findIndex(t => t.id === sel.id);
                const prev = idx > 0 ? allTrades[idx - 1] : null;
                const next = idx < allTrades.length - 1 ? allTrades[idx + 1] : null;
                return (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 6 }}>
                    <button onClick={() => prev && setSel(prev)} disabled={!prev}
                      style={{
                        background: prev ? C.sf2 : C.sf, border: `1px solid ${C.bd}`,
                        color: prev ? C.tx : C.sub, padding: "6px 10px", borderRadius: 8,
                        cursor: prev ? "pointer" : "not-allowed", fontSize: 11, opacity: prev ? 1 : 0.4
                      }}>← 上一筆</button>

                    <button onClick={() => setSel(null)}
                      style={{ background: C.sf2, border: `1px solid ${C.bd}`, color: C.sub,
                        padding: "6px 10px", borderRadius: 8, cursor: "pointer", fontSize: 11 }}>
                      返回列表（{idx + 1}/{allTrades.length}）
                    </button>

                    <button onClick={() => next && setSel(next)} disabled={!next}
                      style={{
                        background: next ? C.sf2 : C.sf, border: `1px solid ${C.bd}`,
                        color: next ? C.tx : C.sub, padding: "6px 10px", borderRadius: 8,
                        cursor: next ? "pointer" : "not-allowed", fontSize: 11, opacity: next ? 1 : 0.4
                      }}>下一筆 →</button>
                  </div>
                );
              })()}
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
                    <div style={{ background: C.sf2, borderRadius: 8, padding: 10, fontSize: 12, color: C.tx, lineHeight: 1.7 }}>{value || "—"}</div>
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
              {allTrades.length === 0 ? (
                <Box style={{ padding: 20, textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: C.sub }}>📭 沒有交易紀錄</div>
                </Box>
              ) : (
                allTrades.map(t => (
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
                ))
              )}
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
