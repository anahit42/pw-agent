import React from 'react';
import styles from './SidebarUploadForm.module.css';

interface SidebarUploadFormProps {
  file: File | null;
  uploading: boolean;
  showUploadLoader: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isDragOver: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: (e: React.FormEvent) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  formatFileSize: (bytes: number) => string;
}

const SidebarUploadForm: React.FC<SidebarUploadFormProps> = ({
  file,
  uploading,
  showUploadLoader,
  fileInputRef,
  isDragOver,
  onFileChange,
  onUpload,
  onDragOver,
  onDragLeave,
  onDrop,
  formatFileSize,
}) => (
  <form
    onSubmit={onUpload}
    className={styles['sidebar-upload-form']}
  >
    <div
      className={[
        styles['file-drop-area'],
        isDragOver ? styles['drag-over'] : ''
      ].join(' ')}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        onChange={onFileChange}
        disabled={uploading}
        className={styles['file-input']}
      />
      {showUploadLoader ? (
        <div className={styles['sidebar-upload-progress']}>
          <span className={styles['spinner-small']}></span>
          <span>Uploading...</span>
        </div>
      ) : (
        <>
          <div className={styles['upload-icon']}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 3v4a1 1 0 0 0 1 1h4" stroke="#8b9bb4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" stroke="#8b9bb4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          {file ? (
            <>
              <div className={styles['upload-text']}>{file.name}</div>
              <div className={styles['upload-hint']}>{formatFileSize(file.size)}</div>
            </>
          ) : (
            <>
              <div className={styles['upload-text']}>Drop trace files here</div>
              <div className={styles['upload-subtext']}>or click to browse</div>
            </>
          )}
        </>
      )}
    </div>
    {file && !uploading && (
      <button type="submit" className={styles['sidebar-upload-btn']} disabled={uploading}>
        Upload
      </button>
    )}
  </form>
);

export default SidebarUploadForm; 