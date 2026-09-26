/**
 * Firestore Security Rules — Emulator Test Suite
 * WA-LINES-02 T-19 — STORE_ADMIN ChatSession isolation
 *
 * Validates all seven mandatory scenarios from SEC-WA02-02-B:
 *  1. ADMIN reads session without storeId field          → permit
 *  2. ADMIN reads session with storeId = X               → permit
 *  3. STORE_ADMIN (storeId=X) reads session storeId=X   → permit
 *  4. STORE_ADMIN (storeId=X) reads session storeId=Y   → deny
 *  5. STORE_ADMIN (storeId=X) reads no-storeId session  → deny
 *  6. CUSTOMER reads session                             → deny
 *  7. STORE_ADMIN with NO storeId JWT claim reads
 *     no-storeId session                                 → deny (null guard test)
 *
 * Run via:  npm run test:rules
 */

'use strict';

const { readFileSync } = require('fs');
const path = require('path');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');

const PROJECT_ID = 'demo-izinga-test';
const FIRESTORE_PORT = 8089;
const RULES_PATH = path.join(__dirname, '..', 'firestore.rules');

let testEnv;

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      port: FIRESTORE_PORT,
    },
  });
}, 30000);

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
}, 10000);

afterEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns an authenticated Firestore instance using @firebase/rules-unit-testing
 * compat API. Claims map directly to request.auth.token.* in security rules.
 *
 * @param {string} profileRole  - maps to request.auth.token.profileRole
 * @param {string|undefined} storeId - maps to request.auth.token.storeId;
 *   pass undefined to omit the claim entirely (Scenario 7).
 */
function getAuthDb(profileRole, storeId) {
  const claims = { profileRole };
  if (storeId !== undefined) {
    claims.storeId = storeId;
  }
  const uid = `user-${profileRole}${storeId ? '-' + storeId : '-noscope'}`;
  return testEnv.authenticatedContext(uid, claims).firestore();
}

/**
 * Seeds a chatSessions document bypassing rules.
 * Pass storeId=null to create a legacy document with NO storeId field.
 */
async function seedSession(docId, storeId) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const data = {
      customerId: 'cust-001',
      customerMobileNumber: '+27600000001',
      status: 'ACTIVE',
      lastMessageTimestamp: new Date(),
      unreadMessagesCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (storeId !== null && storeId !== undefined) {
      data.storeId = storeId;
    }
    await ctx.firestore().collection('chatSessions').doc(docId).set(data);
  });
}

// ---------------------------------------------------------------------------
// Scenario 1 — ADMIN reads session WITHOUT storeId field → PERMIT
// ---------------------------------------------------------------------------
test('Scenario 1: ADMIN reads legacy session with no storeId field — permit', async () => {
  await seedSession('legacy-001', null);
  const db = getAuthDb('ADMIN');
  await assertSucceeds(
    db.collection('chatSessions').doc('legacy-001').get()
  );
});

// ---------------------------------------------------------------------------
// Scenario 2 — ADMIN reads session WITH storeId = X → PERMIT
// ---------------------------------------------------------------------------
test('Scenario 2: ADMIN reads session with storeId=X — permit', async () => {
  await seedSession('store-session-001', 'store-X');
  const db = getAuthDb('ADMIN');
  await assertSucceeds(
    db.collection('chatSessions').doc('store-session-001').get()
  );
});

// ---------------------------------------------------------------------------
// Scenario 3 — STORE_ADMIN (storeId=X) reads session with storeId=X → PERMIT
// ---------------------------------------------------------------------------
test('Scenario 3: STORE_ADMIN storeId=X reads session storeId=X — permit', async () => {
  await seedSession('store-session-X', 'store-X');
  const db = getAuthDb('STORE_ADMIN', 'store-X');
  await assertSucceeds(
    db.collection('chatSessions').doc('store-session-X').get()
  );
});

// ---------------------------------------------------------------------------
// Scenario 4 — STORE_ADMIN (storeId=X) reads session with storeId=Y → DENY
// ---------------------------------------------------------------------------
test('Scenario 4: STORE_ADMIN storeId=X reads session storeId=Y — deny', async () => {
  await seedSession('store-session-Y', 'store-Y');
  const db = getAuthDb('STORE_ADMIN', 'store-X');
  await assertFails(
    db.collection('chatSessions').doc('store-session-Y').get()
  );
});

// ---------------------------------------------------------------------------
// Scenario 5 — STORE_ADMIN (storeId=X) reads legacy session with NO storeId field → DENY
// ---------------------------------------------------------------------------
test('Scenario 5: STORE_ADMIN storeId=X reads no-storeId session — deny', async () => {
  await seedSession('legacy-002', null);
  const db = getAuthDb('STORE_ADMIN', 'store-X');
  await assertFails(
    db.collection('chatSessions').doc('legacy-002').get()
  );
});

// ---------------------------------------------------------------------------
// Scenario 6 — CUSTOMER reads session → DENY
// ---------------------------------------------------------------------------
test('Scenario 6: CUSTOMER reads session — deny', async () => {
  await seedSession('store-session-cust', 'store-X');
  const db = getAuthDb('CUSTOMER');
  await assertFails(
    db.collection('chatSessions').doc('store-session-cust').get()
  );
});

// ---------------------------------------------------------------------------
// Scenario 7 — STORE_ADMIN with NO storeId JWT claim reads no-storeId session → DENY
// Tests the null guard: request.auth.token.storeId != null
// Without the guard, null==null would evaluate to true in Firestore rules,
// granting a STORE_ADMIN with an unprovisioned claim access to all legacy sessions.
// SEC-WA02-02-A (Finding 7) + SEC-WA02-02-B (Finding 9)
// ---------------------------------------------------------------------------
test('Scenario 7: STORE_ADMIN with no storeId claim reads no-storeId session — deny (null guard)', async () => {
  await seedSession('legacy-003', null);
  // Deliberately omit storeId from claims — simulates a STORE_ADMIN whose
  // Firebase custom claim was never provisioned (or suffered a bug in claim provisioning).
  const db = getAuthDb('STORE_ADMIN', undefined);
  await assertFails(
    db.collection('chatSessions').doc('legacy-003').get()
  );
});
