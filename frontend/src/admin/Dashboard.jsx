import React, { useState, useEffect } from 'react'
import { getDashboardStats, getClusters, getSystemHealth, getDictJobs, getConfig, triggerAgent2 } from '../api/mesa'


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
      <div style={{ fontSize: 11, color: "var(--dark-gray)", fontFamily: "Montserrat", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {k.label}
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

function ClusterRow({ c, max, threshold }) {
  const triggered = c.status === "triggered";
  const atThreshold = c.count >= threshold;
  const pct = Math.min(100, Math.round((c.count / max) * 100));
  const barColor = atThreshold || triggered ? "var(--golden-tech)" : "var(--light-blue)";
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="grid items-center gap-4 px-5 py-3.5"
      style={{
        gridTemplateColumns: "110px 1fr 220px 64px 200px",
        background: hover ? "var(--pale-blue)" : "transparent",
        transition: "background 0.15s",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div>
        <span style={{
          display: "inline-block",
          background: "var(--dark-blue)",
          color: "#fff",
          fontSize: 11,
          fontFamily: "Montserrat",
          fontWeight: 600,
          padding: "4px 10px",
          borderRadius: 4,
          letterSpacing: "0.04em",
        }}>{c.system}</span>
      </div>
      <div style={{ fontSize: 13.5, color: "var(--dark-blue)" }}>{c.topic}</div>
      <div style={{ position: "relative" }}>
        <div style={{ height: 8, background: "var(--pale-blue)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ height: "100%", width: pct + "%", background: barColor, borderRadius: 999, transition: "width 0.3s" }}></div>
        </div>
        <div style={{
          position: "absolute",
          left: `${Math.min(98, (threshold / max) * 100)}%`,
          top: -3, bottom: -3,
          width: 2,
          background: "var(--colorado-red)",
          opacity: 0.55,
        }} title="Threshold"></div>
      </div>
      <div className="mono text-right" style={{ fontSize: 16, color: "var(--dark-blue)", fontWeight: 500 }}>
        {c.count}<span style={{ color: "var(--silver)", fontSize: 11 }}> /{max}</span>
      </div>
      <div className="text-right">
        {triggered && (
          <span style={{
            background: "var(--golden-tech)", color: "var(--dark-blue)",
            fontSize: 11, fontWeight: 700, padding: "5px 11px", borderRadius: 999,
            fontFamily: "Montserrat", letterSpacing: "0.02em",
          }}>🟠 Agent 2 Active</span>
        )}
        {!triggered && atThreshold && c.dict_eligible && (
          <a
            href="/admin/clusters"
            style={{
              background: "transparent", color: "var(--dark-blue)",
              border: "1.5px solid var(--golden-tech)",
              fontSize: 11.5, fontWeight: 700, padding: "5px 11px", borderRadius: 999,
              fontFamily: "Montserrat", cursor: "pointer", letterSpacing: "0.02em",
              textDecoration: "none", display: "inline-block",
            }}
          >▶ Trigger Agent 2</a>
        )}
        {!triggered && atThreshold && !c.dict_eligible && c.it_notified && (
          <span style={{ fontSize: 11, color: "#3F7A1A", fontFamily: "Montserrat", fontWeight: 600 }}>IT Notified ✓</span>
        )}
        {!triggered && atThreshold && !c.dict_eligible && !c.it_notified && (
          <a href="/admin/clusters" style={{ fontSize: 11, color: "var(--colorado-red)", fontFamily: "Montserrat", fontWeight: 600, textDecoration: "none" }}>Notify IT →</a>
        )}
        {!triggered && !atThreshold && (
          <span style={{ fontSize: 11, color: "var(--silver)" }}>Below threshold</span>
        )}
      </div>
    </div>
  );
}

function JobRow({ j }) {
  const isProcessing = j.state === "processing";
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
          fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
        }}>● processing</span>
      ) : (
        <span style={{
          background: "rgba(128,195,66,0.16)", color: "#3F7A1A",
          border: "1px solid rgba(128,195,66,0.4)",
          fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
        }}>✓ completed</span>
      )}
    </div>
  );
}

function HealthRow({ h }) {
  const dotClass = h.status === "online" ? "pulse-green" : h.status === "running" ? "pulse-blue" : "pulse-amber";
  return (
    <div className="flex items-center justify-between py-3" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="flex items-center gap-3 min-w-0">
        <span className={"pulse-dot " + dotClass}></span>
        <div className="min-w-0">
          <div style={{ fontSize: 13, color: "var(--dark-blue)", fontWeight: 600 }}>{h.name}</div>
          <div style={{ fontSize: 11, color: "var(--silver)" }}>{h.detail}</div>
        </div>
      </div>
      <div className="mono" style={{ fontSize: 12, color: "var(--dark-gray)" }}>{h.latency}</div>
    </div>
  );
}

