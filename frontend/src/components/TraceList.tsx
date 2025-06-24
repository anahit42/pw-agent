import React from 'react';

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

interface TraceListProps {
  traceFiles: TraceFile[];
  selectedTraceId: string | null;
  groupTracesByDate: (traces: TraceFile[]) => DateGroup[];
  getTraceStatus: (trace: TraceFile) => 'READY' | null;
  formatTime: (dateString?: string) => string;
  openDropdown: string | null;
  deleting: string | null;
  handleDropdownToggle: (traceId: string, event: React.MouseEvent) => void;
  handleRemoveClick: (traceId: string, event: React.MouseEvent) => void;
  setSelectedTraceId: (id: string) => void;
  setAnalysisResult: (result: any) => void;
  setError: (err: any) => void;
}

const TraceList: React.FC<TraceListProps> = ({
  traceFiles,
  selectedTraceId,
  groupTracesByDate,
  getTraceStatus,
  formatTime,
  openDropdown,
  deleting,
  handleDropdownToggle,
  handleRemoveClick,
  setSelectedTraceId,
  setAnalysisResult,
  setError,
}) => (
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
);

export default TraceList; 