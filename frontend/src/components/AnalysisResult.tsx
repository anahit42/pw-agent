import styles from './AnalysisResult.module.css';

export interface AnalysisJson {
  summary: string;
  failedStep: string;
  errorReason: string;
  networkIssues: string;
  stackTraceAnalysis: string;
  suggestions: string;
  correlatedEvents: string;
}

export interface Analysis {
  id?: string;
  analysisJson: AnalysisJson;
  analyzedAt?: string;
}

function AnalysisResult({ analysis, analyzedAt }: { analysis: Analysis, analyzedAt: string }) {
  const { analysisJson } = analysis;
  return (
    <div className={styles['analysis-result']}>
      {/* Summary Section (not a card) */}
      <div className={styles['summary-section']}>
        <div className={styles['section-title']}>
          <span role="img" aria-label="summary">📝</span> Summary
        </div>
        <div className={styles['row']}>
          <span className={styles['summary-value']}>{analysisJson.summary || <i>No summary</i>}</span>
        </div>
      </div>
      {/* Failure Details Card */}
      <div className={`${styles['section-card']} ${styles['failure-section']}`}>
        <div className={styles['failure-title']}>
          <span role="img" aria-label="failed step">❌</span> Failure Details
        </div>
        <div className={styles['failure-block']}>
          <span role="img" aria-label="step">🪜</span>
          {analysisJson.failedStep || <i>Step: None</i>}
        </div>
        <div className={styles['failure-block']}>
          <span role="img" aria-label="reason">💥</span>
          {analysisJson.errorReason || <i>Reason: None</i>}
        </div>
        <div className={styles['failure-block']}>
          <span role="img" aria-label="network">🌐</span>
          {analysisJson.networkIssues || <i>Network Issues: none</i>}
        </div>
      </div>
      {/* Stack & Correlation Card */}
      <div className={`${styles['section-card']} ${styles['stack-section']}`}>
        <div className={styles['section-title']}>
          <span role="img" aria-label="stack">🧩</span> Stack & Correlation
        </div>
        <div className={styles['stack-block']}>
          <span role="img" aria-label="stack-analysis">🪜</span>
          {analysisJson.stackTraceAnalysis || <i>Stack: None</i>}
        </div>
        <div className={styles['stack-block']}>
          <span role="img" aria-label="correlated-events">🔗</span>
          {analysisJson.correlatedEvents || <i>Correlation: None</i>}
        </div>
      </div>
      {/* Suggestions Section (not a card) */}
      <div className={styles['suggestions-section']}>
        <div className={styles['section-title']}>
          <span role="img" aria-label="bulb">💡</span> Suggestions
        </div>
        <div className={styles['row']}>
          <span className={styles['value']}>{analysisJson.suggestions || <i>None</i>}</span>
        </div>
      </div>
      {/* Analyzed At (subtle, bottom) */}
      <div className={styles['analyzed-at-row']}>
        <span className={styles['analyzed-at-label']}>Analyzed At:</span>
        <span className={styles['analyzed-at-value']}>{analyzedAt}</span>
      </div>
    </div>
  );
}

export default AnalysisResult;