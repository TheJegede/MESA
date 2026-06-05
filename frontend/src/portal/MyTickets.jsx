import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { getTickets, getTicketMessages, sendTicketMessage, resolveTicket } from '../api/mesa'

const SEVERITY_COLORS = { high: '#CC4628', medium: '#F1B91A', low: '#80C342' }

const STATUS_BADGE = {
  ai_responded:  { label: 'Resolution Provided', bg: 'rgba(128,195,66,0.16)',  color: '#3F7A1A' },
  escalated:     { label: 'Escalated',            bg: 'rgba(241,185,26,0.18)',  color: '#7A5B00' },
  resolved:      { label: 'Resolved',             bg: 'rgba(9,57,108,0.12)',    color: '#09396C' },
  auto_resolved: { label: 'Auto-Resolved',        bg: 'rgba(135,158,195,0.18)', color: '#4A5568' },
  open:          { label: 'Open',                 bg: 'rgba(135,158,195,0.18)', color: '#4A5568' },
}

function StatusBadge({ status }) {
  const s = STATUS_BADGE[status] || STATUS_BADGE.open
  return (
    <span style={{ background: s.bg, color: s.color, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 10, padding: '2px 8px', borderRadius: 999 }}>
      {s.label}
    </span>
  )
}

function Message({ msg }) {
  const isUser  = msg.sender === 'user'
  const isStaff = msg.sender === 'staff'
  const isSystem = msg.sender === 'system'

  if (isSystem) {
    return (
      <div style={{ textAlign: 'center', margin: '8px 0' }}>
        <span style={{ background: 'rgba(241,185,26,0.15)', color: '#7A5B00', fontSize: 11, padding: '4px 12px', borderRadius: 999, fontStyle: 'italic' }}>
          {msg.content}
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      {!isUser && (
        <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginRight: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, fontFamily: 'Montserrat', background: isStaff ? '#F1B91A' : '#CFDCE9', color: isStaff ? '#09396C' : '#09396C' }}>
          {isStaff ? 'IT' : 'AI'}
        </div>
      )}
      <div style={{ maxWidth: '72%' }}>
        {!isUser && (
          <div style={{ fontSize: 10, color: '#81848A', marginBottom: 3, fontWeight: 600 }}>
            {isStaff ? 'IT Staff' : 'MESA AI'}
          </div>
        )}
        <div style={{
          background: isUser ? '#09396C' : isStaff ? 'rgba(241,185,26,0.12)' : '#F0F4F8',
          color: isUser ? '#fff' : '#21314D',
          borderRadius: isUser ? '12px 12px 2px 12px' : '2px 12px 12px 12px',
          padding: '8px 12px',
          fontSize: 13,
          lineHeight: 1.55,
          border: isStaff ? '1px solid rgba(241,185,26,0.3)' : 'none',
        }}>
          {isUser ? msg.content : (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p style={{ margin: '0 0 6px' }}>{children}</p>,
                ol: ({ children }) => <ol style={{ margin: '4px 0', paddingLeft: 18 }}>{children}</ol>,
                ul: ({ children }) => <ul style={{ margin: '4px 0', paddingLeft: 18 }}>{children}</ul>,
                li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
                code: ({ children }) => <code style={{ background: 'rgba(9,57,108,0.08)', borderRadius: 3, padding: '1px 4px', fontFamily: 'monospace', fontSize: 12 }}>{children}</code>,
                strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
              }}
            >
              {msg.content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  )
}

