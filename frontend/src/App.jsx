import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import Dashboard from './admin/Dashboard'
import TicketClusters from './admin/TicketClusters'
import DictPanel from './admin/DictPanel'
import DistressQueue from './admin/DistressQueue'
import SubmitTicket from './portal/SubmitTicket'
import MyTickets from './portal/MyTickets'
import SchemaUpload from './portal/SchemaUpload'

function PortalNav() {
  return (
    <nav style={{ background: '#09396C', padding: '0 32px', display: 'flex', alignItems: 'center', gap: 24, height: 56 }}>
      <span style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '-0.01em' }}>MESA</span>
      <Link to="/portal/submit" style={{ color: '#CFDCE9', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Submit Ticket</Link>
      <Link to="/portal/my-tickets" style={{ color: '#CFDCE9', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>My Tickets</Link>
      <Link to="/portal/schema" style={{ color: '#CFDCE9', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Schema Upload</Link>
      <Link to="/admin/dashboard" style={{ marginLeft: 'auto', color: '#F1B91A', fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: 'Montserrat' }}>Admin →</Link>
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
        <Route path="/" element={<Navigate to="/portal/submit" replace />} />
        <Route path="/portal" element={<Navigate to="/portal/submit" replace />} />
        <Route path="/portal/submit" element={<PortalLayout><SubmitTicket /></PortalLayout>} />
        <Route path="/portal/my-tickets" element={<PortalLayout><MyTickets /></PortalLayout>} />
        <Route path="/portal/schema" element={<PortalLayout><SchemaUpload /></PortalLayout>} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminWrapper page="dashboard" />} />
        <Route path="/admin/tickets" element={<AdminWrapper page="clusters" />} />
        <Route path="/admin/dictionary" element={<AdminWrapper page="dictionary" />} />
        <Route path="/admin/distress" element={<AdminWrapper page="distress" />} />
      </Routes>
    </BrowserRouter>
  )
}
