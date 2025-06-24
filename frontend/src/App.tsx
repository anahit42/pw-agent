import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { FormEvent } from 'react';
import './App.css';
import { type Analysis } from './components/AnalysisResult.tsx';
import TraceDetails from './components/TraceDetails.tsx';
import ErrorPopup from './components/ErrorPopup.tsx';
import SidebarUploadForm from './components/SidebarUploadForm.tsx';
import QueuedUploadsSection from './components/QueuedUploadsSection.tsx';
import TraceList from './components/TraceList.tsx';
import ConfirmDeleteModal from './components/ConfirmDeleteModal.tsx';
import { groupTracesByDate, formatFileSize, formatTime } from './utils';
import { useTraceSocket } from './useTraceSocket';

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
  const userId = 'hardcodedUserId'; // Should match backend authMiddleware
  const uploadLock = useRef(false);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);

  const fetchTraces = useCallback(async (opts?: { preserveSelection?: boolean }) => {
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err: unknown) {
      setError('Failed to fetch trace files');
    }
  }, [selectedTraceId]);

  const fetchTraceDetails = useCallback(async (id: string) => {
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
  }, []);

  const setSelectedTraceIdCallback = useCallback((id: string) => setSelectedTraceId(id), []);
  const setErrorCallback = useCallback((err: string | null) => setError(err), []);

  useTraceSocket({
    userId,
    setQueuedUploads,
    setQueuedAnalyses,
    fetchTraces,
    fetchTraceDetails,
    setSelectedTraceId: setSelectedTraceIdCallback,
    setError: setErrorCallback,
  });

  useEffect(() => {
    fetchTraces();
  }, [fetchTraces]);

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
    if (!error) return;
    const timeout = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timeout);
  }, [error]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
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

  return (
    <div className="chat-layout">
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

        <SidebarUploadForm
          file={file}
          uploading={uploading}
          showUploadLoader={showUploadLoader}
          fileInputRef={fileInputRef}
          isDragOver={isDragOver}
          onFileChange={handleFileChange}
          onUpload={handleUpload}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          formatFileSize={formatFileSize}
        />

        <div className="recent-traces-header">
          <h4>Recent Traces</h4>
          <span className="trace-count-badge">{traceFiles.length}</span>
        </div>

        <QueuedUploadsSection queuedUploads={queuedUploads} />

        <TraceList
          traceFiles={traceFiles}
          selectedTraceId={selectedTraceId}
          groupTracesByDate={groupTracesByDate}
          getTraceStatus={getTraceStatus}
          formatTime={formatTime}
          openDropdown={openDropdown}
          deleting={deleting}
          handleDropdownToggle={handleDropdownToggle}
          handleRemoveClick={handleRemoveClick}
          setSelectedTraceId={setSelectedTraceId}
          setAnalysisResult={setAnalysisResult}
          setError={setError}
        />
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

      <ConfirmDeleteModal
        show={showConfirmModal}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        deleting={deleting}
        traceToDelete={traceToDelete}
      />
    </div>
  );
}

export default App;
