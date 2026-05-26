import React, { useState, useEffect, useCallback } from 'react'
import { getDashboardStats, getClusters, getDictJobs, getEmailLog } from '../api/mesa'


function KpiCard({ k }) {
  const trendStyles = {
    up:      { background: "rgba(128,195,66,0.14)", color: "#3F7A1A", border: "1px solid rgba(128,195,66,0.35)" },
    warn:    { background: "rgba(241,185,26,0.18)", color: "#7A5B00", border: "1px solid rgba(241,185,26,0.45)" },
    neutral: { background: "rgba(135,158,195,0.18)", color: "var(--dark-gray)", border: "1px solid var(--border)" },
  };
  return (
    <div
      className="bg-white relative"
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        boxShadow: "0 1px 2px rgba(33,49,77,0.04), 0 4px 12px rgba(33,49,77,0.04)",
        padding: "20px 22px 22px",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "var(--blaster-blue)" }}></div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 11, color: "var(--dark-gray)", fontFamily: "Montserrat", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {k.label}
        </div>
        {k.toggle && (
          <div
            role="group"
            aria-label={k.toggle.label}
            style={{
              display: "flex",
              border: "1px solid var(--border)",
              borderRadius: 999,
              padding: 2,
              background: "var(--surface)",
              flexShrink: 0,
            }}
          >
            {k.toggle.options.map(option => {
              const active = option.value === k.toggle.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => k.toggle.onChange(option.value)}
                  aria-pressed={active}
                  style={{
                    border: "none",
                    borderRadius: 999,
                    background: active ? "var(--dark-blue)" : "transparent",
                    color: active ? "#fff" : "var(--dark-gray)",
                    fontSize: 10.5,
                    fontFamily: "Montserrat",
                    fontWeight: 700,
                    padding: "3px 9px",
                    cursor: "pointer",
                    lineHeight: 1.2,
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex items-end justify-between mt-3">
        <div className="mono" style={{ fontSize: 52, lineHeight: 1, fontWeight: 500, color: "var(--dark-blue)", letterSpacing: "-0.02em" }}>
          {k.value}
        </div>
        <span style={{ ...trendStyles[k.tone], fontSize: 11, padding: "3px 9px", borderRadius: 999, fontWeight: 600, whiteSpace: "nowrap" }}>
          {k.trend}
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--silver)", marginTop: 8 }}>{k.sub}</div>
    </div>
  );
}

const STATUS_META = [
  { key: "ai_responded",  label: "AI Responded",  color: "#80C342" },
  { key: "auto_resolved", label: "Auto-Resolved", color: "#4A90C4" },
  { key: "resolved",      label: "Resolved",      color: "#09396C" },
  { key: "escalated",     label: "Escalated",     color: "#F1B91A" },
  { key: "open",          label: "Open",          color: "#CFDCE9" },
];

function StatusBreakdownCard({ breakdown, total }) {
  const safeTotal = total || 1;
  const autoHandled = (breakdown?.ai_responded || 0) + (breakdown?.auto_resolved || 0) + (breakdown?.resolved || 0);
  const autoHandledPct = total ? Math.round((autoHandled / safeTotal) * 100) : null;

  return (
    <div
      className="bg-white"
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        boxShadow: "0 1px 2px rgba(33,49,77,0.04), 0 4px 12px rgba(33,49,77,0.04)",
        padding: "20px 24px 22px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "Montserrat", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--dark-gray)" }}>
            Ticket Status Breakdown
          </div>
          <div style={{ fontSize: 12, color: "var(--silver)", marginTop: 3 }}>
            {total ?? "—"} tickets across 5 states
          </div>
        </div>
        {autoHandledPct !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#80C342" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--dark-gray)", fontFamily: "Montserrat" }}>
              {autoHandledPct}% auto-handled
            </span>
          </div>
        )}
      </div>

      {/* Stacked bar */}
      <div style={{ display: "flex", height: 16, borderRadius: 999, overflow: "hidden", margin: "14px 0 16px", background: "var(--pale-blue)" }}>
        {STATUS_META.map(s => {
          const count = breakdown?.[s.key] || 0;
          const pct = (count / safeTotal) * 100;
          return pct > 0 ? (
            <div key={s.key} style={{ width: pct + "%", background: s.color, transition: "width 0.4s" }} title={`${s.label}: ${count}`} />
          ) : null;
        })}
      </div>

      {/* Mini stat chips */}
      <div style={{ display: "flex", gap: 12 }}>
        {STATUS_META.map(s => {
          const count = breakdown?.[s.key] ?? 0;
          const pct = total ? Math.round((count / safeTotal) * 100) : 0;
          return (
            <div
              key={s.key}
              style={{
                flex: 1,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "10px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: 10.5, fontFamily: "Montserrat", fontWeight: 600, color: "var(--dark-gray)", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                  {s.label}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span className="mono" style={{ fontSize: 22, fontWeight: 600, color: "var(--dark-blue)", lineHeight: 1 }}>
                  {breakdown ? count : "—"}
                </span>
                {breakdown && (
                  <span style={{ fontSize: 11, color: "var(--silver)" }}>{pct}%</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClusterRow({ c, max }) {
  const [hover, setHover] = useState(false);
  const pct = Math.min(100, Math.round((c.count / max) * 100));

  // Badge driven by backend state — no frontend threshold comparison needed
  const badge = c.state === "healed"
    ? { label: "Healed",          color: "var(--mines-green)"  }
    : c.threshold_hit
    ? { label: "Above Threshold", color: "var(--colorado-red)" }
    : { label: "Emerging",        color: "var(--silver)"       };

  const barColor = c.state === "healed"
    ? "var(--mines-green)"
    : c.threshold_hit
    ? "var(--golden-tech)"
    : "var(--light-blue)";

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="grid items-center gap-4 px-5 py-3.5"
      style={{
        gridTemplateColumns: "110px 1fr 220px 64px 120px",
        background: hover ? "var(--pale-blue)" : "transparent",
        transition: "background 0.15s",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div>
        <span style={{
          display: "inline-block",
          background: "var(--dark-blue)", color: "#fff",
          fontSize: 11, fontFamily: "Montserrat", fontWeight: 600,
          padding: "4px 10px", borderRadius: 4, letterSpacing: "0.04em",
        }}>{c.system}</span>
      </div>
      <div style={{ fontSize: 13.5, color: "var(--dark-blue)" }}>{c.topic}</div>
      <div>
        <div style={{ height: 8, background: "var(--pale-blue)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ height: "100%", width: pct + "%", background: barColor, borderRadius: 999, transition: "width 0.3s" }}></div>
        </div>
      </div>
      <div className="mono text-right" style={{ fontSize: 16, color: "var(--dark-blue)", fontWeight: 500 }}>
        {c.count}<span style={{ color: "var(--silver)", fontSize: 11 }}> /{max}</span>
      </div>
      <div className="text-right">
        <span style={{
          background: "transparent", border: `1.5px solid ${badge.color}`,
          color: badge.color, fontSize: 10.5, fontWeight: 700,
          padding: "3px 9px", borderRadius: 999, fontFamily: "Montserrat",
          letterSpacing: "0.06em", textTransform: "uppercase",
        }}>{badge.label}</span>
      </div>
    </div>
  );
}

function JobRow({ j }) {
  const isProcessing = j.state === "processing" || j.state === "queued";
  const isFailed = j.state === "failed";
  
  return (
    <div className="flex items-center justify-between py-3" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="min-w-0">
        <div className="mono truncate" style={{ fontSize: 13, color: "var(--dark-blue)", fontWeight: 500, maxWidth: 260 }}>
          {j.file}
        </div>
        <div style={{ fontSize: 11, color: "var(--silver)", marginTop: 2 }}>{j.meta}</div>
      </div>
      {isProcessing ? (
        <span className="badge-pulse" style={{
          background: "rgba(241,185,26,0.18)", color: "#7A5B00",
          border: "1px solid rgba(241,185,26,0.45)",
          fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
          textTransform: "uppercase", letterSpacing: "0.04em"
        }}>Processing</span>
      ) : isFailed ? (
        <span style={{
          background: "rgba(204,70,40,0.12)", color: "#CC4628",
          border: "1px solid rgba(204,70,40,0.3)",
          fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
          textTransform: "uppercase", letterSpacing: "0.04em"
        }}>Failed</span>
      ) : (
        <span style={{
          background: "rgba(128,195,66,0.16)", color: "#3F7A1A",
          border: "1px solid rgba(128,195,66,0.4)",
          fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
          textTransform: "uppercase", letterSpacing: "0.04em"
        }}>Completed</span>
      )}
    </div>
  );
}

function EmailRow({ e }) {
  const timeStr = e.sent_at
    ? new Date(e.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—'
  const subject = e.subject?.length > 44 ? e.subject.slice(0, 41) + '…' : (e.subject || '—')
  return (
    <div className="flex items-center justify-between py-3" style={{ borderTop: "1px solid var(--border)", gap: 8 }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12.5, color: "var(--dark-blue)", fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {subject}
        </div>
        <div style={{ fontSize: 11, color: "var(--silver)", marginTop: 2 }}>→ {e.to_addr} · {timeStr}</div>
      </div>
      <span style={{
        background: e.success ? "rgba(128,195,66,0.16)" : "rgba(204,70,40,0.12)",
        color: e.success ? "#3F7A1A" : "#CC4628",
        border: `1px solid ${e.success ? "rgba(128,195,66,0.4)" : "rgba(204,70,40,0.3)"}`,
        fontSize: 10.5, fontWeight: 700, padding: "2px 9px", borderRadius: 999,
        textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0,
      }}>
        {e.success ? "Sent" : "Failed"}
      </span>
    </div>
  )
}

function Dashboard() {
  const [liveStats, setLiveStats] = useState(null)
  const [liveClusters, setLiveClusters] = useState(null)
  const [liveEmailLog, setLiveEmailLog] = useState(null)
  const [liveJobs, setLiveJobs] = useState(null)
  const [ticketMetric, setTicketMetric] = useState('24h')

  const max = liveClusters ? Math.max(...liveClusters.map(c => c.count), 1) : 5

  const fetchAll = useCallback(async () => {
    try {
      const [stats, clusters, jobs, emailLog] = await Promise.all([
        getDashboardStats(), getClusters(), getDictJobs(), getEmailLog(8),
      ])
      setLiveStats(stats)
      setLiveClusters(clusters)
      setLiveEmailLog(Array.isArray(emailLog) ? emailLog : [])
      const mapped = Array.isArray(jobs) ? jobs.slice(0, 3).map(j => {
        const isProcessing = j.status === 'processing' || j.status === 'queued'
        const time = j.created_at ? new Date(j.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'
        const meta = j.status === 'completed'
          ? `${j.entry_count ?? '—'} entries · ${time}`
          : isProcessing ? 'processing…'
          : j.status === 'failed' ? 'generation failed'
          : time
        return { id: j.id, file: j.filename, state: j.status, meta }
      }) : []
      setLiveJobs(mapped)
    } catch (e) { /* backend offline — keep null state, no stale flash */ }
  }, [])

  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchAll, 10000)
    return () => clearInterval(id)
  }, [fetchAll])

  const ticketKpi = liveStats
    ? {
        label: ticketMetric === '24h' ? "Tickets · Last 24h" : "Tickets · Total",
        value: String(ticketMetric === '24h' ? liveStats.tickets_today : liveStats.total_tickets),
        trend: ticketMetric === '24h' ? "Live" : "All time",
        tone: ticketMetric === '24h' ? "up" : "neutral",
        sub: ticketMetric === '24h' ? "rolling window" : "all tickets",
      }
    : {
        label: ticketMetric === '24h' ? "Tickets · Last 24h" : "Tickets · Total",
        value: "—",
        trend: "—",
        tone: "neutral",
        sub: "loading…",
      }

  ticketKpi.toggle = {
    label: "Ticket count range",
    value: ticketMetric,
    onChange: setTicketMetric,
    options: [
      { value: '24h', label: '24H' },
      { value: 'total', label: 'Total' },
    ],
  }

  const kpis = liveStats ? [
    ticketKpi,
    { label: "Dict Jobs · This Week", value: String(liveStats.dict_jobs_this_week),      trend: "Stable",         tone: "neutral", sub: "schema uploads"  },
    { label: "Students Flagged",    value: String(liveStats.students_flagged_this_week), trend: "Pending review", tone: "warn",    sub: "awaiting approval" },
  ] : [
    ticketKpi,
    { label: "Dict Jobs · This Week", value: "—", trend: "—", tone: "neutral", sub: "loading…" },
    { label: "Students Flagged",      value: "—", trend: "—", tone: "neutral", sub: "loading…" },
  ]

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Zone 1 — 3 equal KPI cards */}
      <section>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          {kpis.map((k) => <KpiCard key={k.label} k={k} />)}
        </div>
      </section>

      {/* Zone 1b — full-width status breakdown */}
      <StatusBreakdownCard
        breakdown={liveStats?.status_breakdown}
        total={liveStats?.total_tickets}
      />

      {/* Zone 2 — clusters */}
      <section
        className="bg-white"
        style={{
          border: "1px solid var(--border)",
          borderRadius: 8,
          boxShadow: "0 1px 2px rgba(33,49,77,0.04), 0 4px 12px rgba(33,49,77,0.04)",
        }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 16, color: "var(--dark-blue)" }}>
              Ticket Clusters
            </h2>
            <div style={{ fontSize: 11.5, color: "var(--silver)", marginTop: 2 }}>
              All active clusters · grouped by source system
            </div>
          </div>
          <a
            href="/admin/clusters"
            style={{ fontSize: 12, color: "var(--blaster-blue)", fontWeight: 600, textDecoration: "none" }}
          >Full analysis →</a>
        </div>
        <div>
          {liveClusters === null
            ? <div style={{ padding: "28px", textAlign: "center", color: "var(--silver)", fontSize: 13 }}>Loading clusters…</div>
            : liveClusters.map((c) => <ClusterRow key={c.id || (c.system + '-' + c.topic)} c={c} max={max} />)
          }
        </div>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--border)", background: "var(--surface)", borderRadius: "0 0 8px 8px" }}>
          <div style={{ fontSize: 11.5, color: "var(--silver)" }}>
            Cluster overview · action controls in Full analysis
          </div>
        </div>
      </section>

      {/* Zone 3 — split */}
      <section className="grid gap-4" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <div
          className="bg-white"
          style={{
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "18px 20px 8px",
            boxShadow: "0 1px 2px rgba(33,49,77,0.04), 0 4px 12px rgba(33,49,77,0.04)",
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <h3 style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 15, color: "var(--dark-blue)" }}>
              Recent Dictionary Jobs
            </h3>
            <a href="/admin/dictionary" style={{ fontSize: 11.5, color: "var(--earth-blue)", fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>View all →</a>
          </div>
          {liveJobs === null
            ? <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 12, color: 'var(--silver)' }}>Loading…</div>
            : liveJobs.length === 0
            ? <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 12, color: 'var(--silver)' }}>No dictionary jobs yet.</div>
            : liveJobs.map((j) => <JobRow key={j.id} j={j} />)
          }
        </div>

        <div
          className="bg-white"
          style={{
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "18px 20px 8px",
            boxShadow: "0 1px 2px rgba(33,49,77,0.04), 0 4px 12px rgba(33,49,77,0.04)",
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <h3 style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 15, color: "var(--dark-blue)" }}>
              Recent Emails Sent
            </h3>
            <span style={{ fontSize: 11, color: "var(--silver)", fontWeight: 600 }}>
              {liveEmailLog ? `${liveEmailLog.length} recent` : '—'}
            </span>
          </div>
          {liveEmailLog === null
            ? <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 12, color: 'var(--silver)' }}>Loading…</div>
            : liveEmailLog.length === 0
            ? <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 12, color: 'var(--silver)' }}>No emails sent yet.</div>
            : liveEmailLog.map((e) => <EmailRow key={e.id} e={e} />)
          }
        </div>
      </section>
    </div>
  );
}

export default Dashboard
