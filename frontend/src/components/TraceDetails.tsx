import React from 'react';
import AnalysisResult, { type Analysis } from './AnalysisResult.tsx';
import styles from './TraceDetails.module.css';

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
    <section className={`${styles['trace-details']} ${styles['modern-trace-details']}`}>
      <div className={styles['trace-details-header']}>
        <span className={styles['trace-details-title']} title={selectedTrace.originalFileName}>
          {selectedTrace.originalFileName}
        </span>
      </div>
      <div className={styles['trace-details-info']}>
        {selectedTrace.uploadedAt && (
          <div className={styles['trace-info-row']}>
            <span className={styles['trace-info-label']} title="Uploaded">Uploaded:</span>
            <span className={styles['trace-info-value']}>{new Date(selectedTrace.uploadedAt).toLocaleString()}</span>
          </div>
        )}
        {selectedTrace.size && (
          <div className={styles['trace-info-row']}>
            <span className={styles['trace-info-label']} title="File Size">Size:</span>
            <span className={styles['trace-info-value']}>{formatFileSize(selectedTrace.size || 0)}</span>
          </div>
        )}
      </div>

      {(analysisResult || (selectedTrace.analyses ?? []).length > 0) ? (
        <div className={styles['analysis-result']}>
          <div className={styles['analysis-header']}>
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
          <div className={styles['analysis-actions']}>
            {/* Analysis button removed - only one analysis allowed per trace */}
          </div>
        </div>
      ) : (queuedAnalyses.has(selectedTrace.id) || analysisStatus === 'processing') ? (
        <div className={styles['analysis-loading']}>
          <div className={styles['analysis-loading-content']}>
            <div className={styles['analysis-loading-icon']}>
              <span className={styles['spinner']}></span>
            </div>
            <h3 className={styles['analysis-loading-h3']}>Analyzing Trace...</h3>
            <p className={styles['analysis-loading-p']}>AI is analyzing your Playwright trace to provide insights and debugging information.</p>
            <div className={styles['analysis-loading-steps']}>
              <div className={styles['loading-step']}>
                <span className={styles['step-icon']}>🔍</span>
                <span>Extracting trace data</span>
              </div>
              <div className={styles['loading-step']}>
                <span className={styles['step-icon']}>🧠</span>
                <span>Analyzing test failures</span>
              </div>
              <div className={styles['loading-step']}>
                <span className={styles['step-icon']}>💡</span>
                <span>Generating insights</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles['no-analysis-info']}>
          <div className={styles['no-analysis-icon']}>🔍</div>
          <h3>Ready to Analyze</h3>
          <p>Get insights from your Playwright trace (one-time analysis)</p>
          <button
            className={styles['analyze-action-btn']}
            onClick={handleAnalyze}
            disabled={analyzing}
          >
            {analyzing ? (
              <>
                <span className={styles['spinner']}></span>
                Analyzing Trace...
              </>
            ) : (
              <>
                <span className={styles['analyze-icon']}>⚡</span>
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