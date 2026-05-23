import React, { useState, useEffect } from 'react'
import { getSystemHealth } from '../api/mesa'

function NavLink({ icon, label, route, currentRoute, onNavigate }) {
  const active = currentRoute === route;
  return (
    <a
      href={"#" + route}
      onClick={(e) => { e.preventDefault(); onNavigate(route); }}
      className="group flex items-center gap-3 px-5 py-2.5 text-[14px] transition-colors relative"
      style={{
        color: active ? "#FFFFFF" : "var(--light-blue)",
        backgroundColor: active ? "rgba(255,255,255,0.08)" : "transparent",
        borderLeft: active ? "4px solid var(--golden-tech)" : "4px solid transparent",
        fontWeight: active ? 600 : 500,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "#FFFFFF"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "var(--light-blue)"; }}
    >
      <span className="w-4 inline-flex justify-center opacity-80">{icon}</span>
      <span>{label}</span>
    </a>
  );
}

function SystemRow({ status, label }) {
  const dotClass = status === "online" ? "pulse-green" : status === "running" ? "pulse-blue" : "pulse-amber";
  return (
    <div className="flex items-center gap-2.5 px-5 py-1.5 text-[12px]" style={{ color: "var(--pale-blue)" }}>
      <span className={"pulse-dot " + dotClass}></span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function Sidebar({ currentRoute, onNavigate }) {
  const [health, setHealth] = useState({ ollama: 'unknown', gmail_smtp: 'unknown', scheduler: 'unknown' })

  useEffect(() => {
    const fetch_ = () => getSystemHealth().then(setHealth).catch(() => {})
    fetch_()
    const id = setInterval(fetch_, 30000)
    return () => clearInterval(id)
  }, [])

  return (
    <aside
      className="flex flex-col justify-between"
      style={{ width: 256, flexShrink: 0, background: "var(--blaster-blue)", color: "#fff", height: "100vh", position: "sticky", top: 0, overflowY: "auto" }}
    >
      <div>
        {/* Brand */}
        <div className="px-5 pt-6 pb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 28, letterSpacing: "-0.01em", lineHeight: 1 }}>MESA</div>
          <div style={{ color: "var(--golden-tech)", fontFamily: "Montserrat", fontWeight: 600, fontSize: 11, marginTop: 4, letterSpacing: "0.04em" }}>
            Admin Console
          </div>
          <div style={{ color: "var(--light-blue)", fontSize: 10, marginTop: 8, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            Colorado School of Mines
          </div>
        </div>

        {/* Nav */}
        <div className="pt-5">
          <div className="px-5 pb-2" style={{ color: "var(--silver)", fontSize: 10, letterSpacing: "0.16em", fontFamily: "Montserrat", fontWeight: 600 }}>
            OPERATIONS
          </div>
          <nav className="flex flex-col">
            <NavLink route="dashboard" currentRoute={currentRoute} onNavigate={onNavigate}
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>}
              label="Dashboard" />
            <NavLink route="clusters" currentRoute={currentRoute} onNavigate={onNavigate}
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M7.5 7.5l3 8M16.5 7.5l-3 8"/></svg>}
              label="Ticket Clusters" />
            <NavLink route="dictionary" currentRoute={currentRoute} onNavigate={onNavigate}
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h12a4 4 0 014 4v12H8a4 4 0 01-4-4V4z"/><path d="M4 16a4 4 0 014-4h12"/></svg>}
              label="Data Dictionary" />
            <NavLink route="distress" currentRoute={currentRoute} onNavigate={onNavigate}
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l9 16H3L12 3z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/></svg>}
              label="Distress Queue" />
          </nav>
          <div style={{ margin: "16px 12px 0", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12 }}>
            <a
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 12px",
                borderRadius: 8,
                color: "var(--light-blue)",
                fontSize: 12,
                fontWeight: 500,
                textDecoration: "none",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#fff"}
              onMouseLeave={(e) => e.currentTarget.style.color = "var(--light-blue)"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Back to Portal
            </a>
          </div>
        </div>
      </div>

      {/* System status pinned */}
      <div className="pb-5 pt-6">
        <div className="px-5 pb-2" style={{ color: "var(--silver)", fontSize: 10, letterSpacing: "0.16em", fontFamily: "Montserrat", fontWeight: 600 }}>
          SYSTEM
        </div>
        <SystemRow status={health.ollama === 'online' ? 'online' : 'offline'} label="Ollama (Llama 3.1:8b)" />
        <SystemRow status="online" label="Gemini Flash" />
        <SystemRow status={health.scheduler === 'running' ? 'running' : 'offline'} label="APScheduler" />
        <div className="px-5 pt-4 mt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2.5">
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--golden-tech)", color: "var(--dark-blue)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Montserrat", fontWeight: 700, fontSize: 11 }}>
              TJ
            </div>
            <div className="leading-tight">
              <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>Taiwo Jegede</div>
              <div style={{ color: "var(--light-blue)", fontSize: 10 }}>Solutions Architect</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopBar({ pageTitle }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  return (
    <header
      className="flex items-center justify-between px-8"
      style={{ background: "#fff", height: 64, borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-baseline gap-3">
        <h1 style={{ fontFamily: "Montserrat", fontWeight: 600, fontSize: 20, color: "var(--dark-blue)" }}>
          {pageTitle}
        </h1>
        <span style={{ fontSize: 12, color: "var(--silver)" }}>· Live</span>
      </div>
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <span className="pulse-dot pulse-green"></span>
          <span style={{ fontSize: 11, color: "var(--dark-gray)", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 600 }}>
            All Systems Operational
          </span>
        </div>
        <div className="text-right leading-tight">
          <div className="mono" style={{ fontSize: 13, color: "var(--dark-blue)", fontWeight: 500 }}>{timeStr}</div>
          <div style={{ fontSize: 11, color: "var(--silver)" }}>{dateStr}</div>
        </div>
      </div>
    </header>
  );
}

function AdminLayout({ pageTitle, currentRoute, onNavigate, children }) {
  return (
    <div className="flex" style={{ height: "100vh", overflow: "hidden" }}>
      <Sidebar currentRoute={currentRoute} onNavigate={onNavigate} />
      <div className="flex-1 flex flex-col" style={{ minWidth: 0, overflowY: "auto" }}>
        <TopBar pageTitle={pageTitle} />
        <main className="flex-1" style={{ background: "var(--surface)", padding: "28px 32px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default AdminLayout
