import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { getClusters, getTickets, getConfig, getClusterTickets, getClusterEvents } from '../api/mesa'

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

const TICKET_STATUS_STYLE = {
  ai_responded:  { label: "AI Responded",  bg: "rgba(128,195,66,0.16)",   color: "#3F7A1A", border: "rgba(128,195,66,0.4)"   },
  resolved:      { label: "Resolved",      bg: "rgba(9,57,108,0.12)",     color: "#09396C", border: "rgba(9,57,108,0.3)"     },
  auto_resolved: { label: "Auto-Resolved", bg: "rgba(128,195,66,0.16)",   color: "#3F7A1A", border: "rgba(128,195,66,0.4)"   },
  escalated:     { label: "Escalated",     bg: "rgba(241,185,26,0.18)",   color: "#7A5B00", border: "rgba(241,185,26,0.5)"   },
  open:          { label: "Open",          bg: "rgba(135,158,195,0.18)",  color: "#4A5568", border: "rgba(135,158,195,0.5)"  },
};

const EVENT_LABELS = {
  activated:     { label: "Cluster Activated",   color: "var(--blaster-blue)" },
  threshold_hit: { label: "Threshold Reached",   color: "var(--colorado-red)" },
  healed:        { label: "Cluster Healed",       color: "var(--mines-green)"  },
  reactivated:   { label: "Issue Reactivated",    color: "#D97706"             },
};

