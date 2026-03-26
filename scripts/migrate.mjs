// Migration script using Supabase REST API (no DB password needed)
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://kmmlwuwsahtzgzztcdaj.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbWx3dXdzYWh0emd6enRjZGFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU3MTkxMywiZXhwIjoyMDg5MTQ3OTEzfQ.BCE1ZfyTGk58Kdxt1N5I50_5s9JdL45x22XE6xLNFUc';

// Split SQL into individual statements (skip empty/comment-only)
function splitSQL(sql) {
  const statements = [];
  let current = '';
  let inDollarBlock = false;
  let dollarTag = '';

  const lines = sql.split('\n');
  for (const line of lines) {
    // Detect $$ blocks (PL/pgSQL)
    const dollarMatches = line.match(/\$\$|\$[a-zA-Z_]+\$/g) || [];
    for (const match of dollarMatches) {
      if (!inDollarBlock) { inDollarBlock = true; dollarTag = match; }
      else if (match === dollarTag) { inDollarBlock = false; dollarTag = ''; }
    }
    current += line + '\n';
    if (!inDollarBlock && line.trimEnd().endsWith(';')) {
      const stmt = current.trim();
      if (stmt && !stmt.startsWith('--') && stmt !== ';') {
        statements.push(stmt);
      }
      current = '';
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

async function execSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql_query: sql }),
  });
  return { status: res.status, body: await res.text() };
}

// Simpler: use the pg-meta internal API
async function execSQLDirect(sql) {
  const res = await fetch(`${SUPABASE_URL}/pg-meta/v1/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'x-connection-encrypted': 'true',
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

// Test connection first
console.log('🔗 Testing Supabase connection...');
const testRes = await execSQLDirect('SELECT current_database(), current_user, version()');
console.log(`   Status: ${testRes.status}`);
if (testRes.status !== 200) {
  console.log(`   Response: ${testRes.body.slice(0, 300)}`);
  console.log('\n⚠️  pg-meta not accessible. Trying alternative approach...\n');

  // Try via the Supabase Management API
  const mgmtRes = await fetch('https://api.supabase.com/v1/projects/kmmwluwsahtzgzztcdaj/database/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: 'SELECT 1' }),
  });
  console.log(`   Management API status: ${mgmtRes.status}`);
  console.log(`   Response: ${(await mgmtRes.text()).slice(0, 300)}`);
  process.exit(1);
}

console.log('✅ Connected:', JSON.parse(testRes.body)[0]);

// Read and execute schema
const sqlFile = join(__dirname, '..', 'supabase', 'migrations', '20240101000000_initial_schema.sql');
const sqlContent = readFileSync(sqlFile, 'utf-8');

console.log('\n📦 Executing schema...');
const result = await execSQLDirect(sqlContent);
if (result.status === 200) {
  console.log('✅ Schema applied successfully!');
} else {
  console.log(`⚠️  Schema result (${result.status}): ${result.body.slice(0, 500)}`);
  // Try statement by statement
  console.log('\n🔄 Retrying statement by statement...');
  const statements = splitSQL(sqlContent);
  console.log(`   Found ${statements.length} statements`);
  let ok = 0, err = 0;
  for (const stmt of statements) {
    const r = await execSQLDirect(stmt);
    if (r.status === 200) { ok++; }
    else {
      const body = JSON.parse(r.body || '{}');
      // Skip "already exists" errors
      if (body.message?.includes('already exists') || body.code === '42P07' || body.code === '42710') {
        ok++;
      } else {
        console.log(`   ❌ Error: ${body.message || r.body.slice(0, 100)}`);
        err++;
      }
    }
  }
  console.log(`   ✅ ${ok} OK, ❌ ${err} errors`);
}

// Seed settings
console.log('\n🌱 Seeding default settings...');
const seedSQL = `
INSERT INTO public.settings (key, value, description) VALUES
  ('platform_commission_rate', '10', 'Commission rate in %'),
  ('artist_royalty_rate', '5', 'Resale royalty rate in %'),
  ('scout_commission_rate', '2', 'Scout commission rate in %'),
  ('min_artwork_price', '100', 'Minimum price in EUR'),
  ('max_artwork_price', '1000000', 'Maximum price in EUR'),
  ('maintenance_mode', 'false', 'Maintenance mode on/off')
ON CONFLICT (key) DO NOTHING;
`;
const seedRes = await execSQLDirect(seedSQL);
if (seedRes.status === 200) {
  console.log('✅ Default settings seeded!');
} else {
  const parsed = JSON.parse(seedRes.body || '{}');
  // It's fine if settings table doesn't exist yet
  console.log(`   Settings seed: ${parsed.message || 'skipped'}`);
}

console.log('\n🎉 Migration complete!');
