const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer for chunked uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tokenDir = path.join(UPLOAD_DIR, req.params.token || 'unknown');
    if (!fs.existsSync(tokenDir)) {
      fs.mkdirSync(tokenDir, { recursive: true });
    }
    cb(null, tokenDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename to prevent path traversal
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
});

// GET /api/uploads/:token - Validate upload token and get client info
router.get('/:token', (req, res) => {
  const db = req.db;
  const client = db.prepare('SELECT ClientID, ClientName FROM Onboarding WHERE UploadToken = ?').get(req.params.token);
  if (!client) {
    return res.status(404).json({ error: 'Invalid upload token' });
  }
  res.json({ clientId: client.ClientID, clientName: client.ClientName });
});

// POST /api/uploads/:token - Upload file(s)
router.post('/:token', upload.array('files', 20), (req, res) => {
  const db = req.db;
  const client = db.prepare('SELECT ClientID FROM Onboarding WHERE UploadToken = ?').get(req.params.token);
  if (!client) {
    return res.status(404).json({ error: 'Invalid upload token' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const uploaded = req.files.map(f => ({
    name: f.originalname,
    size: f.size,
    path: f.filename,
  }));

  res.json({ success: true, files: uploaded });
});

// POST /api/uploads/:token/chunk - Chunked upload handler
router.post('/:token/chunk', upload.single('chunk'), (req, res) => {
  const db = req.db;
  const client = db.prepare('SELECT ClientID FROM Onboarding WHERE UploadToken = ?').get(req.params.token);
  if (!client) {
    return res.status(404).json({ error: 'Invalid upload token' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No chunk data received' });
  }

  const { chunkIndex, totalChunks, fileName } = req.body;

  res.json({
    success: true,
    chunkIndex: parseInt(chunkIndex),
    totalChunks: parseInt(totalChunks),
    fileName,
  });
});

// GET /api/uploads/:token/files - List uploaded files
router.get('/:token/files', (req, res) => {
  const tokenDir = path.join(UPLOAD_DIR, req.params.token);
  if (!fs.existsSync(tokenDir)) {
    return res.json({ files: [] });
  }

  const files = fs.readdirSync(tokenDir).map(name => {
    const stats = fs.statSync(path.join(tokenDir, name));
    return { name, size: stats.size, modified: stats.mtime };
  });

  res.json({ files });
});

module.exports = router;
