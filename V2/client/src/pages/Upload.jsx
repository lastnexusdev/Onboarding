import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

export default function Upload() {
  const { token } = useParams();
  const [clientInfo, setClientInfo] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [maxSizeGB, setMaxSizeGB] = useState(15);
  const fileInputRef = useRef(null);
  const startTimeRef = useRef(0);
  const uploadedBytesRef = useRef(0);

  useEffect(() => {
    if (token) {
      api.getUploadInfo(token)
        .then(data => {
          if (data.error) setError(data.error);
          else {
            setClientInfo(data);
            setMaxSizeGB(data.maxUploadSizeGB || 15);
          }
        })
        .catch(err => setError(err.message));
    }
  }, [token]);

  const handleFileSelect = (selectedFile) => {
    const maxBytes = maxSizeGB * 1024 * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      setError(`File is too large. Maximum size is ${maxSizeGB}GB.`);
      return;
    }
    setFile(selectedFile);
    setSuccess('');
    setError('');
    setProgress(0);
    setSpeed(0);
    setEta('');
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragOver(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const removeFile = () => {
    setFile(null);
    setProgress(0);
    setSpeed(0);
    setEta('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateSpeedAndEta = (loaded, total) => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    if (elapsed > 0) {
      const bytesPerSec = loaded / elapsed;
      setSpeed(bytesPerSec);
      const remaining = total - loaded;
      const etaSec = remaining / bytesPerSec;
      if (etaSec > 60) {
        setEta(`${Math.floor(etaSec / 60)}m ${Math.floor(etaSec % 60)}s remaining`);
      } else {
        setEta(`${Math.floor(etaSec)}s remaining`);
      }
    }
  };

  const uploadRegular = (fileToUpload) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', fileToUpload);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setProgress(pct);
          updateSpeedAndEta(e.loaded, e.total);
        }
      });

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          try { reject(new Error(JSON.parse(xhr.responseText).error)); }
          catch { reject(new Error('Upload failed')); }
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));

      xhr.open('POST', `/api/uploads/${token}`);
      xhr.send(formData);
    });
  };

  const uploadChunked = async (fileToUpload) => {
    const totalChunks = Math.ceil(fileToUpload.size / CHUNK_SIZE);
    const fileName = fileToUpload.name;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileToUpload.size);
      const chunk = fileToUpload.slice(start, end);

      const formData = new FormData();
      formData.append('chunk', chunk, `${fileName}.part${i}`);
      formData.append('chunkIndex', i.toString());
      formData.append('totalChunks', totalChunks.toString());
      formData.append('fileName', fileName);

      const resp = await fetch(`/api/uploads/${token}/chunk`, {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || 'Chunk upload failed');
      }

      uploadedBytesRef.current = end;
      const pct = Math.round((end / fileToUpload.size) * 100);
      setProgress(pct);
      updateSpeedAndEta(end, fileToUpload.size);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');
    setSuccess('');
    setProgress(0);
    startTimeRef.current = Date.now();
    uploadedBytesRef.current = 0;

    try {
      if (file.size > 100 * 1024 * 1024) {
        await uploadChunked(file);
      } else {
        await uploadRegular(file);
      }
      setSuccess(`"${file.name}" uploaded successfully!`);
      setProgress(100);
      setFile(null);
    } catch (err) {
      setError(err.message || 'Upload failed');
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadAnother = () => {
    setSuccess('');
    setFile(null);
    setProgress(0);
    setSpeed(0);
    setEta('');
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      <div className="upload-box" style={{ maxWidth: 600 }}>
        <div className="upload-header">
          <h1 style={{ color: '#8B4513', marginBottom: 5 }}>Taxware File Upload</h1>
          {clientInfo && <p style={{ color: '#666', margin: 0 }}>Uploading for: <strong>{clientInfo.clientName}</strong></p>}
        </div>

        {error && <div className="alert alert-error" style={{ marginTop: 15 }}>{error}</div>}

        {success ? (
          <div style={{ marginTop: 20 }}>
            <div className="alert alert-success">{success}</div>
            <button className="btn btn-primary btn-full" onClick={handleUploadAnother} style={{ marginTop: 10 }}>
              Upload Another File
            </button>
          </div>
        ) : (
          <>
            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              style={{
                marginTop: 20,
                border: `2px dashed ${dragOver ? '#8B4513' : '#ccc'}`,
                borderRadius: 12,
                padding: '40px 20px',
                textAlign: 'center',
                cursor: uploading ? 'not-allowed' : 'pointer',
                background: dragOver ? '#fdf3e7' : '#fafafa',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontSize: 48, color: '#8B4513', marginBottom: 10 }}>&#x2601;</div>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#333', margin: 0 }}>
                Drag & Drop your file here
              </p>
              <p style={{ fontSize: 13, color: '#888', margin: '8px 0 0' }}>
                or click to browse
              </p>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleInputChange}
                style={{ display: 'none' }}
                disabled={uploading}
              />
            </div>

            {/* Selected File */}
            {file && (
              <div style={{
                marginTop: 15, padding: 12, background: '#f0f0f0', borderRadius: 8,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <strong>{file.name}</strong>
                  <span style={{ color: '#666', marginLeft: 10 }}>{formatSize(file.size)}</span>
                </div>
                {!uploading && (
                  <button onClick={removeFile} style={{
                    background: '#dc3545', color: 'white', border: 'none',
                    borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12
                  }}>
                    Remove
                  </button>
                )}
              </div>
            )}

            {/* Progress Bar */}
            {uploading && (
              <div style={{ marginTop: 15 }}>
                <div className="progress-bar-large">
                  <div className="progress-bar-inner" style={{ width: `${progress}%` }}>
                    {progress > 5 ? `${progress}%` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13, color: '#666' }}>
                  <span>{speed > 0 ? `${formatSize(speed)}/s` : 'Starting...'}</span>
                  <span>{eta || 'Calculating...'}</span>
                </div>
              </div>
            )}

            {/* Upload Button */}
            {file && !uploading && (
              <button className="btn btn-primary btn-full" onClick={handleUpload} style={{ marginTop: 15 }}>
                Upload File
              </button>
            )}

            {/* Info Box */}
            <div style={{
              marginTop: 20, padding: 12, background: '#fff3cd', borderRadius: 8,
              fontSize: 13, color: '#856404', border: '1px solid #ffc107'
            }}>
              <strong>Info:</strong> Max file size: {maxSizeGB}GB. Large files (&gt;100MB) are uploaded in chunks automatically.
            </div>
          </>
        )}

        <div style={{ marginTop: 20, textAlign: 'center', color: '#999', fontSize: 12 }}>
          &copy; {new Date().getFullYear()} Taxware Systems. Need help? Contact your technician.
        </div>
      </div>
    </div>
  );
}
