import React from 'react';
import styles from './QueuedUploadsSection.module.css';

interface QueuedUploadsSectionProps {
  queuedUploads: Set<string>;
}

const QueuedUploadsSection: React.FC<QueuedUploadsSectionProps> = ({ queuedUploads }) => {
  if (queuedUploads.size === 0) return null;
  return (
    <div className={styles['queued-uploads-section']}>
      <h4>Processing...</h4>
      <ul className={styles['sidebar-list']}>
        {Array.from(queuedUploads).map((traceId) => (
          <li key={traceId} className={[styles['sidebar-item'], styles['queued']].join(' ')}>
            <div className={styles['trace-item-icon']}>
              <span className={styles['spinner-small']}></span>
            </div>
            <div className={styles['trace-item-details']}>
              <div className={styles['trace-item-header']}>
                <span className={styles['trace-item-name']}>Processing...</span>
                <span className={styles['queued-tag']}>Queued</span>
              </div>
              <span className={styles['trace-item-time']}>Extracting files...</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default QueuedUploadsSection; 