function ClusterDrillDown({ cluster, onRefresh }) {
  const [tab, setTab] = useState("tickets");
  const [tickets, setTickets] = useState(null);
  const [events, setEvents] = useState(null);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    setLoadingTickets(true);
    getClusterTickets(cluster.id).then(setTickets).finally(() => setLoadingTickets(false));
  }, [cluster.id]);

  useEffect(() => {
    if (tab !== "history") return;
    setLoadingEvents(true);
    getClusterEvents(cluster.id).then(setEvents).finally(() => setLoadingEvents(false));
  }, [tab, cluster.id]);

  return (
    <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      {/* Tab bar */}
      <div className="flex" style={{ paddingLeft: 50, borderBottom: "1px solid var(--border)" }}>
        {["tickets", "history"].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "8px 16px 7px",
              fontSize: 11, fontWeight: 700, fontFamily: "Montserrat",
              letterSpacing: "0.08em", textTransform: "uppercase",
              color: tab === t ? "var(--dark-blue)" : "var(--silver)",
              borderBottom: tab === t ? "2px solid var(--blaster-blue)" : "2px solid transparent",
            }}
          >{t}</button>
        ))}
      </div>

      {/* Tickets tab */}
      {tab === "tickets" && (
        loadingTickets
          ? <div style={{ padding: "16px 50px", color: "var(--silver)", fontSize: 12 }}>Loading tickets...</div>
          : !tickets || tickets.length === 0
          ? <div style={{ padding: "16px 50px", color: "var(--silver)", fontSize: 12 }}>No tickets found for this cluster.</div>
          : tickets.map(t => (
              <div key={t.id} className="grid items-start gap-4 py-3" style={{ gridTemplateColumns: "80px 1fr 140px 110px 160px 140px", paddingLeft: 50, paddingRight: 20 }}>
                <div className="mono" style={{ fontSize: 12, color: "var(--silver)", paddingTop: 2 }}>#{String(t.id).padStart(3, "0")}</div>
                <div style={{ fontSize: 13, color: "var(--dark-blue)", lineHeight: 1.4, paddingRight: 20 }}>{t.text}</div>
                <div style={{ fontSize: 12, color: "var(--silver)", paddingTop: 2 }}>{t.category}</div>
                <div style={{ paddingTop: 2 }}><SeverityPill s={t.severity} /></div>
                <div style={{ paddingTop: 2 }}>
                  <span style={{
                    background: (TICKET_STATUS_STYLE[t.status] || TICKET_STATUS_STYLE.open).bg,
                    color: (TICKET_STATUS_STYLE[t.status] || TICKET_STATUS_STYLE.open).color,
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                  }}>{(TICKET_STATUS_STYLE[t.status] || TICKET_STATUS_STYLE.open).label}</span>
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--silver)", paddingTop: 4 }}>
                  {t.created_at ? new Date(t.created_at).toLocaleDateString() : "-"}
                </div>
              </div>
            ))
      )}

      {/* History tab */}
      {tab === "history" && (
        loadingEvents
          ? <div style={{ padding: "16px 50px", color: "var(--silver)", fontSize: 12 }}>Loading history...</div>
          : !events || events.length === 0
          ? <div style={{ padding: "16px 50px", color: "var(--silver)", fontSize: 12 }}>No events recorded yet.</div>
          : (
            <div style={{ padding: "12px 20px 12px 50px" }}>
              {events.map((e, i) => {
                const cfg = EVENT_LABELS[e.event_type] || { label: e.event_type, color: "var(--silver)" };
                return (
                  <div key={e.id} className="flex items-start gap-3" style={{ marginBottom: i < events.length - 1 ? 14 : 0 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: cfg.color, marginTop: 3, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: cfg.color, fontFamily: "Montserrat" }}>{cfg.label}</div>
                      <div style={{ fontSize: 11.5, color: "var(--dark-gray)", marginTop: 1 }}>
                        {e.ticket_count !== null && <span>Active tickets: <span className="mono">{e.ticket_count}</span> · </span>}
                        {e.cumulative_count !== null && <span>Lifetime total: <span className="mono">{e.cumulative_count}</span> · </span>}
                        <span className="mono">{e.created_at ? new Date(e.created_at).toLocaleString() : "-"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
      )}
    </div>
  );
}

// ---------- cluster row ----------
function ClusterTableRow({ c, threshold, isExpanded, onToggle, onRefresh }) {
  const [hover, setHover] = useState(false);

  // Badge based on backend state + threshold_hit flag (not frontend count comparison)
  const stateConfig = c.state === "healed"
    ? { bar: "var(--mines-green)",   badge: "Healed",           badgeColor: "var(--mines-green)",  rowBg: "rgba(128,195,66,0.05)"  }
    : c.threshold_hit
    ? { bar: "var(--golden-tech)",   badge: "Above Threshold",  badgeColor: "var(--colorado-red)", rowBg: "rgba(204,70,40,0.03)"   }
    : { bar: "var(--light-blue)",    badge: "Emerging",         badgeColor: "var(--dark-gray)",    rowBg: "transparent"            };

  const pct = Math.min(100, Math.round((c.count / c.max) * 100));

  return (
    <>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={onToggle}
        className="grid items-center gap-4 px-5 py-3.5"
        style={{
          gridTemplateColumns: "44px 110px 1fr 80px 220px 150px",
          background: isExpanded ? "var(--pale-blue)" : (hover ? "rgba(135,158,195,0.08)" : stateConfig.rowBg),
          borderTop: "1px solid var(--border)",
          transition: "background 0.15s",
          cursor: "pointer",
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 10, color: "var(--silver)", transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>{">"}</span>
          <div className="mono" style={{ fontSize: 12, color: "var(--silver)", fontWeight: 500 }}>#{c.rank}</div>
        </div>
        <div><SystemPill name={c.system} /></div>
        <div style={{ fontSize: 13.5, color: "var(--dark-blue)", fontWeight: isExpanded ? 600 : 400 }}>
          {c.topic}
          {c.state === "healed" && c.healed_at && (
            <span style={{ fontSize: 10, color: "var(--mines-green)", marginLeft: 8, fontWeight: 500 }}>
              (Healed {new Date(c.healed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
            </span>
          )}
        </div>
        <div className="mono" style={{ fontSize: 15, color: "var(--dark-blue)", fontWeight: 600 }}>
          {c.count}<span style={{ color: "var(--silver)", fontSize: 11, fontWeight: 400 }}> /{c.max}</span>
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ height: 8, background: "var(--pale-blue)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: pct + "%", background: stateConfig.bar, borderRadius: 999, transition: "width 0.3s" }}></div>
          </div>
          {c.state === "active" && (
            <div style={{
              position: "absolute",
              left: `${Math.min(98, (threshold / c.max) * 100)}%`,
              top: -3, bottom: -3, width: 2, background: "var(--colorado-red)", opacity: 0.6,
            }} title="Threshold"></div>
          )}
        </div>
        <div>
          <span style={{
            background: "transparent", border: `1.5px solid ${stateConfig.badgeColor}`,
            color: stateConfig.badgeColor, fontFamily: "Montserrat", fontWeight: 700,
            fontSize: 10.5, letterSpacing: "0.06em",
            padding: "3px 10px", borderRadius: 999, textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}>{stateConfig.badge}</span>
        </div>
      </div>
      {isExpanded && <ClusterDrillDown cluster={c} onRefresh={onRefresh} />}
    </>
  );
}

function TicketRow({ t, idx }) {
  const [hover, setHover] = useState(false);
  const s = TICKET_STATUS_STYLE[t.status] || TICKET_STATUS_STYLE.open;
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
        <span style={{
          background: s.bg, color: s.color,
          border: `1px solid ${s.border}`,
          fontSize: 11, fontWeight: 700, fontFamily: "Montserrat",
          padding: "3px 10px", borderRadius: 999, letterSpacing: "0.04em",
        }}>{s.label}</span>
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
  const [expandedClusterId, setExpandedClusterId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([getClusters(), getTickets()])
      // Split by state
      const activeClusters = c.filter(x => x.state !== "healed");
      const healedClusters = c.filter(x => x.state === "healed");
      
      const maxVal = Math.max(...c.map(x => x.count), 1);
      
      setClusters({
        active: activeClusters.map((cl, i) => ({ ...cl, rank: i + 1, max: maxVal })),
        healed: healedClusters.map((cl, i) => ({ ...cl, rank: activeClusters.length + i + 1, max: maxVal }))
      })

      setTickets(t.map(tk => ({
        ...tk,
        system: tk.system_affected || tk.system || "Unknown",
        submitted: tk.created_at ? new Date(tk.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "-",
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

  // Robustly handle clusters state to prevent HMR crashes if it's still an array from old code
  const safeClusters = clusters && !Array.isArray(clusters) ? clusters : { active: Array.isArray(clusters) ? clusters : [], healed: [] };

  const aboveCount = safeClusters.active.filter((c) => c.threshold_hit).length;
  const autoResolvedPct = tickets && tickets.length > 0
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
            Pattern detection identifies recurring complaints and requests from ticket volume. Clusters crossing the threshold indicate a systemic issue requiring attention.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <StatChip label="Total Tickets"   value={tickets ? tickets.length : "-"}                          tone="primary" />
          <StatChip label="Above Threshold" value={clusters ? `${aboveCount} clusters` : "-"}   tone="warn" />
          <StatChip label="Auto-Resolved"   value={autoResolvedPct !== null ? `${autoResolvedPct}%` : "-"} tone="success" />
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
              Active crises & historical resolutions · Slide down to heal
            </div>
          </div>
          <div className="flex items-center gap-2" style={{ padding: "5px 12px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface)" }}>
            <span style={{ fontSize: 11, color: "var(--silver)", fontFamily: "Montserrat", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Threshold</span>
            <span className="mono" style={{ fontSize: 14, color: "var(--dark-blue)", fontWeight: 700 }}>{threshold}</span>
            <span style={{ fontSize: 10, color: "var(--silver)" }}>(set in .env)</span>
          </div>
        </div>
        <TableHeader
          cols={["#", "System", "Cluster Topic", "Volume", "Distribution", "Status"]}
          gridTemplate="44px 110px 1fr 80px 220px 150px"
        />
        <div>
          {clusters === null
            ? <div style={{ padding: "28px", textAlign: "center", color: "var(--silver)", fontSize: 13 }}>Loading clusters...</div>
            : (
              <>
                {/* Active Section */}
                <div style={{ padding: "10px 20px", background: "rgba(33,49,77,0.02)", fontSize: 11, fontWeight: 700, color: "var(--silver)", textTransform: "uppercase" }}>Active Crises & Emerging Patterns</div>
                {safeClusters.active.length === 0 && <div style={{ padding: "20px 50px", fontSize: 13, color: "var(--silver)" }}>No active crises detected. All systems stable.</div>}
                {safeClusters.active.map((c) => (
                  <ClusterTableRow
                    key={c.id}
                    c={c}
                    threshold={threshold}
                    isExpanded={expandedClusterId === c.id}
                    onToggle={() => setExpandedClusterId(expandedClusterId === c.id ? null : c.id)}
                    onRefresh={load}
                  />
                ))}

                {/* Healed Section */}
                {safeClusters.healed.length > 0 && (
                  <>
                    <div style={{ padding: "20px 20px 10px", background: "rgba(33,49,77,0.02)", fontSize: 11, fontWeight: 700, color: "var(--mines-green)", textTransform: "uppercase", borderTop: "1px solid var(--border)" }}>Healed Systems</div>
                    {safeClusters.healed.map((c) => (
                      <ClusterTableRow
                        key={c.id}
                        c={c}
                        threshold={threshold}
                        isExpanded={expandedClusterId === c.id}
                        onToggle={() => setExpandedClusterId(expandedClusterId === c.id ? null : c.id)}
                        onRefresh={load}
                      />
                    ))}
                  </>
                )}
              </>
            )
          }
        </div>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ fontSize: 11.5, color: "var(--silver)" }}>
            <span style={{ display: "inline-block", width: 8, height: 2, background: "var(--colorado-red)", verticalAlign: "middle", marginRight: 6 }}></span>
            Red marker = threshold ({threshold} tickets, configured in .env)
          </div>
          <div style={{ fontSize: 11.5, color: "var(--dark-gray)" }}>
            APScheduler sweep | 60s interval
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
              Loading tickets...
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
            Showing <span className="mono" style={{ color: "var(--dark-gray)" }}>{!filtered || filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered?.length ?? 0)}</span> of <span className="mono" style={{ color: "var(--dark-gray)" }}>{filtered?.length ?? 0}</span> tickets
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
              }}>Prev</button>
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
              }}>Next</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default TicketClusters
