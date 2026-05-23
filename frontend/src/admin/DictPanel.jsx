import React, { useState, useEffect, useRef } from 'react'
import { getDictJobs, getDictJobDownloadUrl, resendDictJob, getDictJobEntries } from '../api/mesa'

function DPStatChip({ label, value, dot }) {
  return (
    <div
      className="bg-white"
      style={{
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--blaster-blue)",
        borderRadius: 6,
        padding: "10px 16px",
        display: "flex", alignItems: "center", gap: 10,
        boxShadow: "0 1px 2px rgba(33,49,77,0.04)",
      }}
    >
      <span style={{
        fontSize: 10.5, color: "var(--silver)",
        fontFamily: "Montserrat", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
      }}>{label}</span>
      {dot && <span className="pulse-dot pulse-green"></span>}
      <span className="mono" style={{ fontSize: 14, color: "var(--dark-blue)", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function DPSystemPill({ name, kind }) {
  const isManual = kind === "manual";
  return (
    <span style={{
      display: "inline-block",
      background: isManual ? "rgba(135,158,195,0.22)" : "var(--blaster-blue)",
      color: isManual ? "var(--dark-gray)" : "#fff",
      fontFamily: "Montserrat", fontWeight: 600,
      fontSize: 11, letterSpacing: "0.04em",
      padding: "3px 10px", borderRadius: 999,
    }}>{name}</span>
  );
}

function DPTableHeader({ cols, gridTemplate, sticky }) {
  return (
    <div
      className="grid gap-4 px-5 py-2.5"
      style={{
        gridTemplateColumns: gridTemplate,
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        borderTop: "1px solid var(--border)",
        position: sticky ? "sticky" : "static",
        top: 0, zIndex: 2,
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

function JobHistoryRow({ j }) {
  const [hover, setHover] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await resendDictJob(j.id);
      setResendDone(true);
      setTimeout(() => setResendDone(false), 3000);
    } catch {
      // silent — backend logs the failure
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="grid items-center gap-4 px-5 py-3"
      style={{
        gridTemplateColumns: "80px 1.4fr 140px 90px 140px 160px 160px",
        background: hover ? "var(--pale-blue)" : "transparent",
        borderTop: "1px solid var(--border)",
        transition: "background 0.15s",
      }}
    >
      <div className="mono" style={{ fontSize: 12.5, color: "var(--dark-blue)", fontWeight: 500 }}>
        #{String(j.id).padStart(3, "0")}
      </div>
      <div className="mono truncate" style={{ fontSize: 12.5, color: "var(--dark-blue)" }}>
        {j.filename}
      </div>
      <div>
        <DPSystemPill name={j.triggered_by} kind={j.triggered_by === "Manual" ? "manual" : "cluster"} />
      </div>
      <div className="mono" style={{ fontSize: 13, color: "var(--dark-blue)", fontWeight: 600 }}>
        {j.entries == null ? <span style={{ color: "var(--silver)", fontWeight: 400 }}>—</span> : j.entries}
      </div>
      <div>
        {j.status === "completed" ? (
          <span style={{
            background: "rgba(128,195,66,0.16)", color: "#3F7A1A",
            border: "1px solid rgba(128,195,66,0.4)",
            fontSize: 11, fontWeight: 700, fontFamily: "Montserrat",
            padding: "3px 10px", borderRadius: 999, letterSpacing: "0.04em",
          }}>✓ Completed</span>
        ) : j.status === "failed" ? (
          <span style={{
            background: "rgba(204,70,40,0.12)", color: "#CC4628",
            border: "1px solid rgba(204,70,40,0.3)",
            fontSize: 11, fontWeight: 700, fontFamily: "Montserrat",
            padding: "3px 10px", borderRadius: 999, letterSpacing: "0.04em",
          }}>✕ Failed</span>
        ) : (
          <span className="badge-pulse" style={{
            background: "rgba(241,185,26,0.18)", color: "#7A5B00",
            border: "1px solid rgba(241,185,26,0.5)",
            fontSize: 11, fontWeight: 700, fontFamily: "Montserrat",
            padding: "3px 10px", borderRadius: 999, letterSpacing: "0.04em",
          }}>● Processing</span>
        )}
      </div>
      <div className="mono" style={{ fontSize: 11.5, color: "var(--silver)" }}>{j.time}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {j.status === "completed" ? (
          <>
            <a
              href={getDictJobDownloadUrl(j.id)}
              download
              style={{
                color: "var(--blaster-blue)", fontWeight: 700, fontSize: 11,
                fontFamily: "Montserrat", letterSpacing: "0.04em", textDecoration: "none",
                padding: "3px 8px", border: "1px solid var(--blaster-blue)", borderRadius: 4,
              }}
            >↓ CSV</a>
            <button
              onClick={handleResend}
              disabled={resending}
              style={{
                color: resendDone ? "#3F7A1A" : "var(--dark-gray)",
                fontWeight: 700, fontSize: 11,
                fontFamily: "Montserrat", letterSpacing: "0.04em",
                padding: "3px 8px", border: "1px solid var(--border)", borderRadius: 4,
                background: "transparent", cursor: resending ? "default" : "pointer",
              }}
            >
              {resendDone ? "✓ Sent" : resending ? "…" : "↗ Resend"}
            </button>
          </>
        ) : (
          <span style={{ color: "var(--silver)", fontSize: 13 }}>—</span>
        )}
      </div>
    </div>
  );
}

function SensitivityPill({ s }) {
  const map = {
    ferpa_protected: { bg: "var(--colorado-red)",  label: "FERPA Protected" },
    restricted:      { bg: "#8B2500",               label: "Restricted"      },
    internal:        { bg: "var(--blaster-blue)",   label: "Internal"        },
    public:          { bg: "var(--mines-green)",    label: "Public"          },
  }[s] || { bg: "var(--silver)", label: s || "Unknown" };
  return (
    <span style={{
      background: map.bg, color: "#fff",
      fontSize: 10.5, fontWeight: 700, fontFamily: "Montserrat",
      padding: "3px 10px", borderRadius: 999, letterSpacing: "0.06em",
      whiteSpace: "nowrap", textTransform: "uppercase",
    }}>{map.label}</span>
  );
}

function DictEntryRow({ e }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="grid items-center gap-4 px-5 py-3"
      style={{
        gridTemplateColumns: "200px 100px 120px 170px 1fr",
        background: hover ? "var(--pale-blue)" : "transparent",
        borderTop: "1px solid var(--border)",
        transition: "background 0.15s",
      }}
    >
      <div className="mono" style={{ fontSize: 13, color: "var(--dark-blue)", fontWeight: 600 }}>
        {e.field_name}
      </div>
      <div>
        <span className="mono" style={{
          display: "inline-block",
          background: "rgba(135,158,195,0.22)", color: "var(--dark-gray)",
          fontSize: 11, fontWeight: 500,
          padding: "2px 8px", borderRadius: 4,
          border: "1px solid var(--border)",
        }}>{e.data_type}</span>
      </div>
      <div>
        <DPSystemPill name={e.source_system || "—"} />
      </div>
      <div>
        <SensitivityPill s={e.sensitivity} />
      </div>
      <div style={{ fontSize: 12.5, color: "var(--dark-gray)", lineHeight: 1.45 }}>
        {e.description}
      </div>
    </div>
  );
}

function DictPanel() {
  const [jobs, setJobs] = useState([])
  const [latestJob, setLatestJob] = useState(null)
  const [latestEntries, setLatestEntries] = useState([])
  const [loadingEntries, setLoadingEntries] = useState(false)
  const latestJobIdRef = useRef(null)

  const fetchJobs = () => {
    getDictJobs().then(data => {
      if (!Array.isArray(data)) return
      const mapped = data.map(j => ({
        ...j,
        triggered_by: j.triggered_by_cluster || 'Manual',
        time: j.created_at ? new Date(j.created_at).toLocaleString() : '—',
        entries: j.entry_count ?? null,
      }))
      setJobs(mapped)

      const newest = mapped.find(j => j.status === 'completed')
      if (newest && newest.id !== latestJobIdRef.current) {
        latestJobIdRef.current = newest.id
        setLatestJob(newest)
        setLoadingEntries(true)
        getDictJobEntries(newest.id)
          .then(entries => setLatestEntries(Array.isArray(entries) ? entries : []))
          .catch(() => setLatestEntries([]))
          .finally(() => setLoadingEntries(false))
      }
    }).catch(() => {})
  }

  useEffect(() => {
    fetchJobs()
    const id = setInterval(fetchJobs, 10000)
    return () => clearInterval(id)
  }, [])

  const completedCount = jobs.filter(j => j.status === 'completed').length

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      {/* Header */}
      <div>
        <h2 style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 22, color: "var(--dark-blue)" }}>
          Data Dictionary Generator
        </h2>
        <p style={{ fontSize: 13, color: "var(--dark-gray)", marginTop: 6 }}>
          Agent 2 — <span className="mono">Llama 3.1:8b</span> <span style={{ color: "var(--silver)" }}>(local inference)</span>
        </p>
      </div>

      {/* Privacy banner */}
      <div style={{
        background: "var(--pale-blue)",
        color: "var(--dark-blue)",
        borderRadius: 8,
        padding: "14px 18px",
        fontSize: 13,
        display: "flex", alignItems: "center", gap: 12,
        border: "1px solid rgba(33,49,77,0.08)",
      }}>
        <span style={{ fontSize: 18 }}>🔒</span>
        <div>
          <strong style={{ fontFamily: "Montserrat", fontWeight: 700 }}>Local Inference Active</strong>
          <span> — Schema data is processed entirely on-device via Ollama. No data is transmitted to external APIs.</span>
        </div>
      </div>

      {/* Agent status chips */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <DPStatChip label="Model"    value="llama3.1:8b" />
        <DPStatChip label="Status"   value="Online" dot />
        <DPStatChip label="Jobs Run" value={`${completedCount} completed`} />
      </div>

      {/* Job History */}
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
              Generation History
            </h3>
            <div style={{ fontSize: 11.5, color: "var(--silver)", marginTop: 2 }}>
              Recent Agent 2 dictionary jobs
            </div>
          </div>
          <span style={{
            fontSize: 11, color: "var(--silver)",
            fontFamily: "Montserrat", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
          }}>{jobs.length} jobs</span>
        </div>
        <DPTableHeader
          cols={["Job ID", "Filename", "Triggered By", "Entries", "Status", "Timestamp", "Actions"]}
          gridTemplate="80px 1.4fr 140px 90px 140px 160px 160px"
        />
        <div>
          {jobs.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--silver)", fontSize: 13 }}>
              No dictionary jobs yet. Submit a schema from the portal to get started.
            </div>
          ) : (
            jobs.map((j) => <JobHistoryRow key={j.id} j={j} />)
          )}
        </div>
      </section>

      {/* Latest Dictionary Preview */}
      {latestJob && (
        <section
          className="bg-white"
          style={{
            border: "1px solid var(--border)", borderRadius: 8,
            boxShadow: "0 1px 2px rgba(33,49,77,0.04), 0 4px 12px rgba(33,49,77,0.04)",
            overflow: "hidden",
          }}
        >
          <div className="flex items-center justify-between px-5 py-4 gap-4 flex-wrap">
            <div className="min-w-0">
              <h3 style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 16, color: "var(--dark-blue)" }}>
                Latest Dictionary —
                <span className="mono" style={{ fontWeight: 500, marginLeft: 8, fontSize: 14, color: "var(--dark-gray)" }}>
                  {latestJob.filename}
                </span>
              </h3>
              <div style={{ fontSize: 11.5, color: "var(--silver)", marginTop: 2 }}>
                {latestEntries.length > 0 ? `${latestEntries.length} fields` : 'Loading…'} · {latestJob.time}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {latestEntries.length > 0 && (
                <span style={{
                  background: "var(--surface)", color: "var(--dark-gray)",
                  border: "1px solid var(--border)",
                  fontSize: 11, fontWeight: 700, fontFamily: "Montserrat",
                  padding: "3px 10px", borderRadius: 999, letterSpacing: "0.06em",
                }}>{latestEntries.length} FIELDS</span>
              )}
              <a
                href={getDictJobDownloadUrl(latestJob.id)}
                download
                style={{
                  background: "var(--blaster-blue)", color: "#fff",
                  fontFamily: "Montserrat", fontWeight: 700, fontSize: 12,
                  padding: "6px 14px", borderRadius: 6,
                  textDecoration: "none", letterSpacing: "0.02em",
                }}
              >↓ Export CSV</a>
            </div>
          </div>

          <div style={{ maxHeight: 460, overflowY: "auto" }}>
            <DPTableHeader
              cols={["Field Name", "Type", "Source", "Sensitivity", "Description"]}
              gridTemplate="200px 100px 120px 170px 1fr"
              sticky
            />
            <div>
              {loadingEntries ? (
                <div style={{ padding: "24px 20px", textAlign: "center", color: "var(--silver)", fontSize: 13 }}>
                  Loading entries…
                </div>
              ) : latestEntries.length === 0 ? (
                <div style={{ padding: "24px 20px", textAlign: "center", color: "var(--silver)", fontSize: 13 }}>
                  No entries found in artifact.
                </div>
              ) : (
                latestEntries.map((e, i) => <DictEntryRow key={i} e={e} />)
              )}
            </div>
          </div>

          <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
            <div style={{ fontSize: 11.5, color: "var(--silver)" }}>
              Showing <span className="mono" style={{ color: "var(--dark-gray)" }}>1–{latestEntries.length}</span> of <span className="mono" style={{ color: "var(--dark-gray)" }}>{latestEntries.length}</span> fields · sorted by detection order
            </div>
            <div style={{ fontSize: 11.5, color: "var(--dark-gray)" }}>
              Generated <span className="mono">{latestJob.time}</span> by Agent 2
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default DictPanel
