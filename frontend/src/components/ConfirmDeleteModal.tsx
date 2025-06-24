import React from 'react';
import styles from './ConfirmDeleteModal.module.css';

interface ConfirmDeleteModalProps {
  show: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  deleting: string | null;
  traceToDelete: string | null;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  show,
  onCancel,
  onConfirm,
  deleting,
  traceToDelete,
}) => {
  if (!show) return null;
  return (
    <div className={styles['modal-overlay']} onClick={onCancel}>
      <div className={styles['modal-content']} onClick={(e) => e.stopPropagation()}>
        <div className={styles['modal-header']}>
          <div className={styles['modal-icon']}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="#ff4d6d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className={styles['modal-title']}>Delete Trace</h3>
        </div>
        <div className={styles['modal-body']}>
          <p>Are you sure you want to delete this trace? This action cannot be undone.</p>
        </div>
        <div className={styles['modal-actions']}>
          <button
            className={`${styles['modal-btn']} ${styles['modal-btn-secondary']}`}
            onClick={onCancel}
            disabled={deleting === traceToDelete}
          >
            Cancel
          </button>
          <button
            className={`${styles['modal-btn']} ${styles['modal-btn-danger']}`}
            onClick={onConfirm}
            disabled={deleting === traceToDelete}
          >
            {deleting === traceToDelete ? (
              <>
                <span className={styles['spinner-small']}></span>
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal; 