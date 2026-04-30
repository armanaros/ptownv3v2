/**
 * seed-demo.cjs
 * Seeds the connected Firebase project with realistic demo data.
 * Run: node scripts/seed-demo.cjs
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY env var (JSON string) OR
 * a local serviceAccountKey.json file in the project root.
 *
 * Usage:
 *   export FIREBASE_SERVICE_ACCOUNT_KEY="$(cat serviceAccountKey.json)"
 *   node scripts/seed-demo.cjs
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
const authAdmin = admin.auth();
const FieldValue = admin.firestore.FieldValue;

// ── Helpers ───────────────────────────────────────────────────────────────────

const ts = () => FieldValue.serverTimestamp();

async function setDoc(collection, id, data) {
  await db.collection(collection).doc(id).set({ ...data, createdAt: ts(), updatedAt: ts() });
}

async function addDoc(collection, data) {
  const ref = await db.collection(collection).add({ ...data, createdAt: ts(), updatedAt: ts() });
  return ref.id;
}

// ── Demo users ────────────────────────────────────────────────────────────────
// These are created in Firebase Auth + Firestore users collection.
// Passwords are simple for demo; change before any real use.

const DEMO_USERS = [
  {
    username: 'demo_admin',
    email: 'demo.admin@ptownrestaurant.com',
    password: 'Demo@2026',
    role: 'admin',
    firstName: 'Alex',
    lastName: 'Admin',
    phone: '09171234567',
  },
  {
    username: 'demo_manager',
    email: 'demo.manager@ptownrestaurant.com',
    password: 'Demo@2026',
    role: 'manager',
    firstName: 'Maria',
    lastName: 'Manager',
    phone: '09181234567',
  },
  {
    username: 'demo_cashier',
    email: 'demo.cashier@ptownrestaurant.com',
    password: 'Demo@2026',
    role: 'employee',
    firstName: 'Carlo',
    lastName: 'Cashier',
    phone: '09191234567',
  },
];

// ── Menu categories ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'cat_rice', name: 'Rice Meals', sortOrder: 1, isActive: true },
  { id: 'cat_pulutan', name: 'Pulutan', sortOrder: 2, isActive: true },
  { id: 'cat_silog', name: 'Silog Meals', sortOrder: 3, isActive: true },
  { id: 'cat_mains', name: 'Main Dishes', sortOrder: 4, isActive: true },
  { id: 'cat_soups', name: 'Soups & Stews', sortOrder: 5, isActive: true },
  { id: 'cat_drinks', name: 'Beverages', sortOrder: 6, isActive: true },
  { id: 'cat_desserts', name: 'Desserts', sortOrder: 7, isActive: true },
];

// ── Menu items ────────────────────────────────────────────────────────────────

const ITEMS = [
  // Rice Meals
  { name: 'Chicken Adobo Rice', categoryId: 'cat_rice', price: 120, costOfGoods: 55, preparationTime: 10, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 1, stockLevel: 50, lowStockThreshold: 10, description: 'Classic Filipino adobo with steamed rice' },
  { name: 'Pork BBQ Rice', categoryId: 'cat_rice', price: 130, costOfGoods: 60, preparationTime: 12, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 2, stockLevel: 40, lowStockThreshold: 10, description: 'Grilled pork skewers with garlic fried rice' },
  { name: 'Crispy Pata Rice', categoryId: 'cat_rice', price: 250, costOfGoods: 110, preparationTime: 20, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 3, stockLevel: 20, lowStockThreshold: 5, description: 'Deep-fried pork knuckle, crispy outside tender inside' },
  { name: 'Tapa Rice', categoryId: 'cat_rice', price: 115, costOfGoods: 50, preparationTime: 8, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 4, stockLevel: 45, lowStockThreshold: 10, description: 'Cured beef tapa with garlic rice and egg' },

  // Pulutan
  { name: 'Crispy Calamares', categoryId: 'cat_pulutan', price: 180, costOfGoods: 70, preparationTime: 12, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 1, stockLevel: 30, lowStockThreshold: 8, description: 'Golden fried squid rings with aioli dip' },
  { name: 'Sisig', categoryId: 'cat_pulutan', price: 220, costOfGoods: 90, preparationTime: 15, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 2, stockLevel: 25, lowStockThreshold: 8, description: 'Sizzling chopped pork face with chili and calamansi' },
  { name: 'Chicken Wings (6 pcs)', categoryId: 'cat_pulutan', price: 200, costOfGoods: 85, preparationTime: 18, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 3, stockLevel: 35, lowStockThreshold: 8, description: 'Crispy buffalo-style wings, choice of sauce' },
  { name: 'Chicharon Bulaklak', categoryId: 'cat_pulutan', price: 160, costOfGoods: 60, preparationTime: 10, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 4, stockLevel: 20, lowStockThreshold: 5, description: 'Deep-fried pork mesentery, crunchy snack' },

  // Silog Meals
  { name: 'Tapsilog', categoryId: 'cat_silog', price: 135, costOfGoods: 58, preparationTime: 10, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 1, stockLevel: 40, lowStockThreshold: 10, description: 'Tapa + sinangag + itlog — the classic Filipino breakfast' },
  { name: 'Longsilog', categoryId: 'cat_silog', price: 125, costOfGoods: 50, preparationTime: 10, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 2, stockLevel: 40, lowStockThreshold: 10, description: 'Longganisa + sinangag + itlog' },
  { name: 'Chicksilog', categoryId: 'cat_silog', price: 130, costOfGoods: 55, preparationTime: 12, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 3, stockLevel: 35, lowStockThreshold: 10, description: 'Fried chicken + sinangag + itlog' },
  { name: 'Bangsilog', categoryId: 'cat_silog', price: 140, costOfGoods: 60, preparationTime: 12, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 4, stockLevel: 30, lowStockThreshold: 8, description: 'Bangus (milkfish) + sinangag + itlog' },

  // Main Dishes
  { name: 'Lechon Kawali', categoryId: 'cat_mains', price: 280, costOfGoods: 120, preparationTime: 25, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 1, stockLevel: 15, lowStockThreshold: 5, description: 'Pan-fried pork belly, extra crispy skin' },
  { name: 'Kare-Kare', categoryId: 'cat_mains', price: 320, costOfGoods: 140, preparationTime: 30, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 2, stockLevel: 10, lowStockThreshold: 5, description: 'Oxtail and vegetables in peanut sauce, served with bagoong' },
  { name: 'Bistek Tagalog', categoryId: 'cat_mains', price: 260, costOfGoods: 115, preparationTime: 20, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 3, stockLevel: 20, lowStockThreshold: 5, description: 'Filipino beef steak with onion rings in soy-citrus sauce' },
  { name: 'Pork Sinigang', categoryId: 'cat_mains', price: 240, costOfGoods: 100, preparationTime: 25, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 4, stockLevel: 25, lowStockThreshold: 8, description: 'Pork ribs in sour tamarind broth with vegetables' },

  // Soups
  { name: 'Bulalo', categoryId: 'cat_soups', price: 380, costOfGoods: 160, preparationTime: 35, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 1, stockLevel: 10, lowStockThreshold: 3, description: 'Slow-cooked beef shank in clear broth' },
  { name: 'Tinolang Manok', categoryId: 'cat_soups', price: 200, costOfGoods: 85, preparationTime: 25, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 2, stockLevel: 20, lowStockThreshold: 5, description: 'Chicken ginger soup with green papaya and malunggay' },
  { name: 'Beef Nilaga', categoryId: 'cat_soups', price: 250, costOfGoods: 105, preparationTime: 30, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 3, stockLevel: 15, lowStockThreshold: 5, description: 'Boiled beef with potatoes, cabbage, and peppercorn' },

  // Beverages
  { name: 'Coke (Regular)', categoryId: 'cat_drinks', price: 45, costOfGoods: 20, preparationTime: 2, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 1, stockLevel: 100, lowStockThreshold: 20, description: '330ml can' },
  { name: 'Coke Zero', categoryId: 'cat_drinks', price: 45, costOfGoods: 20, preparationTime: 2, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 2, stockLevel: 80, lowStockThreshold: 20, description: '330ml can' },
  { name: 'Bottled Water', categoryId: 'cat_drinks', price: 30, costOfGoods: 12, preparationTime: 1, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 3, stockLevel: 120, lowStockThreshold: 30, description: '500ml' },
  { name: 'Iced Tea (Large)', categoryId: 'cat_drinks', price: 65, costOfGoods: 18, preparationTime: 3, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 4, stockLevel: 60, lowStockThreshold: 15, description: 'Freshly brewed, choice of lemon or peach' },
  { name: 'San Miguel Pale Pilsen', categoryId: 'cat_drinks', price: 80, costOfGoods: 45, preparationTime: 2, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 5, stockLevel: 48, lowStockThreshold: 12, description: '330ml bottle' },
  { name: 'Red Horse Beer', categoryId: 'cat_drinks', price: 90, costOfGoods: 50, preparationTime: 2, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 6, stockLevel: 36, lowStockThreshold: 12, description: '500ml bottle' },

  // Desserts
  { name: 'Halo-Halo', categoryId: 'cat_desserts', price: 110, costOfGoods: 40, preparationTime: 5, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 1, stockLevel: 30, lowStockThreshold: 8, description: 'Mixed shaved ice with sweetened beans, jellies, and leche flan' },
  { name: 'Leche Flan', categoryId: 'cat_desserts', price: 85, costOfGoods: 30, preparationTime: 3, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 2, stockLevel: 25, lowStockThreshold: 5, description: 'Classic Filipino steamed caramel custard' },
  { name: 'Turon (2 pcs)', categoryId: 'cat_desserts', price: 60, costOfGoods: 22, preparationTime: 5, isAvailable: true, isActive: true, availableOnline: true, sortOrder: 3, stockLevel: 40, lowStockThreshold: 10, description: 'Banana and jackfruit spring roll, caramelized coating' },
];

// ── Sample orders ─────────────────────────────────────────────────────────────

const ORDER_STATUSES = ['pending', 'preparing', 'ready', 'completed'];

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function makeSampleOrders(itemIds) {
  const names = ['Juan Dela Cruz', 'Maria Santos', 'Jose Reyes', 'Ana Garcia', 'Marco Bautista', 'Lea Fernandez', 'Rey Mendoza', 'Cris Villanueva'];
  const types = ['takeaway', 'dine-in', 'delivery'];
  const payments = ['cash', 'gcash', 'maya'];

  const orders = [];
  for (let i = 0; i < 12; i++) {
    const itemCount = randomInt(1, 4);
    const chosenItems = [];
    const usedIds = new Set();
    for (let j = 0; j < itemCount; j++) {
      let id;
      do { id = randomFrom(itemIds); } while (usedIds.has(id));
      usedIds.add(id);
      chosenItems.push({ menuItemId: id, quantity: randomInt(1, 3), unitPrice: 0, name: '' });
    }
    const total = chosenItems.reduce((s, ci) => s + ci.unitPrice * ci.quantity, 0) || randomInt(150, 600);

    orders.push({
      orderNumber: 1000 + i + 1,
      customerName: randomFrom(names),
      customerPhone: `0917${randomInt(1000000, 9999999)}`,
      orderType: randomFrom(types),
      paymentMethod: randomFrom(payments),
      items: chosenItems,
      subtotal: total,
      discount: 0,
      total,
      status: randomFrom(ORDER_STATUSES),
      source: 'demo',
      notes: '',
    });
  }
  return orders;
}

// ── System settings ───────────────────────────────────────────────────────────

const SYSTEM_SETTINGS = {
  isOpen: true,
  closedMessage: '',
  restaurantName: "P-Town Restaurant",
  address: "123 Demo Street, Pasig City",
  phone: "02-8123-4567",
  currency: "PHP",
};

// ── Coupon ────────────────────────────────────────────────────────────────────

const DEMO_COUPONS = [
  {
    code: 'DEMO10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 200,
    isActive: true,
    description: '10% off on orders ₱200+',
  },
  {
    code: 'WELCOME50',
    discountType: 'fixed',
    discountValue: 50,
    minOrderAmount: 300,
    isActive: true,
    description: '₱50 off on orders ₱300+',
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱  Starting demo seed...\n');

  // 1. Demo users
  console.log('👤  Creating demo users...');
  for (const u of DEMO_USERS) {
    try {
      const existing = await authAdmin.getUserByEmail(u.email).catch(() => null);
      let uid;
      if (existing) {
        uid = existing.uid;
        await authAdmin.updateUser(uid, { password: u.password, displayName: `${u.firstName} ${u.lastName}` });
        console.log(`   ✓ Updated: ${u.username}`);
      } else {
        const record = await authAdmin.createUser({ email: u.email, password: u.password, displayName: `${u.firstName} ${u.lastName}` });
        uid = record.uid;
        console.log(`   ✓ Created: ${u.username}`);
      }
      await db.collection('users').doc(uid).set({
        username: u.username,
        email: u.email,
        role: u.role,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        address: '',
        dailyRate: 0,
        department: 'Demo',
        isActive: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error(`   ✗ Failed for ${u.username}: ${err.message}`);
    }
  }

  // 2. Menu categories
  console.log('\n📂  Seeding menu categories...');
  for (const cat of CATEGORIES) {
    const { id, ...data } = cat;
    await db.collection('menu_categories').doc(id).set({ ...data, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    console.log(`   ✓ ${cat.name}`);
  }

  // 3. Menu items
  console.log('\n🍽️   Seeding menu items...');
  const itemIds = [];
  for (const item of ITEMS) {
    const ref = await db.collection('menu_items').add({ ...item, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    itemIds.push(ref.id);
    console.log(`   ✓ ${item.name}`);
  }

  // 4. Sample orders
  console.log('\n🧾  Creating sample orders...');
  const sampleOrders = makeSampleOrders(itemIds);
  for (const order of sampleOrders) {
    await db.collection('orders').add({ ...order, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  }
  console.log(`   ✓ ${sampleOrders.length} sample orders created`);

  // 5. System settings
  console.log('\n⚙️   Setting system settings...');
  await db.collection('system_settings').doc('main').set({ ...SYSTEM_SETTINGS, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  console.log('   ✓ system_settings/main');

  // 6. Coupons
  console.log('\n🏷️   Seeding coupons...');
  for (const coupon of DEMO_COUPONS) {
    await db.collection('coupons').add({ ...coupon, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    console.log(`   ✓ ${coupon.code}`);
  }

  console.log('\n✅  Demo seed complete!\n');
  console.log('Demo login credentials:');
  console.log('  Username: demo_admin    | Password: Demo@2026  (Admin)');
  console.log('  Username: demo_manager  | Password: Demo@2026  (Manager)');
  console.log('  Username: demo_cashier  | Password: Demo@2026  (Employee)');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
