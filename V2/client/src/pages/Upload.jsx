import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';

export default function Upload() {
  const { token } = useParams();
  const [clientInfo, setClientInfo] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (token) {
      api.getUploadInfo(token)
        .then(data => {
          if (data.error) setError(data.error);
          else setClientInfo(data);
        })
        .catch(err => setError(err.message));
    }
  }, [token]);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setSuccess('');
    setError('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (files.length === 0) return;

    setUploading(true);
    setError('');
    setSuccess('');
    setProgress(0);

    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));

      const res = await api.uploadFiles(token, formData);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setSuccess(`${data.files.length} file(s) uploaded successfully!`);
        setFiles([]);
        const input = document.getElementById('fileInput');
        if (input) input.value = '';
      }
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(100);
    }
  };

  if (!token) {
    return (
      <div className="upload-container">
        <div className="upload-box">
          <h1>File Upload</h1>
          <p>No upload token provided. Please use the link provided by your technician.</p>
        </div>
      </div>
    );
  }

  if (error && !clientInfo) {
    return (
      <div className="upload-container">
        <div className="upload-box">
          <h1>File Upload</h1>
          <div className="alert alert-error">{error}</div>
          <p>The upload link may be invalid or expired. Please contact your technician.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-container">
      <div className="upload-box">
        <div className="upload-header">
          <img src="https://kb.taxwaresystems.com/logo.png" alt="Taxware" className="upload-logo" />
          <h1>File Upload</h1>
          {clientInfo && <p>Uploading files for: <strong>{clientInfo.clientName}</strong></p>}
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleUpload}>
          <div className="form-group">
            <label>Select Files</label>
            <input
              id="fileInput"
              type="file"
              multiple
              onChange={handleFileChange}
            />
          </div>

          {files.length > 0 && (
            <div className="file-list">
              <h4>Selected Files:</h4>
              <ul>
                {files.map((f, i) => (
                  <li key={i}>{f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)</li>
                ))}
              </ul>
            </div>
          )}

          {uploading && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={uploading || files.length === 0}>
            {uploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </form>
      </div>
    </div>
  );
}
