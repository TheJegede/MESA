import React, { useState } from 'react'
import { submitTicket } from '../api/mesa'

export default function SubmitTicket() {
  const [text, setText] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await submitTicket(text, email)
      setResult(data)
      setText('')
      if (email) localStorage.setItem('mesa_user_email', email)
    } catch (err) {
      setError('Failed to submit ticket. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const severityColor = (s) => ({ high: '#CC4628', medium: '#F1B91A', low: '#80C342' }[s] || '#879EC3')

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 24px' }}>
      <h1 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 26, color: '#21314D', marginBottom: 6 }}>
        Submit a Support Ticket
      </h1>
      <p style={{ fontSize: 13, color: '#75757D', marginBottom: 28 }}>
        Describe your issue and MESA will classify it and provide a resolution or escalation.
      </p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#21314D', marginBottom: 6, fontFamily: 'Montserrat' }}>
            Your Email (optional — for resolution notification)
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@mines.edu"
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #CFDCE9', borderRadius: 6, fontSize: 14, color: '#21314D', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#21314D', fontFamily: 'Montserrat' }}>
              Describe your issue *
            </label>
            <button
              type="button"
              onClick={() => setText("Cannot pull enrollment pipeline data from the Edify data warehouse — getting 'connection refused' on every attempt since last Thursday's maintenance window. The nightly ETL job has also thrown ORA-12154 errors twice this week. IR reporting deadline is tomorrow and grad trend data is completely inaccessible. Several colleagues have reported the same issue today. [DEMO_EDIFY]")}
              style={{ background: 'transparent', border: '1px solid #CFDCE9', borderRadius: 4, padding: '3px 10px', fontSize: 11, color: '#81848A', cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 600 }}
            >
              Load Demo Scenario
            </button>
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="e.g. I cannot access my Edify reports. Getting a permission denied error when running the enrollment query..."
            rows={5}
            required
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #CFDCE9', borderRadius: 6, fontSize: 14, color: '#21314D', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !text.trim()}
          style={{
            background: loading ? '#879EC3' : '#09396C', color: '#fff',
            fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14,
            padding: '11px 24px', borderRadius: 6, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Analyzing…' : 'Submit Ticket'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(204,70,40,0.1)', border: '1px solid rgba(204,70,40,0.3)', borderRadius: 6, color: '#CC4628', fontSize: 13 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 24, padding: '20px 24px', background: '#fff', border: '1px solid #CFDCE9', borderRadius: 8, boxShadow: '0 2px 8px rgba(33,49,77,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ background: result.classification.auto_resolved ? 'rgba(128,195,66,0.16)' : 'rgba(241,185,26,0.18)', color: result.classification.auto_resolved ? '#3F7A1A' : '#7A5B00', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 11, padding: '4px 12px', borderRadius: 999 }}>
              {result.classification.auto_resolved ? '✓ Auto-Resolved' : '⬆ Escalated to IT Staff'}
            </span>
            <span style={{ background: '#F0F4F8', color: '#21314D', fontFamily: 'Montserrat', fontWeight: 600, fontSize: 11, padding: '4px 12px', borderRadius: 999 }}>
              {result.classification.system_affected}
            </span>
            <span style={{ color: severityColor(result.classification.severity), fontFamily: 'Montserrat', fontWeight: 700, fontSize: 11 }}>
              {result.classification.severity?.toUpperCase()}
            </span>
          </div>
          <p style={{ fontSize: 14, color: '#21314D', lineHeight: 1.6 }}>{result.classification.resolution}</p>
          <p style={{ fontSize: 11, color: '#81848A', marginTop: 12 }}>Ticket #{result.ticket_id}</p>
        </div>
      )}
    </div>
  )
}
