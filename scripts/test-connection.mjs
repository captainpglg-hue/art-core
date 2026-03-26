// Test Supabase connectivity and try multiple SQL execution methods
const SUPABASE_URL = 'https://kmmlwuwsahtzgzztcdaj.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbWx3dXdzYWh0emd6enRjZGFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU3MTkxMywiZXhwIjoyMDg5MTQ3OTEzfQ.BCE1ZfyTGk58Kdxt1N5I50_5s9JdL45x22XE6xLNFUc';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbWx3dXdzYWh0emd6enRjZGFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzE5MTMsImV4cCI6MjA4OTE0NzkxM30.dcxk_X096vME37_XmeURhW-3bABcbkNC7qEXqYvXgcE';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

console.log('🔗 Testing Supabase connectivity...\n');

// Test 1: REST API ping
const ping = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers });
console.log(`1. REST API: ${ping.status} ${ping.statusText}`);

// Test 2: Auth API
const auth = await fetch(`${SUPABASE_URL}/auth/v1/health`, { headers });
console.log(`2. Auth API: ${auth.status} ${auth.statusText}`);

// Test 3: Check if 'users' table exists
const usersCheck = await fetch(`${SUPABASE_URL}/rest/v1/users?limit=1`, { headers });
console.log(`3. users table: ${usersCheck.status} ${usersCheck.statusText} — ${(await usersCheck.text()).slice(0, 100)}`);

// Test 4: Check if 'artworks' table exists
const artworks = await fetch(`${SUPABASE_URL}/rest/v1/artworks?limit=1`, { headers });
console.log(`4. artworks table: ${artworks.status} ${artworks.statusText}`);

// Test 5: Try SQL endpoint (newer Supabase feature)
const sqlTest = await fetch(`${SUPABASE_URL}/rest/v1/rpc/version`, {
  method: 'POST', headers,
  body: JSON.stringify({}),
});
console.log(`5. rpc/version: ${sqlTest.status}`);

// Test 6: Check what tables exist via information_schema
const schema = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, { method: 'GET', headers });
console.log(`6. RPC list: ${schema.status}`);

// Test 7: Try settings table
const settings = await fetch(`${SUPABASE_URL}/rest/v1/settings?limit=1`, { headers });
console.log(`7. settings table: ${settings.status} — ${(await settings.text()).slice(0, 100)}`);

console.log('\n✅ Connection test complete');
console.log(`\nConclusion: Schema ${usersCheck.status === 200 ? 'ALREADY EXISTS' : 'NEEDS TO BE CREATED'}`);
