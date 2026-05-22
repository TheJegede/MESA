import React, { useState, useRef } from 'react'
import { uploadSchema } from '../api/mesa'

export default function SchemaUpload() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [ferpaData, setFerpaData] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef()

  const handleFile = (f) => {
    if (!f) return
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['csv', 'json'].includes(ext)) { setError('Only .csv and .json files are supported.'); return }
    setFile(f)
    setError(null)
    setResult(null)
    setFerpaData(null)
  }

  const handleDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }

  const handleUpload = async (confirmed = false) => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const data = await uploadSchema(file, confirmed)
      if (data.ferpa_flag && !confirmed) {
        setFerpaData(data)
      } else {
        setResult(data)
        setFerpaData(null)
      }
    } catch (e) {
      setError('Upload failed. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 24px' }}>
      <h1 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 26, color: '#21314D', marginBottom: 6 }}>Schema Upload</h1>
      <p style={{ fontSize: 13, color: '#75757D', marginBottom: 28 }}>Upload a database schema (CSV or JSON) to generate an Edify data dictionary via Agent 2.</p>

      <div style={{ background: 'rgba(33,49,77,0.04)', border: '1px solid #CFDCE9', borderRadius: 6, padding: '12px 16px', fontSize: 13, color: '#21314D', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span>🔒</span>
        <span><strong>Local Inference Active</strong> — Schema data stays on-device. No data sent to external APIs.</span>
      </div>

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

      {file && !loading && !result && (
        <button
          onClick={() => handleUpload(false)}
          style={{ marginTop: 16, background: '#09396C', color: '#fff', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 14, padding: '11px 24px', borderRadius: 6, border: 'none', cursor: 'pointer' }}
        >
          Generate Dictionary
        </button>
      )}

      {loading && <div style={{ marginTop: 16, fontSize: 13, color: '#81848A' }}>Generating dictionary… (this may take 1-3 minutes)</div>}

      {error && <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(204,70,40,0.1)', border: '1px solid rgba(204,70,40,0.3)', borderRadius: 6, color: '#CC4628', fontSize: 13 }}>{error}</div>}

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

      {result && (
        <div style={{ marginTop: 24, padding: '20px 24px', background: '#fff', border: '1px solid #CFDCE9', borderRadius: 8 }}>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16, color: '#21314D', marginBottom: 6 }}>✓ Dictionary Generated</div>
          <p style={{ fontSize: 13, color: '#75757D' }}>{result.entry_count} fields documented. Artifact sent to advisor email.</p>
        </div>
      )}
    </div>
  )
}
