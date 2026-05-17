/**
 * update-menu-images.cjs
 * Patches every demo menu_items document with a matching food photo URL.
 * Run: node scripts/update-menu-images.cjs
 */

'use strict';
const admin = require('firebase-admin');
const path  = require('path');
const fs    = require('fs');

// ── Init ──────────────────────────────────────────────────────────────────────
const keyPath = path.join(__dirname, '..', 'serviceAccountKey.json');
if (!fs.existsSync(keyPath)) {
  console.error('ERROR: serviceAccountKey.json not found in project root.');
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(require(keyPath)) });
const db = admin.firestore();

// ── Curated image map (item name → direct image URL) ─────────────────────────
// All from Unsplash (free to use) — direct CDN links, w=600 for fast load
const IMAGE_MAP = {
  // Rice Meals
  'Chicken Adobo Rice':      'https://images.unsplash.com/photo-1598103442097-8b74394b95c?w=600&q=80',
  'Pork BBQ Rice':           'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80',
  'Crispy Pata Rice':        'https://images.unsplash.com/photo-1544025162-d76538829f49?w=600&q=80',
  'Tapa Rice':               'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&q=80',

  // Pulutan
  'Crispy Calamares':        'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80',
  'Sisig':                   'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&q=80',
  'Chicken Wings (6 pcs)':   'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600&q=80',
  'Chicharon Bulaklak':      'https://images.unsplash.com/photo-1585325701165-8cb10ff5cedb?w=600&q=80',

  // Silog Meals
  'Tapsilog':                'https://images.unsplash.com/photo-1484723091739-30990d8af42a?w=600&q=80',
  'Longsilog':               'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600&q=80',
  'Chicksilog':              'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
  'Bangsilog':               'https://images.unsplash.com/photo-1519984388953-d2406bc725e1?w=600&q=80',

  // Main Dishes
  'Lechon Kawali':           'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=600&q=80',
  'Kare-Kare':               'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80',
  'Bistek Tagalog':          'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600&q=80',
  'Pork Sinigang':           'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=600&q=80',

  // Soups & Stews
  'Bulalo':                  'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80',
  'Tinolang Manok':          'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80',
  'Beef Nilaga':             'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=600&q=80',

  // Beverages
  'Coke (Regular)':          'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&q=80',
  'Coke Zero':               'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&q=80',
  'Bottled Water':           'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&q=80',
  'Iced Tea (Large)':        'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80',
  'San Miguel Pale Pilsen':  'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&q=80',
  'Red Horse Beer':          'https://images.unsplash.com/photo-1600788907416-456578634209?w=600&q=80',

  // Desserts
  'Halo-Halo':               'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600&q=80',
  'Leche Flan':              'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80',
  'Turon (2 pcs)':           'https://images.unsplash.com/photo-1571167530149-c1105da4c2f8?w=600&q=80',
};

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Fetching menu items...');
  const snap = await db.collection('menu_items').get();
  if (snap.empty) { console.error('No menu_items found. Run seed-demo.cjs first.'); process.exit(1); }

  let updated = 0, skipped = 0;
  const batch = db.batch();

  snap.forEach(doc => {
    const name = doc.data().name;
    const url  = IMAGE_MAP[name];
    if (url) {
      batch.update(doc.ref, { imageUrl: url });
      console.log(`  ✓  ${name}`);
      updated++;
    } else {
      console.warn(`  ?  No image mapped for: "${name}"`);
      skipped++;
    }
  });

  await batch.commit();
  console.log(`\nDone — ${updated} items updated, ${skipped} skipped.`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
