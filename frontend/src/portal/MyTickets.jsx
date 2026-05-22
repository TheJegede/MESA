import React, { useState, useEffect } from 'react'
import { getTickets } from '../api/mesa'

const SEVERITY_COLORS = { high: '#CC4628', medium: '#F1B91A', low: '#80C342' }

export default function MyTickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTickets()
      .then(setTickets)
      .catch(() => setTickets([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ maxWidth: 860, margin: '40px auto', padding: '0 24px' }}>
      <h1 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 26, color: '#21314D', marginBottom: 6 }}>Ticket History</h1>
      <p style={{ fontSize: 13, color: '#75757D', marginBottom: 28 }}>All submitted support tickets.</p>

      {loading && <div style={{ color: '#81848A', fontSize: 13 }}>Loading…</div>}

      {!loading && tickets.length === 0 && (
        <div style={{ padding: '60px 24px', textAlign: 'center', background: '#fff', border: '1px solid #CFDCE9', borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: '#81848A' }}>No tickets yet. Submit your first ticket.</div>
        </div>
      )}

      {tickets.map(t => (
        <div key={t.id} style={{ background: '#fff', border: '1px solid #CFDCE9', borderRadius: 8, padding: '16px 20px', marginBottom: 12, boxShadow: '0 1px 3px rgba(33,49,77,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: 'Roboto Mono', fontSize: 12, color: '#81848A' }}>#{t.id}</span>
            <span style={{ background: '#09396C', color: '#fff', fontFamily: 'Montserrat', fontWeight: 600, fontSize: 10, padding: '2px 8px', borderRadius: 4 }}>{t.system_affected}</span>
            <span style={{ color: SEVERITY_COLORS[t.severity], fontFamily: 'Montserrat', fontWeight: 700, fontSize: 10 }}>{t.severity?.toUpperCase()}</span>
            <span style={{ marginLeft: 'auto', background: t.auto_resolved ? 'rgba(128,195,66,0.16)' : 'rgba(241,185,26,0.18)', color: t.auto_resolved ? '#3F7A1A' : '#7A5B00', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 10, padding: '2px 8px', borderRadius: 999 }}>
              {t.auto_resolved ? 'Auto-Resolved' : 'Escalated'}
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#21314D', margin: '0 0 6px' }}>{t.text}</p>
          {t.resolution && <p style={{ fontSize: 12, color: '#75757D', fontStyle: 'italic', margin: 0 }}>{t.resolution}</p>}
        </div>
      ))}
    </div>
  )
}
