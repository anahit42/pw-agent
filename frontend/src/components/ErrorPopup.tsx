import React from 'react';
import styles from './ErrorPopup.module.css';

interface ErrorPopupProps {
  error: string;
  onClose: () => void;
}

const ErrorPopup: React.FC<ErrorPopupProps> = ({ error, onClose }) => {
  if (!error) return null;
  return (
    <div className={styles['error-popup']}>
      <span className={styles['error-popup__icon']}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="12" fill="#1976d2"/><path d="M12 7v5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16" r="1" fill="#fff"/></svg>
      </span>
      <span className={styles['error-popup__message']}>{error}</span>
      <button
        className={styles['error-popup__close']}
        onClick={onClose}
        aria-label="Close error popup"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M6 6l8 8M6 14L14 6" stroke="#174ea6" strokeWidth="2" strokeLinecap="round"/></svg>
      </button>
    </div>
  );
};

export default ErrorPopup; 