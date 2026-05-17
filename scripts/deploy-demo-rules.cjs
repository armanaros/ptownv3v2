#!/usr/bin/env node
/**
 * Deploys corrected Firestore security rules to the demo Firebase project.
 * Uses the Firebase Admin SDK's Google credential to call the
 * Firebase Rules REST API directly.
 */

const admin = require('firebase-admin');

// ── Load service account ──────────────────────────────────────────────────────
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} else {
  serviceAccount = require('../serviceAccountKey.json');
}

const PROJECT_ID = serviceAccount.project_id;

// ── Rules source ──────────────────────────────────────────────────────────────
const RULES_SOURCE = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Public read for menu, settings, coupons (online ordering page)
    match /menu_categories/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /menu_items/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /system_settings/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /coupons/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Orders — public create (guests submitting orders), auth for all else
    match /orders/{id} {
      allow read, write: if request.auth != null;
      allow create: if true;
    }

    // Users — public read needed for username→email lookup at login time
    match /users/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // All other collections require authentication
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`;

// ── Init admin ───────────────────────────────────────────────────────────────
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: PROJECT_ID,
});

async function main() {
  console.log(`\n🔒  Deploying Firestore security rules to: ${PROJECT_ID}\n`);

  const rules = admin.securityRules();

  // Create a new ruleset from source and release it as the Firestore default
  const ruleset = await rules.createRuleset(
    rules.createRulesFileFromSource('firestore.rules', RULES_SOURCE),
  );
  console.log(`   ✓ Ruleset created: ${ruleset.name}`);

  await rules.releaseFirestoreRuleset(ruleset);
  console.log('   ✓ Ruleset released as Firestore default\n');
  console.log('✅  Firestore security rules deployed successfully.\n');

  await admin.app().delete();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
