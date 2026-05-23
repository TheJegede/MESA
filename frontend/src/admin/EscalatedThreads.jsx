import React, { useState, useEffect, useRef } from 'react'
import { getEscalatedThreads, sendAdminReply } from '../api/mesa'

function Message({ msg }) {
  const isUser   = msg.sender === 'user'
  const isStaff  = msg.sender === 'staff'
  const isSystem = msg.sender === 'system'

  if (isSystem) {
    return (
      <div style={{ textAlign: 'center', margin: '6px 0' }}>
        <span style={{ background: 'rgba(241,185,26,0.15)', color: '#7A5B00', fontSize: 11, padding: '3px 10px', borderRadius: 999, fontStyle: 'italic' }}>
          {msg.content}
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      {!isUser && (
        <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, marginRight: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, fontFamily: 'Montserrat', background: isStaff ? '#F1B91A' : '#CFDCE9', color: '#09396C' }}>
          {isStaff ? 'IT' : 'AI'}
        </div>
      )}
      <div style={{ maxWidth: '70%' }}>
        {!isUser && (
          <div style={{ fontSize: 10, color: 'var(--silver)', marginBottom: 2, fontWeight: 600 }}>
            {isStaff ? 'IT Staff' : 'MESA AI'}
          </div>
        )}
        <div style={{
          background: isUser ? 'rgba(9,57,108,0.12)' : isStaff ? 'rgba(241,185,26,0.12)' : 'rgba(255,255,255,0.6)',
          color: 'var(--dark-blue)',
          borderRadius: isUser ? '10px 10px 2px 10px' : '2px 10px 10px 10px',
          padding: '7px 11px',
          fontSize: 12,
          lineHeight: 1.55,
          border: isStaff ? '1px solid rgba(241,185,26,0.3)' : '1px solid var(--border)',
        }}>
          {msg.content}
        </div>
      </div>
    </div>
  )
}

function ThreadCard({ ticket }) {
  const [expanded, setExpanded] = useState(false)
  const [reply, setReply]       = useState('')
  const [sending, setSending]   = useState(false)
  const [msgs, setMsgs]         = useState(ticket.messages || [])
  const bottomRef = useRef(null)

  useEffect(() => {
    setMsgs(ticket.messages || [])
  }, [ticket.messages])

  useEffect(() => {
    if (expanded) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, expanded])

  const handleReply = async () => {
    const text = reply.trim()
    if (!text || sending) return
    setSending(true)
    setReply('')
    try {
      await sendAdminReply(ticket.id, text)
      setMsgs(prev => [...prev, { id: Date.now(), sender: 'staff', content: text, created_at: new Date().toISOString() }])
    } catch {
      setReply(text)
    } finally {
      setSending(false)
    }
  }

  const severityColor = { high: '#CC4628', medium: '#F1B91A', low: '#80C342' }

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 14, overflow: 'hidden' }}>
      {/* Card header */}
      <div
        style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
        onClick={() => setExpanded(e => !e)}
      >
        <span style={{ fontFamily: 'Roboto Mono', fontSize: 11, color: 'var(--silver)' }}>#{ticket.id}</span>
        <span style={{ background: 'var(--blaster-blue)', color: '#fff', fontFamily: 'Montserrat', fontWeight: 600, fontSize: 10, padding: '2px 8px', borderRadius: 4 }}>{ticket.system_affected}</span>
        <span style={{ color: severityColor[ticket.severity] || '#81848A', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 10 }}>{ticket.severity?.toUpperCase()}</span>
        <span style={{ background: 'rgba(241,185,26,0.18)', color: '#7A5B00', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 10, padding: '2px 8px', borderRadius: 999 }}>Escalated</span>
        <span style={{ flex: 1, fontSize: 12, color: 'var(--dark-gray)', marginLeft: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.text}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--silver)" strokeWidth="2" style={{ flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>

      {/* Thread */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 18px 14px' }}>
          <div style={{ maxHeight: 340, overflowY: 'auto', marginBottom: 12 }}>
            {msgs.map((m, i) => <Message key={m.id || i} msg={m} />)}
            <div ref={bottomRef} />
          </div>

          {/* Staff reply */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleReply()}
              placeholder="Reply as IT Staff..."
              disabled={sending}
              style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, outline: 'none', color: 'var(--dark-blue)', background: sending ? 'var(--surface)' : '#fff' }}
            />
            <button
              onClick={handleReply}
              disabled={sending || !reply.trim()}
              style={{ background: '#F1B91A', color: '#09396C', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, fontFamily: 'Montserrat', cursor: sending || !reply.trim() ? 'not-allowed' : 'pointer', opacity: sending || !reply.trim() ? 0.6 : 1 }}
            >
              {sending ? '...' : 'Reply'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EscalatedThreads() {
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    getEscalatedThreads()
      .then(data => { setThreads(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 20, color: 'var(--dark-blue)', margin: 0 }}>Escalated Threads</h2>
        <p style={{ fontSize: 13, color: 'var(--dark-gray)', marginTop: 4 }}>Tickets where AI could not resolve the issue. Reply as IT staff below.</p>
      </div>

      {loading && <div style={{ color: 'var(--silver)', fontSize: 13 }}>Loading…</div>}

      {!loading && threads.length === 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--silver)' }}>No escalated tickets. All issues resolved by AI.</div>
        </div>
      )}

      {threads.map(t => <ThreadCard key={t.id} ticket={t} />)}
    </div>
  )
}
