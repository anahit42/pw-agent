import React, { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import './App.css';

interface TraceFile {
  id: string;
  bucketName: string;
  originalZipPath: string;
  uploadedAt?: string;
}

const API_BASE = '/api/traces';

function App() {
  const [traceFiles, setTraceFiles] = useState<TraceFile[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<any>(null);

  const fetchTraces = async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}?page=1&limit=50`);
      const data = await res.json();
      setTraceFiles(data.traces || []);
      if (!selectedTraceId && data.traces && data.traces.length > 0) {
        setSelectedTraceId(data.traces[0].id);
      }
    } catch (err) {
      setError('Failed to fetch trace files');
    }
  };

  const fetchTraceDetails = async (id: string) => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/${id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch trace details');
      }
      const data = await res.json();
      setSelectedTrace(data);
    } catch (err: any) {
      setError(err.message);
      setSelectedTrace(null);
    }
  };

  useEffect(() => {
    fetchTraces();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (selectedTraceId) {
      fetchTraceDetails(selectedTraceId);
    }
    // eslint-disable-next-line
  }, [selectedTraceId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('trace', file);
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Upload failed');
      }
      setFile(null);
      await fetchTraces();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedTraceId) return;
    setAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const res = await fetch(`${API_BASE}/${selectedTraceId}/analyze`, { method: 'POST' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Analysis failed');
      }
      const data = await res.json();
      setAnalysisResult(data.result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="chatgpt-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span aria-label="rocket" style={{display: 'flex', alignItems: 'center', marginRight: 6}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 13a8 8 0 0 1 7 7a6 6 0 0 0 3 -5a9 9 0 0 0 6 -8a3 3 0 0 0 -3 -3a9 9 0 0 0 -8 6a6 6 0 0 0 -5 3" stroke="#b0bad6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 14a6 6 0 0 0 -3 6a6 6 0 0 0 6 -3" stroke="#b0bad6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="15" cy="9" r="1" fill="#b0bad6"/>
            </svg>
          </span> <b>Traces</b>
        </div>
        <form onSubmit={handleUpload} className="upload-form sidebar-upload-form">
          <input type="file" accept=".zip" onChange={handleFileChange} />
          <button type="submit" disabled={uploading || !file}>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
        <ul className="sidebar-list">
          {traceFiles.length === 0 && <li className="sidebar-empty">No traces</li>}
          {traceFiles.map((trace) => (
            <li
              key={trace.id}
              className={`sidebar-item${trace.id === selectedTraceId ? ' selected' : ''}`}
              onClick={() => {
                setSelectedTraceId(trace.id);
                setAnalysisResult(null);
                setError(null);
                fetchTraceDetails(trace.id);
              }}
            >
              <span role="img" aria-label="file">📄</span> {trace.id.slice(0, 8)}
            </li>
          ))}
        </ul>
      </aside>
      <main className="main-content">
        <div className="product-description" style={{ marginBottom: 24, color: '#b0bad6', fontSize: '1.1em' }}>
          <b>AI-powered Playwright trace analyzer:</b> Upload, analyze, and debug your Playwright test traces with ease.
        </div>
        {error && <div className="error">{error}</div>}
        {selectedTrace ? (
          <section className="trace-details">
            <h2>Trace Details</h2>
            <div><b>ID:</b> {selectedTrace.id}</div>
            <div><b>Bucket:</b> {selectedTrace.bucketName}</div>
            <div><b>Path:</b> {selectedTrace.originalZipPath}</div>
            <button
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={analyzing}
            >
              {analyzing ? 'Analyzing...' : 'Analyze'}
            </button>
            {(analysisResult || (selectedTrace.analyses ?? []).length > 0) && (
              <div className="analysis-result">
                <h3>Analyses</h3>
                {analysisResult && (
                    <div style={{marginBottom: 18}}>
                      <div><b>Summary:</b> {analysisResult.analysisJson?.summary}</div>
                      <div><b>Failed Step:</b> {analysisResult.analysisJson?.failedStep}</div>
                      <div><b>Error Reason:</b> {analysisResult.analysisJson?.errorReason}</div>
                      <div><b>Network Issues:</b> {analysisResult.analysisJson?.networkIssues}</div>
                      <div><b>Stack Analysis:</b> {analysisResult.analysisJson?.stackTraceAnalysis}</div>
                      <div><b>Correlated Events:</b> {analysisResult.analysisJson?.correlatedEvents}</div>
                      <div><b>Suggestions:</b> {analysisResult.analysisJson?.suggestions}</div>
                      <div style={{fontSize: '0.9em', color: '#888'}}><b>Analyzed At:</b> just now</div>
                      {((selectedTrace.analyses ?? []).length > 0) && (
                          <hr style={{border: 0, borderTop: '2px dashed #3a4660', margin: '22px 0'}}/>
                      )}
                    </div>
                )}
                {(selectedTrace.analyses ?? []).map((analysis: any, idx: number) => (
                    <div key={analysis.id} style={{marginBottom: 18}}>
                      <div><b>Summary:</b> {analysis.analysisJson?.summary}</div>
                      <div><b>Failed Step:</b> {analysis.analysisJson?.failedStep}</div>
                      <div><b>Error Reason:</b> {analysis.analysisJson?.errorReason}</div>
                      <div><b>Network Issues:</b> {analysis.analysisJson?.networkIssues}</div>
                      <div><b>Stack Analysis:</b> {analysis.analysisJson?.stackTraceAnalysis}</div>
                      <div><b>Correlated Events:</b> {analysis.analysisJson?.correlatedEvents}</div>
                      <div><b>Suggestions:</b> {analysis.analysisJson?.suggestions}</div>
                      <div style={{fontSize: '0.9em', color: '#888'}}><b>Analyzed At:</b> {analysis.analyzedAt}</div>
                      {idx < (selectedTrace.analyses ?? []).length - 1 && (
                          <hr style={{border: 0, borderTop: '2px dashed #3a4660', margin: '22px 0'}}/>
                      )}
                    </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <div className="no-trace">Select a trace from the sidebar to view details.</div>
        )}
      </main>
    </div>
  );
}

export default App;
