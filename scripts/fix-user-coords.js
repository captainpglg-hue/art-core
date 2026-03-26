#!/usr/bin/env node
// Add lat/lng coordinates to artist users for the map feature
const https = require('https');
const PAT = 'sbp_85360682b077f687cb720a83ae40aff699010a0c';
const REF = 'kmmlwuwsahtzgzztcdaj';

function sql(query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const opts = {
      hostname: 'api.supabase.com',
      path: '/v1/projects/' + REF + '/database/query',
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + PAT, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 30000
    };
    const req = https.request(opts, r => {
      let d = ''; r.on('data', c => d += c);
      r.on('end', () => resolve({ status: r.statusCode, data: d }));
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

async function main() {
  console.log('Adding lat/lng columns and coordinates...');

  // Add columns if not exist
  let r = await sql(`
    ALTER TABLE public.users 
      ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
  `);
  console.log('Add columns:', r.status, r.data.substring(0,100));

  // Update artist coords by username
  const coords = [
    ['camille_b', 45.7640, 4.8357, 'Lyon', 'France'],
    ['marco_ferretti', 45.4642, 9.1900, 'Milan', 'Italie'],
    ['aicha_benali', 48.8566, 2.3522, 'Paris', 'France'],
    ['lena_hoff', 52.5200, 13.4050, 'Berlin', 'Allemagne'],
    ['yusuf_ade', 51.5074, -0.1278, 'Londres', 'Royaume-Uni'],
    ['sakura_t', 35.0116, 135.7681, 'Kyoto', 'Japon'],
    ['pablo_mendoza', 41.3851, 2.1734, 'Barcelone', 'Espagne'],
    ['ingrid_l', 59.9139, 10.7522, 'Oslo', 'Norvège'],
    ['zhao_wei_art', 31.2304, 121.4737, 'Shanghai', 'Chine'],
    ['elena_v', 4.7110, -74.0721, 'Bogotá', 'Colombie'],
  ];

  for (const [username, lat, lng, city, country] of coords) {
    r = await sql(`UPDATE public.users SET latitude=${lat}, longitude=${lng}, city='${city}', country='${country}' WHERE username='${username}';`);
    console.log(`  ${username} → ${city}: ${r.status}`);
  }

  // Also add scout coords (20 scouts - distribute across cities)
  const scoutCities = [
    ['thomas_scout', 48.8566, 2.3522, 'Paris', 'France'],
    ['sofia_scout', 41.9028, 12.4964, 'Rome', 'Italie'],
    ['james_scout', 51.5074, -0.1278, 'Londres', 'Royaume-Uni'],
    ['mei_scout', 22.3193, 114.1694, 'Hong Kong', 'Chine'],
    ['clara_scout', 48.2082, 16.3738, 'Vienne', 'Autriche'],
    ['ahmed_scout', 30.0444, 31.2357, 'Le Caire', 'Égypte'],
    ['val_scout', -34.6037, -58.3816, 'Buenos Aires', 'Argentine'],
    ['pierre_scout', 45.7640, 4.8357, 'Lyon', 'France'],
    ['nadia_scout', 55.7558, 37.6173, 'Moscou', 'Russie'],
    ['kenji_scout', 35.6762, 139.6503, 'Tokyo', 'Japon'],
  ];

  for (const [username, lat, lng, city, country] of scoutCities) {
    r = await sql(`UPDATE public.users SET latitude=${lat}, longitude=${lng}, city='${city}', country='${country}' WHERE username='${username}';`);
    console.log(`  Scout ${username} → ${city}: ${r.status}`);
  }

  console.log('Done! Coordinates added.');
}

main().catch(console.error);
