import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { getDb } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();
router.use(authRequired);

const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const chunkDir = path.join(uploadDir, 'chunks');
if (!fs.existsSync(chunkDir)) fs.mkdirSync(chunkDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

router.post('/single/:clientId', upload.single('file'), async (req, res) => {
  const db = await getDb();
  await db.run(
    'INSERT INTO UploadedFiles (ClientID, OriginalName, StoredPath) VALUES (?, ?, ?)',
    req.params.clientId,
    req.file.originalname,
    req.file.path
  );
  await db.run('INSERT INTO OnboardingHistory (ClientID, ActionType, ActionDetails, EditedBy) VALUES (?, ?, ?, ?)', req.params.clientId, 'File Upload', req.file.originalname, req.user.username);
  res.json({ ok: true, file: req.file.filename });
});

router.post('/chunk', async (req, res) => {
  const { uploadId, fileName, chunkIndex, totalChunks, data } = req.body;
  const dir = path.join(chunkDir, uploadId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${chunkIndex}.part`), Buffer.from(data, 'base64'));

  const parts = fs.readdirSync(dir).filter((f) => f.endsWith('.part'));
  if (parts.length === Number(totalChunks)) {
    const outPath = path.join(uploadDir, `${Date.now()}-${fileName}`);
    const writeStream = fs.createWriteStream(outPath);
    for (let i = 0; i < Number(totalChunks); i += 1) {
      writeStream.write(fs.readFileSync(path.join(dir, `${i}.part`)));
    }
    writeStream.end();
    fs.rmSync(dir, { recursive: true, force: true });
    return res.json({ ok: true, complete: true, path: outPath });
  }

  return res.json({ ok: true, complete: false, received: parts.length });
});

export default router;