function ThreadPanel({ ticket, onStatusChange }) {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const [resolved, setResolved] = useState(false)
  const messagesBoxRef = useRef(null)
  const pollRef        = useRef(null)

  const status = resolved ? 'resolved' : ticket.status

  const fetchMessages = () => {
    getTicketMessages(ticket.id)
      .then(setMessages)
      .catch(() => {})
  }

  useEffect(() => {
    fetchMessages()
    pollRef.current = setInterval(fetchMessages, 5000)
    return () => clearInterval(pollRef.current)
  }, [ticket.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const box = messagesBoxRef.current
    if (box) box.scrollTop = box.scrollHeight
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    try {
      const res = await sendTicketMessage(ticket.id, text)
      if (res.ticket_status) onStatusChange(ticket.id, res.ticket_status)
      fetchMessages()
    } catch (e) {
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  const handleResolve = async () => {
    await resolveTicket(ticket.id)
    setResolved(true)
    onStatusChange(ticket.id, 'resolved')
    fetchMessages()
  }

  const canResolve = !resolved && !['resolved', 'auto_resolved'].includes(status)
  const canChat    = !['resolved', 'auto_resolved'].includes(status)

  return (
    <div style={{ borderTop: '1px solid #CFDCE9', marginTop: 10 }}>
      {/* Privacy disclaimer */}
      <div style={{ background: 'rgba(241,185,26,0.1)', border: '1px solid rgba(241,185,26,0.3)', borderRadius: 6, padding: '6px 12px', margin: '10px 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7A5B00" strokeWidth="2"><path d="M12 3l9 16H3L12 3z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17" r="0.6" fill="#7A5B00"/></svg>
        <span style={{ fontSize: 11, color: '#7A5B00' }}>Do not share passwords, ID numbers, or sensitive personal information in this thread.</span>
      </div>

      {/* Messages */}
      <div ref={messagesBoxRef} style={{ maxHeight: 320, overflowY: 'auto', padding: '4px 0 8px' }}>
        {messages.map((m, i) => <Message key={m.id || i} msg={m} />)}
      </div>

      {/* Input or resolved state */}
      {canChat ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={messages.some(m => m.sender === 'ai') ? "Reply to MESA AI..." : "Add more details for IT staff..."}
            disabled={sending}
            style={{ flex: 1, border: '1px solid #CFDCE9', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', color: '#21314D', background: sending ? '#F7F9FB' : '#fff' }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            style={{ background: '#09396C', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: sending || !input.trim() ? 'not-allowed' : 'pointer', opacity: sending || !input.trim() ? 0.6 : 1 }}
          >
            {sending ? '...' : 'Send'}
          </button>
          {canResolve && (
            <button
              onClick={handleResolve}
              style={{ background: 'rgba(128,195,66,0.15)', color: '#3F7A1A', border: '1px solid rgba(128,195,66,0.35)', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Mark Resolved ✓
            </button>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 12, color: '#81848A' }}>
          {status === 'resolved'
            ? 'Ticket resolved. Thank you.'
            : ticket.auto_resolved
              ? 'Ticket automatically resolved. Glad we could help!'
              : 'Ticket was automatically closed after inactivity.'}
        </div>
      )}
    </div>
  )
}

export default function MyTickets() {
  const [tickets, setTickets]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  const userEmail = localStorage.getItem('mesa_user_email') || ''

  const loadTickets = () => {
    getTickets(userEmail)
      .then(setTickets)
      .catch(() => setTickets([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadTickets()
    const id = setInterval(loadTickets, 15000)
    return () => clearInterval(id)
  }, [])

  const handleStatusChange = (ticketId, newStatus) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t))
  }

  return (
    <div style={{ maxWidth: 860, margin: '40px auto', padding: '0 24px' }}>
      <h1 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 26, color: '#21314D', marginBottom: 6 }}>Ticket History</h1>
      <p style={{ fontSize: 13, color: '#75757D', marginBottom: 28 }}>Click any ticket to open the support thread.</p>

      {loading && <div style={{ color: '#81848A', fontSize: 13 }}>Loading…</div>}

      {!loading && tickets.length === 0 && (
        <div style={{ padding: '60px 24px', textAlign: 'center', background: '#fff', border: '1px solid #CFDCE9', borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: '#81848A' }}>No tickets yet. Submit your first ticket.</div>
        </div>
      )}

      {tickets.map(t => {
        const isOpen = expandedId === t.id
        return (
          <div key={t.id} style={{ background: '#fff', border: `1px solid ${isOpen ? '#09396C' : '#CFDCE9'}`, borderRadius: 8, padding: '16px 20px', marginBottom: 12, boxShadow: '0 1px 3px rgba(33,49,77,0.04)', transition: 'border-color 0.15s' }}>
            {/* Header row — always visible */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: isOpen ? 8 : 0 }}
              onClick={() => setExpandedId(isOpen ? null : t.id)}
            >
              <span style={{ fontFamily: 'Roboto Mono', fontSize: 12, color: '#81848A' }}>#{t.id}</span>
              <span style={{ background: '#09396C', color: '#fff', fontFamily: 'Montserrat', fontWeight: 600, fontSize: 10, padding: '2px 8px', borderRadius: 4 }}>{t.system_affected}</span>
              <span style={{ color: SEVERITY_COLORS[t.severity], fontFamily: 'Montserrat', fontWeight: 700, fontSize: 10 }}>{t.severity?.toUpperCase()}</span>
              <StatusBadge status={t.status || 'open'} />
              <span style={{ marginLeft: 'auto', color: '#CFDCE9', fontSize: 12, transition: 'transform 0.15s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#81848A" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#21314D', margin: '0 0 0' }}>{t.text}</p>

            {/* Thread panel — only when expanded */}
            {isOpen && (
              <ThreadPanel ticket={t} onStatusChange={handleStatusChange} />
            )}
          </div>
        )
      })}
    </div>
  )
}
