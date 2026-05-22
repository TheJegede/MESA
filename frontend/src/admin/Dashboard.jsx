import React, { useState, useEffect } from 'react'
import { getDashboardStats, getClusters, getSystemHealth } from '../api/mesa'

const KPIS = [
  { label: "Tickets Today", value: "47", trend: "↑ 12%", tone: "up", sub: "vs. yesterday" },
  { label: "Auto-Resolution Rate", value: "68%", trend: "↑ 4 pts", tone: "up", sub: "Agent 1 handled" },
  { label: "Dict Jobs This Week", value: "3", trend: "Stable", tone: "neutral", sub: "0 failed" },
  { label: "Students Flagged", value: "4", trend: "Pending review", tone: "warn", sub: "awaiting approval" },
];

const CLUSTERS = [
  { system: "Edify",    topic: "Course enrollment errors",        count: 15, status: "triggered" },
  { system: "Banner",   topic: "Password reset / SSO failures",   count: 12, status: "threshold" },
  { system: "Canvas",   topic: "Gradebook sync issues",           count: 9,  status: "below" },
  { system: "OneDrive", topic: "Shared folder permissions",       count: 8,  status: "below" },
  { system: "Workday",  topic: "Timesheet submission failures",   count: 6,  status: "below" },
];

const JOBS = [
  { file: "edify_enrollment_schema.csv",  state: "completed",   meta: "24 entries · 2m ago" },
  { file: "banner_student_schema.csv",    state: "completed",   meta: "31 entries · 18m ago" },
  { file: "workday_hr_schema.json",       state: "processing",  meta: "extracting columns…" },
];

const HEALTH = [
  { name: "Ollama (Llama 3.1:8b)",  latency: "180ms",     status: "online",  detail: "local inference" },
  { name: "Gemini Flash",            latency: "340ms",     status: "online",  detail: "rate: 12 / 60s" },
  { name: "Gmail SMTP",              latency: "—",         status: "online",  detail: "outbound only" },
  { name: "APScheduler",             latency: "next: 60s", status: "running", detail: "distress sweep" },
];

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
        {!triggered && atThreshold && (
          <button style={{
            background: "transparent", color: "var(--dark-blue)",
            border: "1.5px solid var(--golden-tech)",
            fontSize: 11.5, fontWeight: 700, padding: "5px 11px", borderRadius: 999,
            fontFamily: "Montserrat", cursor: "pointer", letterSpacing: "0.02em",
          }}>▶ Trigger Agent 2</button>
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
  const [threshold, setThreshold] = useState(10);
  const max = 15;

  const [liveStats, setLiveStats] = useState(null)
  const [liveClusters, setLiveClusters] = useState(CLUSTERS)
  const [liveHealth, setLiveHealth] = useState(HEALTH)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [stats, clusters, health] = await Promise.all([
          getDashboardStats(), getClusters(), getSystemHealth(),
        ])
        setLiveStats(stats)
        setLiveClusters(clusters.length > 0 ? clusters : CLUSTERS)
        if (health.ollama) {
          setLiveHealth([
            { name: 'Ollama (Llama 3.1:8b)', latency: '—', status: health.ollama === 'online' ? 'online' : 'offline', detail: 'local inference' },
            { name: 'Gemini Flash', latency: '—', status: 'online', detail: 'cloud API' },
            { name: 'Gmail SMTP', latency: '—', status: health.gmail_smtp === 'online' ? 'online' : 'offline', detail: 'outbound only' },
            { name: 'APScheduler', latency: 'next: 60s', status: health.scheduler === 'running' ? 'running' : 'stopped', detail: 'distress sweep' },
          ])
        }
      } catch (e) { /* use static fallback */ }
    }
    fetchAll()
    const id = setInterval(fetchAll, 10000)
    return () => clearInterval(id)
  }, [])

  const kpis = liveStats ? [
    { label: "Tickets Today", value: String(liveStats.tickets_today), trend: "Live", tone: "up", sub: "from backend" },
    { label: "Auto-Resolution Rate", value: liveStats.auto_resolution_rate + "%", trend: "Agent 1", tone: "up", sub: "handled" },
    { label: "Dict Jobs This Week", value: String(liveStats.dict_jobs_this_week), trend: "Stable", tone: "neutral", sub: "0 failed" },
    { label: "Students Flagged", value: String(liveStats.students_flagged_this_week), trend: "Pending review", tone: "warn", sub: "awaiting approval" },
  ] : KPIS

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
          {liveClusters.map((c) => <ClusterRow key={c.system} c={c} max={max} threshold={threshold} />)}
        </div>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--border)", background: "var(--surface)", borderRadius: "0 0 8px 8px" }}>
          <div style={{ fontSize: 11.5, color: "var(--silver)" }}>
            <span style={{ display: "inline-block", width: 8, height: 2, background: "var(--colorado-red)", verticalAlign: "middle", marginRight: 6 }}></span>
            Red marker shows current threshold ({threshold} tickets)
          </div>
          <div style={{ fontSize: 11.5, color: "var(--dark-gray)" }}>
            Updated <span className="mono">14s</span> ago
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
          {JOBS.map((j) => <JobRow key={j.file} j={j} />)}
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
          {liveHealth.map((h) => <HealthRow key={h.name} h={h} />)}
        </div>
      </section>
    </div>
  );
}

export default Dashboard
