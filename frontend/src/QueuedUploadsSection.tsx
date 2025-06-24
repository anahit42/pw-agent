import React from 'react';

interface QueuedUploadsSectionProps {
  queuedUploads: Set<string>;
}

const QueuedUploadsSection: React.FC<QueuedUploadsSectionProps> = ({ queuedUploads }) => {
  if (queuedUploads.size === 0) return null;
  return (
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
  );
};

export default QueuedUploadsSection; 