function Dashboard() {
  const [threshold, setThreshold] = useState(5);
  const [liveStats, setLiveStats] = useState(null)
  const [liveClusters, setLiveClusters] = useState(null)
  const [liveHealth, setLiveHealth] = useState(null)
  const [liveJobs, setLiveJobs] = useState(null)

  const max = liveClusters ? Math.max(...liveClusters.map(c => c.count), 1) : 5

  useEffect(() => {
    getConfig().then(cfg => setThreshold(cfg.cluster_threshold)).catch(() => {})
  }, [])

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [stats, clusters, health, jobs] = await Promise.all([
          getDashboardStats(), getClusters(), getSystemHealth(), getDictJobs(),
        ])
        setLiveStats(stats)
        setLiveClusters(clusters.map(c => ({
          ...c,
          status: c.agent2_triggered ? "triggered" : c.threshold_hit ? "threshold" : "below",
        })))
        setLiveHealth([
          { name: 'Ollama (Llama 3.1:8b)', latency: '—', status: health.ollama === 'online' ? 'online' : 'offline', detail: 'local inference' },
          { name: 'Gemini Flash', latency: '—', status: 'online', detail: 'cloud API' },
          { name: 'Gmail SMTP', latency: '—', status: health.gmail_smtp === 'online' ? 'online' : 'offline', detail: 'outbound only' },
          { name: 'APScheduler', latency: 'next: 60s', status: health.scheduler === 'running' ? 'running' : 'stopped', detail: 'distress sweep' },
        ])
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
    }
    fetchAll()
    const id = setInterval(fetchAll, 10000)
    return () => clearInterval(id)
  }, [])

  const kpis = liveStats ? [
    { label: "Tickets (24h)", value: String(liveStats.tickets_today), trend: "Live", tone: "up", sub: "rolling window" },
    { label: "Auto-Resolution Rate", value: liveStats.auto_resolution_rate + "%", trend: "Agent 1", tone: "up", sub: "handled" },
    { label: "Dict Jobs This Week", value: String(liveStats.dict_jobs_this_week), trend: "Stable", tone: "neutral", sub: "0 failed" },
    { label: "Students Flagged", value: String(liveStats.students_flagged_this_week), trend: "Pending review", tone: "warn", sub: "awaiting approval" },
  ] : [
    { label: "Tickets Today",        value: "—", trend: "—", tone: "neutral", sub: "loading…" },
    { label: "Auto-Resolution Rate", value: "—", trend: "—", tone: "neutral", sub: "loading…" },
    { label: "Dict Jobs This Week",  value: "—", trend: "—", tone: "neutral", sub: "loading…" },
    { label: "Students Flagged",     value: "—", trend: "—", tone: "neutral", sub: "loading…" },
  ]

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Zone 1 */}
      <section>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          {kpis.map((k) => <KpiCard key={k.label} k={k} />)}
        </div>
      </section>

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
              Last 24 hours · grouped by source system
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label style={{ fontSize: 12, color: "var(--dark-gray)", fontWeight: 600 }}>Trigger Threshold:</label>
            <input
              type="number"
              min="1" max="50"
              value={threshold}
              onChange={(e) => setThreshold(Math.max(1, Number(e.target.value) || 1))}
              className="mono"
              style={{
                width: 64, padding: "6px 10px",
                border: "1px solid var(--border)", borderRadius: 6,
                fontSize: 13, color: "var(--dark-blue)", background: "var(--surface)",
                textAlign: "center", outline: "none",
              }}
            />
          </div>
        </div>
        <div>
          {liveClusters === null
            ? <div style={{ padding: "28px", textAlign: "center", color: "var(--silver)", fontSize: 13 }}>Loading clusters…</div>
            : liveClusters.map((c) => <ClusterRow key={c.id || (c.system + '-' + c.topic)} c={c} max={max} threshold={threshold} />)
          }
        </div>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--border)", background: "var(--surface)", borderRadius: "0 0 8px 8px" }}>
          <div style={{ fontSize: 11.5, color: "var(--silver)" }}>
            <span style={{ display: "inline-block", width: 8, height: 2, background: "var(--colorado-red)", verticalAlign: "middle", marginRight: 6 }}></span>
            Red marker shows current threshold ({threshold} tickets)
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
            <a style={{ fontSize: 11.5, color: "var(--earth-blue)", fontWeight: 600, cursor: "pointer" }}>View all →</a>
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
              System Health
            </h3>
            <span style={{ fontSize: 11, color: "var(--silver)", fontWeight: 600 }}>4 / 4 operational</span>
          </div>
          {liveHealth === null
            ? <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 12, color: 'var(--silver)' }}>Loading…</div>
            : liveHealth.map((h) => <HealthRow key={h.name} h={h} />)
          }
        </div>
      </section>
    </div>
  );
}

export default Dashboard
