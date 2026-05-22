// src/admin/DictPanel.jsx
const { useState: useStateDP } = React;

const DP_JOBS = [
  { id: 1, filename: "edify_enrollment_schema.csv", triggered_by: "Edify Cluster",  entries: 24,   status: "completed",  time: "Today 11:30 AM",     artifact: "edify_dict_2026-05-21.csv"  },
  { id: 2, filename: "banner_student_schema.csv",   triggered_by: "Banner Cluster", entries: 31,   status: "completed",  time: "Yesterday 2:15 PM",  artifact: "banner_dict_2026-05-20.csv" },
  { id: 3, filename: "workday_hr_schema.json",      triggered_by: "Manual",         entries: null, status: "processing", time: "Today 12:00 PM",     artifact: null                          },
];

const DP_DICT_ENTRIES = [
  { field: "student_id",           type: "id",      description: "Unique institutional identifier for each enrolled student",  source: "Banner",  sensitivity: "ferpa_protected" },
  { field: "enrollment_status",    type: "string",  description: "Current enrollment status in the given term",                source: "Banner",  sensitivity: "ferpa_protected" },
  { field: "credit_hours",         type: "integer", description: "Total credit hours attempted in current term",                source: "Edify",   sensitivity: "internal"        },
  { field: "gpa_cumulative",       type: "float",   description: "Cumulative GPA across all completed terms",                   source: "Banner",  sensitivity: "ferpa_protected" },
  { field: "department_code",      type: "string",  description: "Three-letter code identifying the academic department",       source: "Edify",   sensitivity: "public"          },
  { field: "financial_aid_amount", type: "float",   description: "Total financial aid disbursed in current term",               source: "Workday", sensitivity: "ferpa_protected" },
];

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
  const [hover, setHover] = useStateDP(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="grid items-center gap-4 px-5 py-3"
      style={{
        gridTemplateColumns: "80px 1.4fr 140px 90px 140px 160px 100px",
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
      <div>
        {j.status === "completed" ? (
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{
              color: "var(--blaster-blue)", fontWeight: 700, fontSize: 12,
              fontFamily: "Montserrat", letterSpacing: "0.04em", textDecoration: "none",
            }}
          >↓ CSV</a>
        ) : (
          <span style={{ color: "var(--silver)", fontSize: 13 }}>—</span>
        )}
      </div>
    </div>
  );
}

function SensitivityPill({ s }) {
  const map = {
    ferpa_protected: { bg: "var(--colorado-red)", label: "FERPA Protected" },
    internal:        { bg: "var(--blaster-blue)", label: "Internal"        },
    public:          { bg: "var(--mines-green)",  label: "Public"          },
  }[s];
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
  const [hover, setHover] = useStateDP(false);
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
        {e.field}
      </div>
      <div>
        <span className="mono" style={{
          display: "inline-block",
          background: "rgba(135,158,195,0.22)", color: "var(--dark-gray)",
          fontSize: 11, fontWeight: 500,
          padding: "2px 8px", borderRadius: 4,
          border: "1px solid var(--border)",
        }}>{e.type}</span>
      </div>
      <div>
        <DPSystemPill name={e.source} />
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
        <DPStatChip label="Jobs Run" value="3 this week" />
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
          }}>3 jobs</span>
        </div>
        <DPTableHeader
          cols={["Job ID", "Filename", "Triggered By", "Entries", "Status", "Timestamp", "Download"]}
          gridTemplate="80px 1.4fr 140px 90px 140px 160px 100px"
        />
        <div>
          {DP_JOBS.map((j) => <JobHistoryRow key={j.id} j={j} />)}
        </div>
      </section>

      {/* Latest Dictionary Preview */}
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
                edify_dict_2026-05-21.csv
              </span>
            </h3>
            <div style={{ fontSize: 11.5, color: "var(--silver)", marginTop: 2 }}>
              Auto-generated from <span className="mono">edify_enrollment_schema.csv</span> · 24 fields detected
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span style={{
              background: "var(--surface)", color: "var(--dark-gray)",
              border: "1px solid var(--border)",
              fontSize: 11, fontWeight: 700, fontFamily: "Montserrat",
              padding: "3px 10px", borderRadius: 999, letterSpacing: "0.06em",
            }}>24 FIELDS</span>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
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
            {DP_DICT_ENTRIES.map((e) => <DictEntryRow key={e.field} e={e} />)}
          </div>
        </div>

        <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ fontSize: 11.5, color: "var(--silver)" }}>
            Showing <span className="mono" style={{ color: "var(--dark-gray)" }}>1–6</span> of <span className="mono" style={{ color: "var(--dark-gray)" }}>24</span> fields · sorted by detection order
          </div>
          <div style={{ fontSize: 11.5, color: "var(--dark-gray)" }}>
            Generated <span className="mono">Today 11:30 AM</span> by Agent 2
          </div>
        </div>
      </section>
    </div>
  );
}

window.DictPanel = DictPanel;
