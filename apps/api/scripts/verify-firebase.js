import 'dotenv/config';
import { config } from '../src/config/index.js';

const raw = config.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!raw || String(raw).includes('REPLACE_ME')) {
  console.error('FIREBASE_SERVICE_ACCOUNT_JSON is missing');
  process.exit(1);
}

let cred;
const trimmed = String(raw).trim();
if (trimmed.startsWith('{')) {
  cred = JSON.parse(trimmed);
} else {
  cred = JSON.parse(Buffer.from(trimmed, 'base64').toString('utf8'));
}

if (typeof cred.private_key === 'string' && cred.private_key.includes('\\n')) {
  cred.private_key = cred.private_key.replace(/\\n/g, '\n');
}

const admin = await import('firebase-admin');
if (!admin.default.apps.length) {
  admin.default.initializeApp({
    credential: admin.default.credential.cert(cred),
    projectId: cred.project_id,
  });
}

console.log('Firebase Admin init OK');
console.log('project_id:', cred.project_id);
console.log('client_email:', cred.client_email);
process.exit(0);
