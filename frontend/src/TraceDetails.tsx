import React from 'react';
import AnalysisResult, { type Analysis } from './AnalysisResult';

interface TraceFile {
  id: string;
  originalFileName: string;
  originalZipPath: string;
  uploadedAt?: string;
  size?: number;
  analyses?: Analysis[];
}

interface TraceDetailsProps {
  selectedTrace: TraceFile;
  analysisResult: Analysis | null;
  analysisStatus: string | null;
  queuedAnalyses: Set<string>;
  analyzing: boolean;
  formatFileSize: (bytes: number) => string;
  handleAnalyze: () => void;
}

const TraceDetails: React.FC<TraceDetailsProps> = ({
  selectedTrace,
  analysisResult,
  analysisStatus,
  queuedAnalyses,
  analyzing,
  formatFileSize,
  handleAnalyze,
}) => {
  return (
    <section className="trace-details modern-trace-details">
      <div className="trace-details-header">
        <span className="trace-details-title" title={selectedTrace.originalFileName}>
          {selectedTrace.originalFileName}
        </span>
      </div>
      <div className="trace-details-info">
        {selectedTrace.uploadedAt && (
          <div className="trace-info-row">
            <span className="trace-info-label" title="Uploaded">Uploaded:</span>
            <span className="trace-info-value">{new Date(selectedTrace.uploadedAt).toLocaleString()}</span>
          </div>
        )}
        {selectedTrace.size && (
          <div className="trace-info-row">
            <span className="trace-info-label" title="File Size">Size:</span>
            <span className="trace-info-value">{formatFileSize(selectedTrace.size || 0)}</span>
          </div>
        )}
      </div>

      {(analysisResult || (selectedTrace.analyses ?? []).length > 0) ? (
        <div className="analysis-result">
          <div className="analysis-header">
            <h3>Analyses</h3>
          </div>
          {analysisResult && (
            <>
              <AnalysisResult analysis={analysisResult} analyzedAt="just now" />
              {((selectedTrace.analyses ?? []).length > 0) && (
                <hr style={{border: 0, borderTop: '2px dashed #3a4660', margin: '22px 0'}}/>
              )}
            </>
          )}
          {(selectedTrace.analyses ?? []).map((analysis: Analysis, idx: number) => (
            <React.Fragment key={analysis.id}>
              <AnalysisResult analysis={analysis} analyzedAt={analysis.analyzedAt ?? ''} />
              {idx < (selectedTrace.analyses ?? []).length - 1 && (
                <hr style={{border: 0, borderTop: '2px dashed #3a4660', margin: '22px 0'}}/>
              )}
            </React.Fragment>
          ))}
          <div className="analysis-actions">
            {/* Analysis button removed - only one analysis allowed per trace */}
          </div>
        </div>
      ) : (queuedAnalyses.has(selectedTrace.id) || analysisStatus === 'processing') ? (
        <div className="analysis-loading">
          <div className="analysis-loading-content">
            <div className="analysis-loading-icon">
              <span className="spinner"></span>
            </div>
            <h3>Analyzing Trace...</h3>
            <p>AI is analyzing your Playwright trace to provide insights and debugging information.</p>
            <div className="analysis-loading-steps">
              <div className="loading-step">
                <span className="step-icon">🔍</span>
                <span>Extracting trace data</span>
              </div>
              <div className="loading-step">
                <span className="step-icon">🧠</span>
                <span>Analyzing test failures</span>
              </div>
              <div className="loading-step">
                <span className="step-icon">💡</span>
                <span>Generating insights</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="no-analysis-info">
          <div className="no-analysis-icon">🔍</div>
          <h3>Ready to Analyze</h3>
          <p>Get insights from your Playwright trace (one-time analysis)</p>
          <button
            className="analyze-action-btn"
            onClick={handleAnalyze}
            disabled={analyzing}
          >
            {analyzing ? (
              <>
                <span className="spinner"></span>
                Analyzing Trace...
              </>
            ) : (
              <>
                <span className="analyze-icon">⚡</span>
                Start Analysis
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
};

export default TraceDetails; 