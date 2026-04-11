// Initialize the shared Core Ecosystem database
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'core.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const SEED_PATH = path.join(__dirname, 'seed.sql');

console.log('🔧 Initializing Core Ecosystem Database...');
console.log(`   Path: ${DB_PATH}`);

// Delete existing DB for clean start
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log('   Deleted existing database.');
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);
console.log('   Schema created.');

// Generate proper bcrypt hash for "password123"
const hash = bcrypt.hashSync('password123', 10);
console.log(`   Generated password hash for demo accounts.`);

// Read seed and replace placeholder hash
let seed = fs.readFileSync(SEED_PATH, 'utf-8');
seed = seed.replace(/\$2a\$10\$rQEY2FhLnKEqPV7K1J9OOeZkV2yJz5K8sMzMkR5V6t7W3j4y9O3C6/g, hash);
db.exec(seed);
console.log('   Seed data inserted.');

// Verify
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
const artworkCount = db.prepare('SELECT COUNT(*) as count FROM artworks').get();
const marketCount = db.prepare('SELECT COUNT(*) as count FROM betting_markets').get();
console.log(`\n✅ Database ready!`);
console.log(`   Users: ${userCount.count}`);
console.log(`   Artworks: ${artworkCount.count}`);
console.log(`   Betting Markets: ${marketCount.count}`);
console.log(`\n📋 Demo accounts (password: password123):`);
console.log(`   Artist:  artist@demo.com`);
console.log(`   Initié:  initie@demo.com`);
console.log(`   Client:  client@demo.com`);
console.log(`   Admin:   admin@artcore.com`);

db.close();
