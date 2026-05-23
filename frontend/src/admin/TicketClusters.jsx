import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { getClusters, getTickets, triggerAgent2, getConfig, notifyItTeam } from '../api/mesa'

const TC_FILTERS = ["All", "Edify", "Banner", "Canvas", "OneDrive", "Workday"];

// ---------- shared style atoms ----------
function StatChip({ label, value, tone }) {
  const tones = {
    primary: { border: "var(--blaster-blue)", value: "var(--dark-blue)" },
    warn:    { border: "var(--golden-tech)",  value: "#7A5B00"           },
    success: { border: "var(--mines-green)",  value: "#3F7A1A"           },
  };
  const t = tones[tone || "primary"];
  return (
    <div
      className="bg-white"
      style={{
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${t.border}`,
        borderRadius: 6,
        padding: "10px 16px",
        display: "flex", alignItems: "baseline", gap: 10,
        boxShadow: "0 1px 2px rgba(33,49,77,0.04)",
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: 10.5, color: "var(--silver)", fontFamily: "Montserrat", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
        {label}
      </span>
      <span className="mono" style={{ fontSize: 16, color: t.value, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function SystemPill({ name, size }) {
  const small = size === "sm";
  return (
    <span style={{
      display: "inline-block",
      background: "var(--dark-blue)", color: "#fff",
      fontFamily: "Montserrat", fontWeight: 600,
      fontSize: small ? 10 : 11,
      letterSpacing: "0.06em",
      padding: small ? "2px 8px" : "4px 10px",
      borderRadius: 4,
      textTransform: "uppercase",
    }}>{name}</span>
  );
}

function SeverityPill({ s }) {
  const map = ({
    high:   { bg: "rgba(204,70,40,0.12)", border: "rgba(204,70,40,0.45)", color: "var(--colorado-red)" },
    medium: { bg: "rgba(241,185,26,0.18)", border: "rgba(241,185,26,0.5)", color: "#7A5B00"              },
    low:    { bg: "rgba(135,158,195,0.22)", border: "rgba(135,158,195,0.5)", color: "var(--blaster-blue)" },
  })[s] || { bg: "rgba(135,158,195,0.22)", border: "rgba(135,158,195,0.5)", color: "var(--blaster-blue)" };
  return (
    <span style={{
      background: map.bg, color: map.color, border: `1px solid ${map.border}`,
      fontSize: 10.5, fontWeight: 700, fontFamily: "Montserrat",
      padding: "2px 9px", borderRadius: 999, letterSpacing: "0.08em", textTransform: "uppercase",
    }}>{s}</span>
  );
}

// ---------- cluster row ----------
function ClusterTableRow({ c, threshold, onTrigger }) {
  const [hover, setHover] = useState(false);
  const aboveThreshold = c.count >= threshold;
  const barColor = aboveThreshold ? "var(--golden-tech)" : "var(--light-blue)";
  const pct = Math.min(100, Math.round((c.count / c.max) * 100));

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="grid items-center gap-4 px-5 py-3.5"
      style={{
        gridTemplateColumns: "44px 110px 1fr 80px 220px 150px 180px",
        background: hover ? "var(--pale-blue)" : "transparent",
        borderTop: "1px solid var(--border)",
        transition: "background 0.15s",
      }}
    >
      <div className="mono" style={{ fontSize: 12, color: "var(--silver)", fontWeight: 500 }}>#{c.rank}</div>
      <div><SystemPill name={c.system} /></div>
      <div style={{ fontSize: 13.5, color: "var(--dark-blue)" }}>{c.topic}</div>
      <div className="mono" style={{ fontSize: 15, color: "var(--dark-blue)", fontWeight: 600 }}>
        {c.count}<span style={{ color: "var(--silver)", fontSize: 11, fontWeight: 400 }}> /{c.max}</span>
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ height: 8, background: "var(--pale-blue)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ height: "100%", width: pct + "%", background: barColor, borderRadius: 999, transition: "width 0.3s" }}></div>
        </div>
        <div style={{
          position: "absolute",
          left: `${Math.min(98, (threshold / c.max) * 100)}%`,
          top: -3, bottom: -3, width: 2, background: "var(--colorado-red)", opacity: 0.6,
        }} title="Threshold"></div>
      </div>
      <div>
        {aboveThreshold ? (
          <span style={{
            background: "transparent", border: "1.5px solid var(--colorado-red)",
            color: "var(--colorado-red)", fontFamily: "Montserrat", fontWeight: 700,
            fontSize: 10.5, letterSpacing: "0.08em",
            padding: "3px 10px", borderRadius: 999, textTransform: "uppercase",
          }}>Above Threshold</span>
        ) : (
          <span style={{
            background: "rgba(135,158,195,0.18)", color: "var(--dark-gray)",
            fontFamily: "Montserrat", fontWeight: 700,
            fontSize: 10.5, letterSpacing: "0.08em",
            padding: "3px 10px", borderRadius: 999, textTransform: "uppercase",
            border: "1px solid var(--border)",
          }}>Below Threshold</span>
        )}
      </div>
      <div>
        {c.agent2_triggered ? (
          <span style={{ color: "#3F7A1A", fontFamily: "Montserrat", fontWeight: 700, fontSize: 12, letterSpacing: "0.04em" }}>
            Agent 2 Active ✓
          </span>
        ) : c.it_notified ? (
          <span style={{ color: "#3F7A1A", fontFamily: "Montserrat", fontWeight: 700, fontSize: 12, letterSpacing: "0.04em" }}>
            IT Notified ✓
          </span>
        ) : c.dict_eligible ? (
          <button
            onClick={() => triggerAgent2(c.id).then(onTrigger)}
            style={{
              background: "transparent", color: "var(--dark-blue)",
              border: "1.5px solid var(--golden-tech)",
              fontFamily: "Montserrat", fontWeight: 700, fontSize: 11.5,
              padding: "5px 11px", borderRadius: 999,
              cursor: "pointer", letterSpacing: "0.02em",
            }}>▶ Trigger Agent 2</button>
        ) : c.threshold_hit ? (
          <button
            onClick={() => notifyItTeam(c.id).then(onTrigger)}
            style={{
              background: "transparent", color: "var(--colorado-red)",
              border: "1.5px solid var(--colorado-red)",
              fontFamily: "Montserrat", fontWeight: 700, fontSize: 11.5,
              padding: "5px 11px", borderRadius: 999,
              cursor: "pointer", letterSpacing: "0.02em",
            }}>✉ Notify IT Team</button>
        ) : (
          <span style={{ fontSize: 11, color: "var(--silver)" }}>—</span>
        )}
      </div>
    </div>
  );
}

function TicketRow({ t, idx }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="grid items-center gap-4 px-5 py-3"
      style={{
        gridTemplateColumns: "80px 120px 1fr 110px 160px 140px",
        background: hover ? "var(--pale-blue)" : "transparent",
        borderTop: "1px solid var(--border)",
        transition: "background 0.15s",
      }}
    >
      <div className="mono" style={{ fontSize: 12.5, color: "var(--dark-blue)", fontWeight: 500 }}>
        #{String(t.id).padStart(3, "0")}
      </div>
      <div><SystemPill name={t.system} size="sm" /></div>
      <div style={{ fontSize: 13, color: "var(--dark-blue)" }}>{t.category}</div>
      <div><SeverityPill s={t.severity} /></div>
      <div>
        {t.auto_resolved ? (
          <span style={{
            background: "rgba(128,195,66,0.16)", color: "#3F7A1A",
            border: "1px solid rgba(128,195,66,0.4)",
            fontSize: 11, fontWeight: 700, fontFamily: "Montserrat",
            padding: "3px 10px", borderRadius: 999, letterSpacing: "0.04em",
          }}>Auto-Resolved</span>
        ) : (
          <span style={{
            background: "rgba(241,185,26,0.18)", color: "#7A5B00",
            border: "1px solid rgba(241,185,26,0.5)",
            fontSize: 11, fontWeight: 700, fontFamily: "Montserrat",
            padding: "3px 10px", borderRadius: 999, letterSpacing: "0.04em",
          }}>Escalated</span>
        )}
      </div>
      <div className="mono" style={{ fontSize: 11.5, color: "var(--silver)" }}>{t.submitted}</div>
    </div>
  );
}

function TableHeader({ cols, gridTemplate }) {
  return (
    <div
      className="grid gap-4 px-5 py-2.5"
      style={{
        gridTemplateColumns: gridTemplate,
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        borderTop: "1px solid var(--border)",
      }}
    >
      {cols.map((c, i) => (
        <div key={i} style={{
          fontSize: 10.5, color: "var(--silver)", fontFamily: "Montserrat", fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase",
        }}>{c}</div>
      ))}
    </div>
  );
}

function TicketClusters() {
  const PAGE_SIZE = 20;
  const [threshold, setThreshold] = useState(5);
  const [activeFilter, setActiveFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [clusters, setClusters] = useState(null);
  const [tickets, setTickets] = useState(null);

  const load = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([getClusters(), getTickets()])
      setClusters(c.map((cl, i) => ({ ...cl, rank: i + 1, max: Math.max(...c.map(x => x.count), 1) })))
      setTickets(t.map(tk => ({
        ...tk,
        system: tk.system_affected || tk.system || "Unknown",
        submitted: tk.created_at ? new Date(tk.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "—",
      })))
    } catch {}
  }, [])

  useEffect(() => {
    getConfig().then(cfg => setThreshold(cfg.cluster_threshold)).catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [load])

  const filtered = useMemo(() => {
    if (!tickets) return null;
    return activeFilter === "All" ? tickets : tickets.filter((t) => t.system === activeFilter);
  }, [activeFilter, tickets]);

  const totalPages = filtered ? Math.ceil(filtered.length / PAGE_SIZE) : 0;
  const paginated = filtered ? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : [];

  const aboveCount = clusters ? clusters.filter((c) => c.count >= threshold).length : null;
  const autoResolvedPct = tickets
    ? Math.round(tickets.filter(t => t.auto_resolved).length / tickets.length * 100)
    : null;

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      {/* Page header */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h2 style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 22, color: "var(--dark-blue)" }}>
            Ticket Cluster Analytics
          </h2>
          <p style={{ fontSize: 13, color: "var(--dark-gray)", marginTop: 6, maxWidth: 640, lineHeight: 1.5 }}>
            Pattern detection identifies systemic issues from ticket volume. Clusters above the trigger threshold can be escalated to Agent 2 for automated triage.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <StatChip label="Total Tickets"   value={tickets ? tickets.length : "—"}                          tone="primary" />
          <StatChip label="Above Threshold" value={aboveCount !== null ? `${aboveCount} clusters` : "—"}   tone="warn" />
          <StatChip label="Auto-Resolved"   value={autoResolvedPct !== null ? `${autoResolvedPct}%` : "—"} tone="success" />
        </div>
      </div>

      {/* Clusters card */}
      <section
        className="bg-white"
        style={{
          border: "1px solid var(--border)", borderRadius: 8,
          boxShadow: "0 1px 2px rgba(33,49,77,0.04), 0 4px 12px rgba(33,49,77,0.04)",
          overflow: "hidden",
        }}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h3 style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 16, color: "var(--dark-blue)" }}>
              Cluster Analytics
            </h3>
            <div style={{ fontSize: 11.5, color: "var(--silver)", marginTop: 2 }}>
              Top 5 cluster topics · last 24h
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label style={{ fontSize: 12, color: "var(--dark-gray)", fontWeight: 600 }}>Trigger Threshold:</label>
            <input
              type="number" min="1" max="50"
              value={threshold}
              onChange={(e) => setThreshold(Math.max(1, Number(e.target.value) || 1))}
              className="mono"
              style={{
                width: 64, padding: "6px 10px",
                border: "1px solid var(--border)", borderRadius: 6,
                fontSize: 13, color: "var(--dark-blue)",
                background: "var(--surface)", textAlign: "center", outline: "none",
              }}
            />
          </div>
        </div>
        <TableHeader
          cols={["#", "System", "Cluster Topic", "Volume", "Distribution", "Status", "Action"]}
          gridTemplate="44px 110px 1fr 80px 220px 150px 180px"
        />
        <div>
          {clusters === null
            ? <div style={{ padding: "28px", textAlign: "center", color: "var(--silver)", fontSize: 13 }}>Loading clusters…</div>
            : clusters.map((c) => <ClusterTableRow key={c.id} c={c} threshold={threshold} onTrigger={load} />)
          }
        </div>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ fontSize: 11.5, color: "var(--silver)" }}>
            <span style={{ display: "inline-block", width: 8, height: 2, background: "var(--colorado-red)", verticalAlign: "middle", marginRight: 6 }}></span>
            Red marker indicates current threshold ({threshold} tickets)
          </div>
          <div style={{ fontSize: 11.5, color: "var(--dark-gray)" }}>
            APScheduler sweep · 60s interval
          </div>
        </div>
      </section>

      {/* All tickets */}
      <section
        className="bg-white"
        style={{
          border: "1px solid var(--border)", borderRadius: 8,
          boxShadow: "0 1px 2px rgba(33,49,77,0.04), 0 4px 12px rgba(33,49,77,0.04)",
          overflow: "hidden",
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 gap-4 flex-wrap">
          <div>
            <h3 style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 16, color: "var(--dark-blue)" }}>
              All Tickets
            </h3>
            <div style={{ fontSize: 11.5, color: "var(--silver)", marginTop: 2 }}>
              Filter by source system
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {TC_FILTERS.map((f) => {
              const active = activeFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => { setActiveFilter(f); setPage(1); }}
                  style={{
                    background: active ? "var(--blaster-blue)" : "#fff",
                    color: active ? "#fff" : "var(--dark-blue)",
                    border: active ? "1px solid var(--blaster-blue)" : "1px solid var(--border)",
                    fontFamily: "Montserrat", fontWeight: 600, fontSize: 12,
                    padding: "5px 12px", borderRadius: 999, cursor: "pointer",
                    transition: "all 0.15s",
                    letterSpacing: "0.02em",
                  }}
                >{f}</button>
              );
            })}
          </div>
        </div>
        <TableHeader
          cols={["ID", "System", "Category", "Severity", "Status", "Submitted"]}
          gridTemplate="80px 120px 1fr 110px 160px 140px"
        />
        <div>
          {tickets === null ? (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--silver)", fontSize: 13 }}>
              Loading tickets…
            </div>
          ) : paginated.length === 0 ? (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--silver)", fontSize: 13 }}>
              No tickets match this filter.
            </div>
          ) : (
            paginated.map((t, i) => <TicketRow key={t.id} t={t} idx={i} />)
          )}
        </div>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ fontSize: 11.5, color: "var(--silver)" }}>
            Showing <span className="mono" style={{ color: "var(--dark-gray)" }}>{!filtered || filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered?.length ?? 0)}</span> of <span className="mono" style={{ color: "var(--dark-gray)" }}>{filtered?.length ?? 0}</span> tickets
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                background: "#fff", color: page === 1 ? "var(--silver)" : "var(--dark-gray)",
                border: "1px solid var(--border)",
                fontFamily: "Montserrat", fontWeight: 600, fontSize: 12,
                padding: "5px 12px", borderRadius: 6,
                cursor: page === 1 ? "default" : "pointer",
                opacity: page === 1 ? 0.5 : 1,
              }}>← Prev</button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                background: page >= totalPages ? "var(--silver)" : "var(--blaster-blue)", color: "#fff",
                border: `1px solid ${page >= totalPages ? "var(--silver)" : "var(--blaster-blue)"}`,
                fontFamily: "Montserrat", fontWeight: 600, fontSize: 12,
                padding: "5px 12px", borderRadius: 6,
                cursor: page >= totalPages ? "default" : "pointer",
                opacity: page >= totalPages ? 0.5 : 1,
              }}>Next →</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default TicketClusters
