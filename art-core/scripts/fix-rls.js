#!/usr/bin/env node
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
  console.log('Fixing RLS policies...');

  // 1. Allow anon/public to read user profiles (for marketplace artist display)
  let r = await sql(`
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
    CREATE POLICY "Public profiles are viewable by everyone"
      ON public.users FOR SELECT USING (true);
  `);
  console.log('users SELECT policy:', r.status, r.data.substring(0, 200));

  // 2. Also ensure artworks are readable by anon
  r = await sql(`
    DROP POLICY IF EXISTS "Public artworks are viewable by everyone" ON public.artworks;
    CREATE POLICY "Public artworks are viewable by everyone"
      ON public.artworks FOR SELECT USING (is_public = true);
  `);
  console.log('artworks SELECT policy:', r.status, r.data.substring(0, 200));

  // 3. Check artwork status values to confirm valid ones
  r = await sql(`SELECT DISTINCT status FROM public.artworks LIMIT 20;`);
  console.log('Artwork statuses:', r.data.substring(0, 300));
}

main().catch(console.error);
