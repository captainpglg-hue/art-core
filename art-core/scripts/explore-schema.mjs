const SUPABASE_URL = 'https://kmmlwuwsahtzgzztcdaj.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbWx3dXdzYWh0emd6enRjZGFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU3MTkxMywiZXhwIjoyMDg5MTQ3OTEzfQ.BCE1ZfyTGk58Kdxt1N5I50_5s9JdL45x22XE6xLNFUc';

const h = { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` };

// Try each table name we expect AND possible alternatives
const tables = [
  // Our schema
  'users', 'artworks', 'pass_core', 'transactions', 'royalties',
  'notifications', 'subscriptions', 'settings', 'user_roles',
  'scouts', 'scouted_artists', 'bets', 'auctions', 'favorites',
  'affiliate_links',
  // Possible existing tables hinted at
  'ambassadeurs', 'certificats', 'oeuvres', 'artistes',
  'certifications', 'profiles',
];

console.log('Exploring existing Supabase schema...\n');
const found = [];
for (const t of tables) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?limit=1`, { headers: h });
  if (r.status === 200) {
    const data = await r.json();
    found.push({ table: t, rows: data.length, cols: data[0] ? Object.keys(data[0]) : [] });
    console.log(`✅ ${t}: EXISTS (${data.length} rows${data[0] ? ', cols: ' + Object.keys(data[0]).join(', ') : ''})`);
  } else if (r.status === 206) {
    found.push({ table: t, rows: '?', cols: [] });
    console.log(`✅ ${t}: EXISTS (partial)`);
  } else {
    const body = await r.json().catch(() => ({}));
    const hint = body.hint ? ` (hint: ${body.hint})` : '';
    console.log(`❌ ${t}: NOT FOUND${hint}`);
  }
}

console.log(`\nFound ${found.length} tables: ${found.map(f => f.table).join(', ')}`);
