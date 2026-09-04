// Dumps every Firestore collection to a single timestamped JSON file.
// Run manually with `npx tsx scripts/backup-firestore.ts`, or on a schedule
// via .github/workflows/firestore-backup.yml (see that file for how the
// output gets retained). If Cloud Storage is enabled for this project, the
// export is also uploaded to a `backups/` folder there for longer-term
// retention than CI artifacts provide; otherwise it's just written locally.
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import config from '../firebase-applet-config.json';

const COLLECTIONS = [
  'users', 'profiles', 'documents', 'drivers', 'driverProfiles',
  'complaints', 'evidence', 'disputes', 'riskScores', 'auditLogs',
  'searchLogs', 'driverLinkRequests', 'simulatedEmails', 'driverReviews',
  'notifications', 'incidentChatMessages', 'driverDocuments', 'vehicleListings',
  'sessions', 'resetTokens',
];

async function main() {
  const credential = process.env.GOOGLE_APPLICATION_CREDENTIALS ? cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) : applicationDefault();
  const app = initializeApp({ credential, projectId: config.projectId, storageBucket: config.storageBucket });
  const db = getFirestore(app);

  const dump: Record<string, any[]> = {};
  let totalDocs = 0;
  for (const name of COLLECTIONS) {
    const snap = await db.collection(name).get();
    dump[name] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    totalDocs += snap.size;
    console.log(`${name}: ${snap.size} docs`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `firestore-backup-${timestamp}.json`;
  const outDir = path.join(process.cwd(), 'backups');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, fileName);
  fs.writeFileSync(outPath, JSON.stringify({ exported_at: new Date().toISOString(), project: config.projectId, collections: dump }, null, 2));
  console.log(`\nWrote ${totalDocs} total documents to ${outPath}`);

  // Best-effort upload to Cloud Storage if it's enabled for this project.
  // Backups keep working locally/in CI even if Storage isn't set up yet.
  try {
    const bucket = getStorage(app).bucket();
    const [exists] = await bucket.exists();
    if (exists) {
      await bucket.upload(outPath, { destination: `backups/${fileName}` });
      console.log(`Uploaded to gs://${bucket.name}/backups/${fileName}`);
    } else {
      console.log('Cloud Storage bucket not enabled yet -- backup kept local/CI-artifact only.');
    }
  } catch (err: any) {
    console.error('Cloud Storage upload skipped:', err?.message || err);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
