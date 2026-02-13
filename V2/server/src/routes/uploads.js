const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer for regular uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tokenDir = path.join(UPLOAD_DIR, req.params.token || 'unknown');
    if (!fs.existsSync(tokenDir)) {
      fs.mkdirSync(tokenDir, { recursive: true });
    }
    cb(null, tokenDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safeName);
  },
});

// Multer for chunk uploads - store in temp dir
const chunkStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(UPLOAD_DIR, req.params.token || 'unknown', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const safeName = (req.body.fileName || file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const chunkIndex = req.body.chunkIndex || 0;
    cb(null, `${safeName}.part${chunkIndex}`);
  },
});

function getMaxUploadSize(db) {
  const setting = db.prepare("SELECT SettingValue FROM AdminSettings WHERE SettingName = 'MaxUploadSizeGB'").get();
  return (setting ? parseInt(setting.SettingValue) || 15 : 15) * 1024 * 1024 * 1024;
}

const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });
const chunkUpload = multer({ storage: chunkStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/uploads/:token - Validate upload token and get client info + settings
router.get('/:token', (req, res) => {
  const db = req.db;
  const client = db.prepare('SELECT ClientID, ClientName FROM Onboarding WHERE UploadToken = ?').get(req.params.token);
  if (!client) {
    return res.status(404).json({ error: 'Invalid upload token' });
  }
  const maxSetting = db.prepare("SELECT SettingValue FROM AdminSettings WHERE SettingName = 'MaxUploadSizeGB'").get();
  const maxGB = maxSetting ? parseInt(maxSetting.SettingValue) || 15 : 15;
  res.json({ clientId: client.ClientID, clientName: client.ClientName, maxUploadSizeGB: maxGB });
});

// POST /api/uploads/:token - Regular file upload (for smaller files)
router.post('/:token', upload.single('file'), (req, res) => {
  const db = req.db;
  const client = db.prepare('SELECT ClientID FROM Onboarding WHERE UploadToken = ?').get(req.params.token);
  if (!client) {
    return res.status(404).json({ error: 'Invalid upload token' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Log to history
  try {
    db.prepare(
      'INSERT INTO OnboardingHistory (ClientID, ActionType, ActionDetails) VALUES (?, ?, ?)'
    ).run(client.ClientID, 'File Upload', `Client uploaded file: ${req.file.originalname}`);
  } catch {}

  res.json({ success: true, file: { name: req.file.originalname, size: req.file.size } });
});

// POST /api/uploads/:token/chunk - Chunked upload handler
router.post('/:token/chunk', chunkUpload.single('chunk'), (req, res) => {
  const db = req.db;
  const client = db.prepare('SELECT ClientID FROM Onboarding WHERE UploadToken = ?').get(req.params.token);
  if (!client) {
    return res.status(404).json({ error: 'Invalid upload token' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No chunk data received' });
  }

  const { chunkIndex, totalChunks, fileName } = req.body;
  const chunkIdx = parseInt(chunkIndex);
  const total = parseInt(totalChunks);
  const safeName = (fileName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const tempDir = path.join(UPLOAD_DIR, req.params.token, 'temp');
  const tokenDir = path.join(UPLOAD_DIR, req.params.token);

  // Check if all chunks are uploaded
  let allPresent = true;
  for (let i = 0; i < total; i++) {
    if (!fs.existsSync(path.join(tempDir, `${safeName}.part${i}`))) {
      allPresent = false;
      break;
    }
  }

  if (allPresent) {
    // Combine chunks
    const finalPath = path.join(tokenDir, safeName);
    const writeStream = fs.createWriteStream(finalPath);
    for (let i = 0; i < total; i++) {
      const chunkPath = path.join(tempDir, `${safeName}.part${i}`);
      const data = fs.readFileSync(chunkPath);
      writeStream.write(data);
      fs.unlinkSync(chunkPath);
    }
    writeStream.end();

    // Clean up temp dir if empty
    try {
      const remaining = fs.readdirSync(tempDir);
      if (remaining.length === 0) fs.rmdirSync(tempDir);
    } catch {}

    // Log to history
    try {
      db.prepare(
        'INSERT INTO OnboardingHistory (ClientID, ActionType, ActionDetails) VALUES (?, ?, ?)'
      ).run(client.ClientID, 'File Upload', `Client uploaded file: ${fileName}`);
    } catch {}

    return res.json({ success: true, complete: true, fileName });
  }

  res.json({ success: true, complete: false, chunkIndex: chunkIdx, totalChunks: total });
});

// GET /api/uploads/:token/files - List uploaded files
router.get('/:token/files', (req, res) => {
  const tokenDir = path.join(UPLOAD_DIR, req.params.token);
  if (!fs.existsSync(tokenDir)) {
    return res.json({ files: [] });
  }

  const files = fs.readdirSync(tokenDir)
    .filter(name => name !== 'temp')
    .map(name => {
      const stats = fs.statSync(path.join(tokenDir, name));
      return { name, size: stats.size, modified: stats.mtime };
    });

  res.json({ files });
});

// GET /api/uploads/:token/download/:filename - Download a file
router.get('/:token/download/:filename', (req, res) => {
  const safeName = req.params.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = path.join(UPLOAD_DIR, req.params.token, safeName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  res.download(filePath, req.params.filename);
});

module.exports = router;
