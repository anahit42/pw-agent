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

const sectionCardStyle: React.CSSProperties = {
  background: '#232a3a',
  borderRadius: 14,
  boxShadow: '0 2px 8px rgba(10,16,32,0.08)',
  padding: 22,
  marginBottom: 22,
  border: '1px solid #232a3a',
  maxWidth: 700,
};

const sectionTitleStyle: React.CSSProperties = {
  color: '#a3c9e8',
  fontWeight: 600,
  fontSize: '1.07em',
  margin: '8px 0 10px 0',
  letterSpacing: 0.1,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const failureSectionStyle: React.CSSProperties = {
  ...sectionCardStyle,
  background: 'rgba(176,0,32,0.04)',
  boxShadow: '0 1px 4px rgba(176,0,32,0.04)',
  borderLeft: '2px solid #b36a6a',
  paddingLeft: 26,
};

const failureTitleStyle: React.CSSProperties = {
  color: '#e07a88',
  fontWeight: 700,
  fontSize: '1.08em',
  marginBottom: 8,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const failureBlockStyle: React.CSSProperties = {
  fontWeight: 500,
  fontSize: '1.04em',
  color: '#e0e6f0',
  marginBottom: 6,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const stackSectionStyle: React.CSSProperties = {
  ...sectionCardStyle,
  background: 'rgba(126,207,255,0.04)',
  boxShadow: '0 1px 4px rgba(126,207,255,0.04)',
  borderLeft: '2px solid #7ecfff',
  paddingLeft: 26,
};

const stackBlockStyle: React.CSSProperties = {
  fontWeight: 500,
  fontSize: '1.04em',
  color: '#e0e6f0',
  marginBottom: 6,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

function AnalysisResult({ analysis, analyzedAt }: { analysis: Analysis, analyzedAt: string }) {
  const { analysisJson } = analysis;
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 0}}>
      {/* Summary Section (not a card) */}
      <div style={{marginBottom: 18}}>
        <div style={sectionTitleStyle}>
          <span role="img" aria-label="summary">📝</span> Summary
        </div>
        <div style={rowStyle}>
          <span style={summaryValueStyle}>{analysisJson.summary || <i>No summary</i>}</span>
        </div>
      </div>
      {/* Failure Details Card */}
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
      {/* Stack & Correlation Card */}
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
      {/* Suggestions Section (not a card) */}
      <div style={{margin: '22px 0 0 0'}}>
        <div style={sectionTitleStyle}>
          <span role="img" aria-label="bulb">💡</span> Suggestions
        </div>
        <div style={rowStyle}>
          <span style={valueStyle}>{analysisJson.suggestions || <i>None</i>}</span>
        </div>
      </div>
      {/* Analyzed At (subtle, bottom) */}
      <div style={{...rowStyle, marginTop: 18, fontSize: '0.95em', color: '#8fa1c7', justifyContent: 'flex-end'}}>
        <span style={{fontWeight: 400}}>Analyzed At:</span>
        <span style={{marginLeft: 8}}>{analyzedAt}</span>
      </div>
    </div>
  );
}

export default AnalysisResult;