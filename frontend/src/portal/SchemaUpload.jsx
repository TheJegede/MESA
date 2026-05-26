import React, { useState, useRef, useEffect } from 'react'
import { uploadSchema } from '../api/mesa'

function isInstitutionalEmail(email) {
  return email.trim().length > 0 && email.includes('@')
}

export default function SchemaUpload() {
  const [file, setFile] = useState(null)
  const [email, setEmail] = useState('')
  const [system, setSystem] = useState('Edify')
  const [clusterId, setClusterId] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(null)   // {job_id, message}
  const [ferpaData, setFerpaData] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef()

  // Auto-fill system and cluster from URL params if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sysParam = params.get('system');
    const clusterParam = params.get('cluster');
    if (sysParam) setSystem(sysParam.charAt(0).toUpperCase() + sysParam.slice(1).toLowerCase());
    if (clusterParam) setClusterId(clusterParam);
  }, []);

  const emailValid = isInstitutionalEmail(email)
  const emailError = emailTouched && email.length > 0 && !emailValid

  const handleFile = (f) => {
    if (!f) return
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['csv', 'json'].includes(ext)) { setError('Only .csv and .json files are supported.'); return }
    setFile(f)
    setError(null)
    setSubmitted(null)
    setFerpaData(null)
  }

  const handleDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }

  const handleUpload = async (confirmed = false) => {
    if (!file || !emailValid) return
    setLoading(true)
    setError(null)
    try {
      // triggered_by_cluster context is passed here
      const triggerLabel = clusterId ? `Cluster #${clusterId}` : '';
      const data = await uploadSchema(file, confirmed, triggerLabel, email, system)
      if (data.ferpa_flag && !confirmed) {
        setFerpaData(data)
      } else if (data.detail) {
        setError(data.detail)
      } else {
        setSubmitted(data)
        setFerpaData(null)
      }
    } catch {
      setError('Upload failed. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = file && emailValid && !loading && !submitted

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 24px' }}>
      <h1 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 26, color: '#21314D', marginBottom: 6 }}>Schema Upload</h1>
      <p style={{ fontSize: 13, color: '#75757D', marginBottom: 28 }}>Upload a data file (CSV or JSON) to generate a data dictionary via Agent 2 local inference.</p>

      {clusterId && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 6, padding: '12px 16px', fontSize: 13, color: '#92400E', marginBottom: 24 }}>
          <strong>Autonomous Trigger Active:</strong> This upload is linked to <strong>Cluster #{clusterId}</strong>. 
          Categorization locked to <strong>{system}</strong> for automated delta analysis.
        </div>
      )}

      <div style={{ background: 'rgba(33,49,77,0.04)', border: '1px solid #CFDCE9', borderRadius: 6, padding: '12px 16px', fontSize: 13, color: '#21314D', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span>🔒</span>
        <span><strong>Local Inference Active</strong> — Schema data stays on-device. No data sent to external APIs.</span>
      </div>

      {/* System Selection */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#21314D', marginBottom: 6, fontFamily: 'Montserrat' }}>
          Target System
        </label>
        <select
          value={system}
          disabled={!!clusterId}
          onChange={e => setSystem(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            fontSize: 13,
            border: '1px solid #CFDCE9',
            borderRadius: 6,
            outline: 'none',
            fontFamily: 'inherit',
            color: '#21314D',
            background: clusterId ? '#F7FAFC' : '#fff',
            cursor: clusterId ? 'not-allowed' : 'pointer',
            boxSizing: 'border-box',
          }}
        >
          {["Edify", "Banner", "Canvas", "Workday", "OneDrive"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div style={{ fontSize: 11, color: '#75757D', marginTop: 4 }}>
          Categorizing the system ensures comparison against the correct baseline.
        </div>
      </div>

      {/* Email field */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#21314D', marginBottom: 6, fontFamily: 'Montserrat' }}>
          Institutional Email
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onBlur={() => setEmailTouched(true)}
          placeholder="you@mines.edu"
          style={{
            width: '100%',
            padding: '10px 14px',
            fontSize: 13,
            border: `1px solid ${emailError ? '#CC4628' : '#CFDCE9'}`,
            borderRadius: 6,
            outline: 'none',
            fontFamily: 'inherit',
            color: '#21314D',
            boxSizing: 'border-box',
          }}
        />
        {emailError && (
          <div style={{ fontSize: 12, color: '#CC4628', marginTop: 4 }}>
            Enter a valid email address.
          </div>
        )}
        {!emailError && emailValid && (
          <div style={{ fontSize: 12, color: '#4A8F3F', marginTop: 4 }}>
            Completed dictionary will be emailed here.
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{ border: '2px dashed #CFDCE9', borderRadius: 8, padding: '48px 24px', textAlign: 'center', cursor: 'pointer', background: file ? 'rgba(128,195,66,0.06)' : '#fff', transition: 'background 0.2s' }}
      >
        <input ref={inputRef} type="file" accept=".csv,.json" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
        {file ? (
          <div>
            <div style={{ fontFamily: 'Roboto Mono', fontSize: 14, color: '#21314D', fontWeight: 500 }}>{file.name}</div>
            <div style={{ fontSize: 12, color: '#81848A', marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB · click to change</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 15, color: '#21314D' }}>Drop schema file here</div>
            <div style={{ fontSize: 12, color: '#81848A', marginTop: 4 }}>or click to browse · .csv or .json</div>
          </div>
        )}
      </div>

      {canSubmit && (
        <button
          onClick={() => handleUpload(false)}
          style={{ marginTop: 16, background: '#09396C', color: '#fff', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, padding: '11px 24px', borderRadius: 6, border: 'none', cursor: 'pointer' }}
        >
          Generate Dictionary
        </button>
      )}

      {loading && (
        <div style={{ marginTop: 16, fontSize: 13, color: '#81848A' }}>Submitting…</div>
      )}

      {error && (
        <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(204,70,40,0.1)', border: '1px solid rgba(204,70,40,0.3)', borderRadius: 6, color: '#CC4628', fontSize: 13 }}>
          {error}
        </div>
      )}

      {ferpaData && (
        <div style={{ marginTop: 20, padding: '20px 24px', background: 'rgba(241,185,26,0.1)', border: '2px solid #F1B91A', borderRadius: 8 }}>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16, color: '#21314D', marginBottom: 8 }}>⚠ FERPA-Sensitive Fields Detected</div>
          <p style={{ fontSize: 13, color: '#21314D', marginBottom: 12 }}>The following fields may contain FERPA-protected data. Confirm to proceed with local-only generation:</p>
          <ul style={{ fontSize: 13, color: '#21314D', paddingLeft: 20, marginBottom: 16 }}>
            {ferpaData.sensitive_fields.map(f => <li key={f}>{f}</li>)}
          </ul>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleUpload(true)} style={{ background: '#09396C', color: '#fff', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 13, padding: '9px 18px', borderRadius: 6, border: 'none', cursor: 'pointer' }}>
              Confirm — Generate Locally
            </button>
            <button onClick={() => setFerpaData(null)} style={{ background: 'transparent', color: '#21314D', fontFamily: 'Montserrat', fontWeight: 600, fontSize: 13, padding: '8px 17px', borderRadius: 6, border: '1px solid #CFDCE9', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {submitted && (
        <div style={{ marginTop: 24, padding: '20px 24px', background: '#fff', border: '1px solid #80C342', borderRadius: 8 }}>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16, color: '#21314D', marginBottom: 6 }}>
            ✓ Submission received
          </div>
          <p style={{ fontSize: 13, color: '#75757D', marginBottom: 4 }}>
            {submitted.message}
          </p>
          <p style={{ fontSize: 12, color: '#81848A' }}>
            Job #{submitted.job_id} · A confirmation has been sent to <strong>{email}</strong>
          </p>
        </div>
      )}
    </div>
  )
}
