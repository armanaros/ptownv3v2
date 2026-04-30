/**
 * reset-demo.cjs
 * Wipes all demo data and re-seeds fresh.
 * Run: node scripts/reset-demo.cjs
 *
 * Collections wiped: menu_categories, menu_items, orders, coupons, system_settings
 * Demo Firebase Auth users are updated (not deleted) to reset passwords.
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// ── Init ──────────────────────────────────────────────────────────────────────

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} else {
  const keyPath = path.join(__dirname, '..', 'serviceAccountKey.json');
  if (!fs.existsSync(keyPath)) {
    console.error('ERROR: No service account found.');
    console.error('  Option A: set FIREBASE_SERVICE_ACCOUNT_KEY env var');
    console.error('  Option B: place serviceAccountKey.json in project root');
    process.exit(1);
  }
  serviceAccount = require(keyPath);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function deleteCollection(collectionName) {
  const ref = db.collection(collectionName);
  const snapshot = await ref.get();
  if (snapshot.empty) {
    console.log(`   (empty) ${collectionName}`);
    return;
  }

  // Delete in batches of 400
  const batches = [];
  let batch = db.batch();
  let count = 0;

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    count++;
    if (count === 400) {
      batches.push(batch.commit());
      batch = db.batch();
      count = 0;
    }
  }
  if (count > 0) batches.push(batch.commit());
  await Promise.all(batches);
  console.log(`   ✓ Wiped ${snapshot.size} docs from ${collectionName}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function reset() {
  console.log('🗑️   Wiping demo collections...\n');

  const COLLECTIONS_TO_WIPE = [
    'menu_categories',
    'menu_items',
    'orders',
    'coupons',
    'system_settings',
  ];

  for (const col of COLLECTIONS_TO_WIPE) {
    await deleteCollection(col);
  }

  console.log('\n🌱  Re-seeding...\n');

  // Spawn seed script
  const { execSync } = require('child_process');
  execSync('node ' + path.join(__dirname, 'seed-demo.cjs'), {
    stdio: 'inherit',
    env: process.env,
  });
}

reset().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
