import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './admin/Dashboard'
import TicketClusters from './admin/TicketClusters'
import DictPanel from './admin/DictPanel'
import DistressQueue from './admin/DistressQueue'
import SubmitTicket from './portal/SubmitTicket'
import MyTickets from './portal/MyTickets'
import SchemaUpload from './portal/SchemaUpload'

const ADMIN_PASSPHRASE = 'MESA-ADMIN-2026'

function LandingPage() {
  const navigate = useNavigate()
  const [showGate, setShowGate] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  const handleAdminSubmit = (e) => {
    e.preventDefault()
    if (passphrase === ADMIN_PASSPHRASE) {
      navigate('/admin/dashboard')
    } else {
      setError(true)
      setShake(true)
      setPassphrase('')
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #09396C 0%, #061F3E 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      {/* Branding */}
      <div style={{ marginBottom: 56, textAlign: 'center' }}>
        <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 56, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
          MESA
        </div>
        <div style={{ color: '#F1B91A', fontFamily: 'Montserrat', fontWeight: 600, fontSize: 12, marginTop: 10, letterSpacing: '0.1em' }}>
          MINES ENTERPRISE SUPPORT &amp; ADVISING AGENT
        </div>
        <div style={{ color: '#7FA8C9', fontSize: 11, marginTop: 8, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Colorado School of Mines
        </div>
      </div>

      {!showGate ? (
        /* Role selector cards */
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* Portal card */}
          <button
            onClick={() => navigate('/portal/submit')}
            style={{
              width: 280,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 16,
              padding: '36px 28px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              color: '#fff',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.11)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(241,185,26,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F1B91A" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 17, marginBottom: 8 }}>Student &amp; Faculty Portal</div>
            <div style={{ color: '#7FA8C9', fontSize: 12, lineHeight: 1.6 }}>Submit support tickets, track requests, and upload data schemas for processing.</div>
            <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 6, color: '#F1B91A', fontSize: 12, fontWeight: 600 }}>
              Enter portal
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
          </button>

          {/* Admin card */}
          <button
            onClick={() => setShowGate(true)}
            style={{
              width: 280,
              background: 'rgba(241,185,26,0.07)',
              border: '1px solid rgba(241,185,26,0.22)',
              borderRadius: 16,
              padding: '36px 28px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              color: '#fff',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(241,185,26,0.13)'
              e.currentTarget.style.borderColor = 'rgba(241,185,26,0.45)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(241,185,26,0.07)'
              e.currentTarget.style.borderColor = 'rgba(241,185,26,0.22)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(241,185,26,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F1B91A" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </div>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 17, marginBottom: 8 }}>Admin Console</div>
            <div style={{ color: '#7FA8C9', fontSize: 12, lineHeight: 1.6 }}>Operations dashboard, cluster analytics, distress queue, and system monitoring.</div>
            <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 6, color: '#F1B91A', fontSize: 12, fontWeight: 600 }}>
              Restricted access
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            </div>
          </button>
        </div>
      ) : (
        /* Passphrase gate */
        <div
          style={{
            width: 360,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 16,
            padding: '40px 36px',
            animation: shake ? 'shake 0.4s ease' : 'none',
          }}
        >
          <style>{`
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              20%       { transform: translateX(-8px); }
              40%       { transform: translateX(8px); }
              60%       { transform: translateX(-6px); }
              80%       { transform: translateX(6px); }
            }
          `}</style>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F1B91A" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            <span style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16, color: '#fff' }}>Admin Access</span>
          </div>
          <form onSubmit={handleAdminSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#7FA8C9', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', marginBottom: 8 }}>
                PASSPHRASE
              </label>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => { setPassphrase(e.target.value); setError(false) }}
                autoFocus
                placeholder="Enter passphrase"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.08)',
                  border: error ? '1px solid #E05252' : '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  letterSpacing: passphrase ? '0.15em' : 'normal',
                }}
              />
              {error && (
                <div style={{ color: '#E05252', fontSize: 11, marginTop: 6 }}>Incorrect passphrase.</div>
              )}
            </div>
            <button
              type="submit"
              style={{
                width: '100%',
                background: '#F1B91A',
                color: '#09396C',
                border: 'none',
                borderRadius: 8,
                padding: '11px 0',
                fontFamily: 'Montserrat',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                marginBottom: 12,
              }}
            >
              Enter Console
            </button>
            <button
              type="button"
              onClick={() => { setShowGate(false); setPassphrase(''); setError(false) }}
              style={{
                width: '100%',
                background: 'transparent',
                color: '#7FA8C9',
                border: 'none',
                borderRadius: 8,
                padding: '8px 0',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function PortalNav() {
  return (
    <nav style={{ background: '#09396C', padding: '0 32px', display: 'flex', alignItems: 'center', gap: 24, height: 56 }}>
      <Link to="/" style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '-0.01em', textDecoration: 'none' }}>MESA</Link>
      <Link to="/portal/submit" style={{ color: '#CFDCE9', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Submit Ticket</Link>
      <Link to="/portal/my-tickets" style={{ color: '#CFDCE9', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>My Tickets</Link>
      <Link to="/portal/schema" style={{ color: '#CFDCE9', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Schema Upload</Link>
    </nav>
  )
}

function PortalLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F8' }}>
      <PortalNav />
      {children}
    </div>
  )
}

function AdminWrapper({ page }) {
  const TITLES = {
    dashboard: 'Operations Dashboard',
    clusters: 'Ticket Cluster Analytics',
    dictionary: 'Data Dictionary Generator',
    distress: 'Distress Queue',
  }
  const COMPONENTS = { dashboard: Dashboard, clusters: TicketClusters, dictionary: DictPanel, distress: DistressQueue }
  const Component = COMPONENTS[page]
  return (
    <AdminLayout pageTitle={TITLES[page]} currentRoute={page} onNavigate={(r) => window.location.href = `/admin/${r}`}>
      <Component />
    </AdminLayout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/portal" element={<Navigate to="/portal/submit" replace />} />
        <Route path="/portal/submit" element={<PortalLayout><SubmitTicket /></PortalLayout>} />
        <Route path="/portal/my-tickets" element={<PortalLayout><MyTickets /></PortalLayout>} />
        <Route path="/portal/schema" element={<PortalLayout><SchemaUpload /></PortalLayout>} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminWrapper page="dashboard" />} />
        <Route path="/admin/clusters" element={<AdminWrapper page="clusters" />} />
        <Route path="/admin/dictionary" element={<AdminWrapper page="dictionary" />} />
        <Route path="/admin/distress" element={<AdminWrapper page="distress" />} />
      </Routes>
    </BrowserRouter>
  )
}
