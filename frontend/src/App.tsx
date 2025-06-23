import React, { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import './App.css';
import { type Analysis } from './AnalysisResult';
import { io, Socket } from 'socket.io-client';
import TraceDetails from './TraceDetails';
import ErrorPopup from './ErrorPopup';

interface TraceFile {
  id: string;
  originalFileName: string;
  originalZipPath: string;
  uploadedAt?: string;
  size?: number;
  _count?: {
    analyses: number;
  };
}

interface DateGroup {
  date: string;
  label: string;
  traces: TraceFile[];
}

const API_BASE = '/api/traces';

function App() {
  const [traceFiles, setTraceFiles] = useState<TraceFile[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<Analysis | null>(null);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<any>(null);
  const [showUploadLoader, setShowUploadLoader] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [traceToDelete, setTraceToDelete] = useState<string | null>(null);
  const [queuedUploads, setQueuedUploads] = useState<Set<string>>(new Set());
  const [queuedAnalyses, setQueuedAnalyses] = useState<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);
  const userId = 'hardcodedUserId'; // Should match backend authMiddleware
  const uploadLock = useRef(false);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);

  const groupTracesByDate = (traces: TraceFile[]): DateGroup[] => {
    const groups: { [key: string]: TraceFile[] } = {};

    traces.forEach(trace => {
      const date = trace.uploadedAt ? new Date(trace.uploadedAt) : new Date();
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let groupKey: string;

      if (date.toDateString() === today.toDateString()) {
        groupKey = 'today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'yesterday';
      } else if (date.getTime() > today.getTime() - 7 * 24 * 60 * 60 * 1000) {
        groupKey = 'this-week';
      } else if (date.getTime() > today.getTime() - 30 * 24 * 60 * 60 * 1000) {
        groupKey = 'this-month';
      } else {
        groupKey = 'older';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(trace);
    });

    // Convert to array and sort by date
    const groupOrder = ['today', 'yesterday', 'this-week', 'this-month', 'older'];
    return groupOrder
      .filter(key => groups[key] && groups[key].length > 0)
      .map(key => ({
        date: key,
        label: key === 'today' ? 'Today' :
               key === 'yesterday' ? 'Yesterday' :
               key === 'this-week' ? 'This week' :
               key === 'this-month' ? 'This month' : 'Older',
        traces: groups[key].sort((a, b) => {
          const dateA = a.uploadedAt ? new Date(a.uploadedAt) : new Date(0);
          const dateB = b.uploadedAt ? new Date(b.uploadedAt) : new Date(0);
          return dateB.getTime() - dateA.getTime(); // Most recent first
        })
      }));
  };

  const fetchTraces = async (opts?: { preserveSelection?: boolean }) => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}?page=1&limit=50`);
      const data = await res.json();
      setTraceFiles(data.traces || []);
      if (!opts?.preserveSelection && !selectedTraceId && data.traces && data.traces.length > 0) {
        setSelectedTraceId(data.traces[0].id);
      }
      setQueuedUploads(prev => {
        const traceIds = new Set((data.traces || []).map((t: TraceFile) => String(t.id)));
        const newSet = new Set(prev);
        let changed = false;
        for (const id of prev) {
          if (traceIds.has(id)) {
            newSet.delete(id);
            changed = true;
          }
        }
        if (changed) {
          console.log('[fetchTraces] Cleaned up queuedUploads:', Array.from(newSet));
        }
        return newSet;
      });
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
      // Fetch analysis status if no analysis exists
      if (!data.analyses || data.analyses.length === 0) {
        try {
          const statusRes = await fetch(`/api/traces/${id}/analysis-status`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.status === 'active' || statusData.status === 'waiting' || statusData.status === 'delayed' || statusData.status === 'queued' || statusData.status === 'waiting-children') {
              setAnalysisStatus('processing');
              setQueuedAnalyses(prev => {
                const newSet = new Set(prev);
                newSet.add(id);
                return newSet;
              });
            } else {
              setAnalysisStatus(null);
              setQueuedAnalyses(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
              });
            }
          } else {
            setAnalysisStatus(null);
          }
        } catch {
          setAnalysisStatus(null);
        }
      } else {
        setAnalysisStatus(null);
        setQueuedAnalyses(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    } catch (err: any) {
      setError(err.message);
      setSelectedTrace(null);
      setAnalysisStatus(null);
    }
  };

  useEffect(() => {
    fetchTraces();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element).closest('.trace-dropdown')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  useEffect(() => {
    if (selectedTraceId) {
      fetchTraceDetails(selectedTraceId);
    }
    // eslint-disable-next-line
  }, [selectedTraceId]);

  useEffect(() => {
    // Prevent duplicate socket event handler registration
    if (socketRef.current && (socketRef.current as any)._handlerRegistered) return;
    // Connect to websocket server
    const socket = io('http://localhost:3000', {
      path: '/socket.io',
      query: { userId },
      transports: ['websocket'],
    });
    socketRef.current = socket;
    (socketRef.current as any)._handlerRegistered = true;

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('fileProcessed', (data: any) => {
      if (data && data.jobId && data.status === 'done') {
        setQueuedUploads(prev => {
          const newSet = new Set(prev);
          newSet.delete(String(data.jobId));
          return newSet;
        });
        fetchTraces({ preserveSelection: true });
        setSelectedTraceId(data.jobId);
      }
    });

    socket.on('analysisCompleted', (data: any) => {
      if (data && data.jobId && data.status === 'done') {
        setQueuedAnalyses(prev => {
          const newSet = new Set(prev);
          newSet.delete(String(data.jobId));
          return newSet;
        });
        fetchTraces({ preserveSelection: true });
        fetchTraceDetails(data.jobId);
        setSelectedTraceId(data.jobId);
      }
    });

    socket.on('jobError', (data: {
      jobType: string;
      jobId: string;
      userId: string;
      status: 'error',
      error: string;
      jobCategory: string;
    }) => {
      if (data && data.jobId && data.status === 'error') {
        setError(`${data.error}`);
        if (data.jobCategory === 'analysis') {
          setQueuedAnalyses(prev => {
            const newSet = new Set(prev);
            newSet.delete(String(data.jobId));
            return newSet;
          });
        } else {
          setQueuedUploads(prev => {
            const newSet = new Set(prev);
            newSet.delete(String(data.jobId));
            return newSet;
          });
        }
      }
    });

    return () => {
      socket.disconnect();
      (socketRef.current as any)._handlerRegistered = false;
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!error) return;
    const timeout = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timeout);
  }, [error]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = async (e: FormEvent) => {
    console.log('handleUpload called');
    e.preventDefault();
    if (uploadLock.current) return;
    uploadLock.current = true;
    if (!file) {
      uploadLock.current = false;
      return;
    }
    setUploading(true);
    setError(null);
    setShowUploadLoader(false);
    let loaderTimeout: NodeJS.Timeout | undefined;
    try {
      loaderTimeout = setTimeout(() => setShowUploadLoader(true), 400);
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

      const responseData = await res.json();

      if (res.status === 202 && responseData.status === 'queued') {
        setQueuedUploads(prev => {
          if (prev.has(String(responseData.traceId))) return prev;
          const newSet = new Set(prev);
          newSet.add(String(responseData.traceId));
          console.log('[Upload] Added to queuedUploads:', String(responseData.traceId), Array.from(newSet));
          return newSet;
        });
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        const { trace: newTrace } = responseData;
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await fetchTraces();
        setSelectedTraceId(newTrace.id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (loaderTimeout) clearTimeout(loaderTimeout);
      setUploading(false);
      setShowUploadLoader(false);
      uploadLock.current = false;
    }
  };

  const handleAnalyze = async () => {
    if (!selectedTrace) return;
    setAnalyzing(true);
    setError(null);
    try {
      const response = await fetch(`/api/traces/${selectedTrace.id}/analyze`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400 && errorData.analysis) {
          setAnalysisResult(errorData.analysis);
          await fetchTraceDetails(selectedTrace.id);
          await fetchTraces();
          return;
        }
        throw new Error(errorData.error || 'Failed to analyze trace');
      }
      // If analysis is queued, add to queuedAnalyses
      const responseData = await response.json();
      if (response.status === 202 && responseData.status === 'queued') {
        setQueuedAnalyses(prev => {
          const newSet = new Set(prev);
          newSet.add(selectedTrace.id);
          return newSet;
        });
      }
      setAnalysisResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDropdownToggle = (traceId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent trace selection
    setOpenDropdown(openDropdown === traceId ? null : traceId);
  };

  const handleRemoveClick = (traceId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenDropdown(null);
    setTraceToDelete(traceId);
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!traceToDelete) return;

    setDeleting(traceToDelete);
    setError(null);

    try {
      const response = await fetch(`/api/traces/${traceToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete trace');
      }

      // Remove from local state
      setTraceFiles(prev => prev.filter(trace => trace.id !== traceToDelete));

      // If the deleted trace was selected, clear selection
      if (selectedTraceId === traceToDelete) {
        setSelectedTraceId(null);
        setSelectedTrace(null);
        setAnalysisResult(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setDeleting(null);
      setShowConfirmModal(false);
      setTraceToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmModal(false);
    setTraceToDelete(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const getTraceStatus = (trace: TraceFile): 'READY' | null => {
    return trace._count && trace._count.analyses > 0 ? 'READY' : null;
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chatgpt-layout">
      <ErrorPopup error={error || ''} onClose={() => setError(null)} />
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

        <form
          onSubmit={handleUpload}
          className={`sidebar-upload-form`}
        >
          <div
            className={`file-drop-area ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileChange}
              disabled={uploading}
              className="file-input"
            />

            {showUploadLoader ? (
              <div className="sidebar-upload-progress">
                <span className="spinner-small"></span>
                <span>Uploading...</span>
              </div>
            ) : (
              <>
                <div className="upload-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 3v4a1 1 0 0 0 1 1h4" stroke="#8b9bb4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" stroke="#8b9bb4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                {file ? (
                  <>
                    <div className="upload-text">{file.name}</div>
                    <div className="upload-hint">{formatFileSize(file.size)}</div>
                  </>
                ) : (
                  <>
                    <div className="upload-text">Drop trace files here</div>
                    <div className="upload-subtext">or click to browse</div>
                  </>
                )}
              </>
            )}
          </div>

          {file && !uploading && (
            <button type="submit" className="sidebar-upload-btn" disabled={uploading}>
              Upload
            </button>
          )}
        </form>

        <div className="recent-traces-header">
          <h4>Recent Traces</h4>
          <span className="trace-count-badge">{traceFiles.length}</span>
        </div>

        {/* Show queued uploads */}
        {queuedUploads.size > 0 && (
          <div className="queued-uploads-section">
            <h4>Processing...</h4>
            <ul className="sidebar-list">
              {Array.from(queuedUploads).map((traceId) => (
                <li key={traceId} className="sidebar-item queued">
                  <div className="trace-item-icon">
                    <span className="spinner-small"></span>
                  </div>
                  <div className="trace-item-details">
                    <div className="trace-item-header">
                      <span className="trace-item-name">Processing...</span>
                      <span className="queued-tag">Queued</span>
                    </div>
                    <span className="trace-item-time">Extracting files...</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ul className="sidebar-list">
          {traceFiles.length === 0 && <li className="sidebar-empty">No traces</li>}
          {groupTracesByDate(traceFiles).map((group) => (
            <React.Fragment key={group.date}>
              <li className="sidebar-date-header">{group.label}</li>
              {group.traces.map((trace) => (
                <li
                  key={trace.id}
                  className={`sidebar-item${trace.id === selectedTraceId ? ' selected' : ''}`}
                  onClick={() => {
                    setSelectedTraceId(trace.id);
                    setAnalysisResult(null);
                    setError(null);
                  }}
                >
                  <div className="trace-item-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 12h2.5a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1 -2.5 2.5h-2.5a2.5 2.5 0 0 1 -2.5 -2.5v-4a2.5 2.5 0 0 1 2.5 -2.5z" stroke="#b0bad6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 3h2.5a2.5 2.5 0 0 1 2.5 2.5v13a2.5 2.5 0 0 1 -2.5 2.5h-2.5a2.5 2.5 0 0 1 -2.5 -2.5v-13a2.5 2.5 0 0 1 2.5 -2.5z" stroke="#b0bad6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 8h2.5a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1 -2.5 2.5h-2.5a2.5 2.5 0 0 1 -2.5 -2.5v-8a2.5 2.5 0 0 1 2.5 -2.5z" stroke="#b0bad6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div className="trace-item-details">
                    <div className="trace-item-header">
                      <span className="trace-item-name" title={trace.originalFileName}>{trace.originalFileName}</span>
                      {getTraceStatus(trace) === 'READY' && (
                        <span className="analyzed-tag">Analyzed</span>
                      )}
                    </div>
                    <span className="trace-item-time">{formatTime(trace.uploadedAt)}</span>
                  </div>
                  <div className="trace-item-actions">
                    <div className="trace-dropdown">
                      <button
                        className="trace-menu-btn"
                        onClick={(e) => handleDropdownToggle(trace.id, e)}
                        disabled={deleting === trace.id}
                        title="More options"
                      >
                        {deleting === trace.id ? (
                          <span className="spinner-small"></span>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="6" cy="12" r="1" fill="currentColor"/>
                            <circle cx="12" cy="12" r="1" fill="currentColor"/>
                            <circle cx="18" cy="12" r="1" fill="currentColor"/>
                          </svg>
                        )}
                      </button>
                      {openDropdown === trace.id && (
                        <div className="dropdown-menu">
                          <button
                            className="dropdown-item"
                            onClick={(e) => handleRemoveClick(trace.id, e)}
                            disabled={deleting === trace.id}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </React.Fragment>
          ))}
        </ul>
      </aside>
      <main className="main-content">
        <div className="product-description" style={{ marginBottom: 24, color: '#b0bad6', fontSize: '1.1em' }}>
          <b>AI-powered Playwright trace analyzer:</b> Upload, analyze, and debug your Playwright test traces with ease.
        </div>
        {selectedTrace ? (
          <TraceDetails
            selectedTrace={selectedTrace}
            analysisResult={analysisResult}
            analysisStatus={analysisStatus}
            queuedAnalyses={queuedAnalyses}
            analyzing={analyzing}
            formatFileSize={formatFileSize}
            handleAnalyze={handleAnalyze}
          />
        ) : (
          <div className="no-trace">Select a trace from the sidebar to view details.</div>
        )}
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="#ff4d6d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="modal-title">Delete Trace</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this trace? This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button
                className="modal-btn modal-btn-secondary"
                onClick={handleCancelDelete}
                disabled={deleting === traceToDelete}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleting === traceToDelete}
              >
                {deleting === traceToDelete ? (
                  <>
                    <span className="spinner-small"></span>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
