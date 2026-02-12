import dotenv from 'dotenv';
import app from './app.js';
import { initDb } from './initDb.js';

dotenv.config();
process.env.JWT_SECRET ||= 'dev-secret-change-me';

const PORT = process.env.PORT || 4000;

await initDb();

app.listen(PORT, () => {
  console.log(`onboarding-v2 server listening on ${PORT}`);
});
