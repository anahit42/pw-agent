import React from 'react';

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

const valueStyle: React.CSSProperties = {
  color: '#e0e6f0',
  marginLeft: 8,
  whiteSpace: 'pre-line',
};

const summaryValueStyle: React.CSSProperties = {
  color: '#e0e6f0',
  marginLeft: 8,
  whiteSpace: 'pre-line',
  fontSize: '1.18em',
  fontWeight: 600,
  lineHeight: 1.5,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  marginBottom: 10,
};

const cardStyle: React.CSSProperties = {
  background: '#232a3a',
  borderRadius: 12,
  boxShadow: '0 2px 8px rgba(10,16,32,0.10)',
  padding: 20,
  marginBottom: 18,
  maxWidth: 700,
};

const sectionTitleStyle: React.CSSProperties = {
  color: '#7ecfff',
  fontWeight: 700,
  fontSize: '1.08em',
  margin: '10px 0 14px 0',
  letterSpacing: 0.2,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const failureSectionStyle: React.CSSProperties = {
  background: 'rgba(176,0,32,0.10)',
  borderRadius: 10,
  padding: '16px 18px',
  margin: '18px 0',
  boxShadow: '0 2px 8px rgba(176,0,32,0.08)',
  borderLeft: '4px solid #b00020',
};

const failureTitleStyle: React.CSSProperties = {
  color: '#ff4d6d',
  fontWeight: 800,
  fontSize: '1.13em',
  marginBottom: 10,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const failureBlockStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: '1.08em',
  color: '#e0e6f0',
  marginBottom: 8,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const stackSectionStyle: React.CSSProperties = {
  background: 'rgba(126,207,255,0.08)',
  borderRadius: 10,
  padding: '16px 18px',
  margin: '18px 0',
  boxShadow: '0 2px 8px rgba(126,207,255,0.07)',
  borderLeft: '4px solid #7ecfff',
};

const stackBlockStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: '1.08em',
  color: '#e0e6f0',
  marginBottom: 8,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

function AnalysisResult({ analysis, analyzedAt }: { analysis: Analysis, analyzedAt: string }) {
  const { analysisJson } = analysis;
  return (
    <div style={cardStyle}>
      <div style={sectionTitleStyle}>
        <span role="img" aria-label="summary">📝</span> Summary
      </div>
      <div style={rowStyle}>
        <span style={summaryValueStyle}>{analysisJson.summary || <i>No summary</i>}</span>
      </div>
      <div style={failureSectionStyle}>
        <div style={failureTitleStyle}>
          <span role="img" aria-label="failed step">❌</span> Failure Details
        </div>
        <div style={failureBlockStyle}>
          <span role="img" aria-label="step">🪜</span>
          {analysisJson.failedStep || <i>Step: None</i>}
        </div>
        <div style={failureBlockStyle}>
          <span role="img" aria-label="reason">💥</span>
          {analysisJson.errorReason || <i>Reason: None</i>}
        </div>
        <div style={failureBlockStyle}>
          <span role="img" aria-label="network">🌐</span>
          {analysisJson.networkIssues || <i>Network Issues: none</i>}
        </div>
      </div>
      <div style={stackSectionStyle}>
        <div style={sectionTitleStyle}>
          <span role="img" aria-label="stack">🧩</span> Stack & Correlation
        </div>
        <div style={stackBlockStyle}>
          <span role="img" aria-label="stack-analysis">🪜</span>
          {analysisJson.stackTraceAnalysis || <i>Stack: None</i>}
        </div>
        <div style={stackBlockStyle}>
          <span role="img" aria-label="correlated-events">🔗</span>
          {analysisJson.correlatedEvents || <i>Correlation: None</i>}
        </div>
      </div>
      <div style={sectionTitleStyle}>
        <span role="img" aria-label="bulb">💡</span> Suggestions
      </div>
      <div style={rowStyle}>
        <span style={valueStyle}>{analysisJson.suggestions || <i>None</i>}</span>
      </div>
      <div style={{...rowStyle, marginTop: 18, fontSize: '0.95em', color: '#8fa1c7'}}>
        <span style={{fontWeight: 500}}>Analyzed At:</span>
        <span style={{marginLeft: 8}}>{analyzedAt}</span>
      </div>
    </div>
  );
}

export default AnalysisResult;