'use client';

import { DownloadIcon, TrashIcon } from '../icons';

interface DataControlsProps {
  onDownload?: () => void;
  onDelete?: () => void;
}

export function DataControls({ onDownload, onDelete }: DataControlsProps) { // code_id:265
  return (
    <div className="data-controls">
      <h2 className="data-controls-title">Your Data</h2>
      <div className="data-controls-buttons">
        <button
          type="button"
          className="data-controls-button"
          onClick={onDownload}
          data-testid="download-data-button"
        >
          <DownloadIcon width={18} height={18} />
          <span>Download All Data</span>
        </button>
        <button
          type="button"
          className="data-controls-button data-controls-button-danger"
          onClick={onDelete}
          data-testid="delete-account-button"
        >
          <TrashIcon width={18} height={18} />
          <span>Delete Account</span>
        </button>
      </div>
      <p className="data-controls-note">
        Downloading creates a JSON file with all your workbook data.
        Deleting your account is permanent and cannot be undone.
      </p>
    </div>
  );
}
