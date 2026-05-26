import React, { useEffect, useState } from 'react'
import { getClusterHistory } from '../api/mesa'

const EVENT_META = {
  activated:     { label: 'Activated',      color: '#09396C', bg: 'rgba(9,57,108,0.12)' },
  threshold_hit: { label: 'Threshold Hit',  color: '#C08B0A', bg: 'rgba(241,185,26,0.15)' },
  healed:        { label: 'Healed',         color: '#1A9E5A', bg: 'rgba(26,158,90,0.12)' },
  reactivated:   { label: 'Reactivated',    color: '#C05A1A', bg: 'rgba(192,90,26,0.12)' },
}

const STATE_META = {
  active:  { label: 'Active',  color: '#09396C', bg: 'rgba(9,57,108,0.1)',  border: '#09396C' },
  healed:  { label: 'Healed',  color: '#1A9E5A', bg: 'rgba(26,158,90,0.1)', border: '#1A9E5A' },
}

function fmt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function StatChip({ label, value, accent }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 18px', minWidth: 100 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || 'var(--dark-blue)', fontFamily: 'Montserrat' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--silver)', marginTop: 2, letterSpacing: '0.04em' }}>{label}</div>
    </div>
  )
}

function EventDot({ type }) {
  const m = EVENT_META[type] || { color: '#888', bg: 'rgba(0,0,0,0.08)', label: type }
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: m.bg, border: `2px solid ${m.color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.color }} />
    </div>
  )
}

function EventRow({ ev, isLast }) {
  const m = EVENT_META[ev.event_type] || { label: ev.event_type, color: '#888', bg: 'rgba(0,0,0,0.08)' }
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', position: 'relative' }}>
      {/* Vertical connector */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <EventDot type={ev.event_type} />
        {!isLast && <div style={{ width: 2, flex: 1, minHeight: 16, background: 'var(--border)', marginTop: 3 }} />}
      </div>
      <div style={{ paddingBottom: isLast ? 0 : 14, paddingTop: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
            color: m.color, background: m.bg,
            padding: '2px 8px', borderRadius: 4,
          }}>{m.label}</span>
          {ev.ticket_count != null && (
            <span style={{ fontSize: 11, color: 'var(--silver)' }}>
              {ev.ticket_count} ticket{ev.ticket_count !== 1 ? 's' : ''}
              {ev.cumulative_count != null && ev.cumulative_count !== ev.ticket_count
                ? ` · ${ev.cumulative_count} lifetime`
                : ''}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--silver)', marginTop: 3 }}>{fmt(ev.created_at)}</div>
      </div>
    </div>
  )
}

function ClusterCard({ c }) {
  const [open, setOpen] = useState(false)
  const sm = STATE_META[c.state] || STATE_META.active
  const cycleCount = c.events.filter(e => e.event_type === 'activated' || e.event_type === 'reactivated').length

  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)', borderRadius: 12,
      overflow: 'hidden', transition: 'box-shadow 0.15s',
    }}>
      {/* Header row */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {/* State indicator stripe */}
          <div style={{ width: 4, height: 36, borderRadius: 2, background: sm.border, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--dark-blue)', fontFamily: 'Montserrat', lineHeight: 1.2 }}>
              {c.system}
            </div>
            <div style={{ fontSize: 12, color: 'var(--silver)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.topic}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 12 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            color: sm.color, background: sm.bg, border: `1px solid ${sm.border}`,
          }}>{sm.label}</span>
          <span style={{ fontSize: 11, color: 'var(--silver)' }}>
            {c.total_count} total · {cycleCount} cycle{cycleCount !== 1 ? 's' : ''}
          </span>
          {c.dict_eligible && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#09396C', background: 'rgba(9,57,108,0.08)', padding: '2px 7px', borderRadius: 4 }}>
              DICT
            </span>
          )}
          {c.threshold_hit && c.state === 'active' && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#C08B0A', background: 'rgba(241,185,26,0.15)', padding: '2px 7px', borderRadius: 4 }}>
              ABOVE THRESHOLD
            </span>
          )}
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--silver)" strokeWidth="2"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </button>

      {/* Expanded timeline */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px 20px 20px' }}>
          {c.events.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--silver)', fontStyle: 'italic' }}>No lifecycle events recorded.</div>
          ) : (
            <div>
              {c.events.map((ev, i) => (
                <EventRow key={ev.id} ev={ev} isLast={i === c.events.length - 1} />
              ))}
            </div>
          )}
          <div style={{ marginTop: 16, display: 'flex', gap: 24, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, color: 'var(--silver)' }}>Active tickets: <b style={{ color: 'var(--dark-blue)' }}>{c.count}</b></span>
            <span style={{ fontSize: 11, color: 'var(--silver)' }}>Lifetime tickets: <b style={{ color: 'var(--dark-blue)' }}>{c.total_count}</b></span>
            {c.healed_at && (
              <span style={{ fontSize: 11, color: 'var(--silver)' }}>Last healed: <b style={{ color: '#1A9E5A' }}>{fmt(c.healed_at)}</b></span>
            )}
            <span style={{ fontSize: 11, color: 'var(--silver)' }}>Last activity: <b style={{ color: 'var(--dark-blue)' }}>{fmt(c.last_seen)}</b></span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ClusterHistory() {
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // all | active | healed

  const load = () => {
    getClusterHistory()
      .then(data => { setClusters(data); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [])

  const active = clusters.filter(c => c.state === 'active')
  const healed = clusters.filter(c => c.state === 'healed')
  const totalEvents = clusters.reduce((s, c) => s + c.events.length, 0)
  const thresholdHit = clusters.filter(c => c.threshold_hit && c.state === 'active').length

  const visible = filter === 'all' ? clusters : clusters.filter(c => c.state === filter)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--silver)' }}>
      Loading cluster history…
    </div>
  )

  if (error) return (
    <div style={{ color: '#E05252', padding: 24, fontSize: 13 }}>Failed to load history: {error}</div>
  )

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, color: 'var(--dark-blue)', margin: 0 }}>
          Cluster Lifecycle History
        </h2>
        <p style={{ fontSize: 12, color: 'var(--silver)', marginTop: 4 }}>
          Full event log for every cluster — activations, threshold crossings, heals, and reactivations.
        </p>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatChip label="Total Clusters" value={clusters.length} />
        <StatChip label="Active" value={active.length} accent="#09396C" />
        <StatChip label="Healed" value={healed.length} accent="#1A9E5A" />
        <StatChip label="Above Threshold" value={thresholdHit} accent="#C08B0A" />
        <StatChip label="Lifecycle Events" value={totalEvents} />
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['all', 'active', 'healed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: filter === f ? '1.5px solid var(--dark-blue)' : '1.5px solid var(--border)',
              background: filter === f ? 'var(--dark-blue)' : '#fff',
              color: filter === f ? '#fff' : 'var(--silver)',
              transition: 'all 0.15s',
            }}
          >
            {f === 'all' ? `All (${clusters.length})` : f === 'active' ? `Active (${active.length})` : `Healed (${healed.length})`}
          </button>
        ))}
        <button
          onClick={load}
          style={{
            marginLeft: 'auto', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', border: '1.5px solid var(--border)', background: '#fff', color: 'var(--silver)',
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Cluster list */}
      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--silver)', fontSize: 13 }}>
          No clusters match the selected filter.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map(c => <ClusterCard key={c.id} c={c} />)}
        </div>
      )}
    </div>
  )
}
