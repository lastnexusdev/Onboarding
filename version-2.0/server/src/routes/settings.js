import express from 'express';
import { getDb } from '../db.js';
import { authRequired, allowRoles } from '../middleware/auth.js';
import { calculateProgress } from '../services/progress.js';

const router = express.Router();
router.use(authRequired);

router.get('/', allowRoles('admin', 'sales'), async (_req, res) => {
  const db = await getDb();
  const settings = await db.all('SELECT Setting_Name, Setting_Value FROM admin_settings');
  const packages = await db.all('SELECT * FROM CustomPackages ORDER BY PackageName');
  res.json({ settings, packages });
});

router.put('/:name', allowRoles('admin', 'sales'), async (req, res) => {
  const db = await getDb();
  const { value } = req.body;
  const name = req.params.name;

  await db.run(
    `INSERT INTO admin_settings (Setting_Name, Setting_Value, UserID)
     VALUES (?, ?, ?)
     ON CONFLICT(Setting_Name) DO UPDATE SET Setting_Value=excluded.Setting_Value, UserID=excluded.UserID`,
    name,
    String(value),
    req.user.userId
  );

  if (name === 'NewSoftwareRelease') {
    const clients = await db.all('SELECT * FROM Onboarding');
    const settings = Object.fromEntries((await db.all('SELECT Setting_Name, Setting_Value FROM admin_settings')).map((r) => [r.Setting_Name, r.Setting_Value]));
    for (const c of clients) {
      const progress = calculateProgress(c, settings);
      await db.run('UPDATE Onboarding SET Progress=? WHERE ClientID=?', progress, c.ClientID);
    }
  }

  res.json({ ok: true });
});

router.post('/packages', allowRoles('admin', 'sales'), async (req, res) => {
  const db = await getDb();
  const { packageName, packageDescription, programs } = req.body;
  await db.run('INSERT INTO CustomPackages (PackageName, PackageDescription, Programs) VALUES (?, ?, ?)', packageName, packageDescription || '', JSON.stringify(programs || []));
  res.status(201).json({ ok: true });
});

router.delete('/packages/:id', allowRoles('admin', 'sales'), async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM CustomPackages WHERE PackageID = ?', req.params.id);
  res.json({ ok: true });
});

export default router;
