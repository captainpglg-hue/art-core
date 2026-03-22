#!/usr/bin/env node
// Re-insert 10 artist rows into public.users + user_roles using known auth UUIDs
const https = require('https');
const { execSync } = require('child_process');
const PAT = 'sbp_85360682b077f687cb720a83ae40aff699010a0c';
const REF = 'kmmlwuwsahtzgzztcdaj';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve({ status: r.statusCode, data: (() => { try { return JSON.parse(d); } catch { return d; } })() }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function exec(query, label) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await sleep(attempt === 0 ? 300 : 3000 * attempt);
    const { status, data } = await sql(query);
    if (status === 201 || status === 200) { console.log(`  ✅ ${label}`); return true; }
    if (status === 429) { console.log(`  ⏳ Rate limit, retry ${attempt + 1}...`); continue; }
    const msg = typeof data === 'string' ? data : JSON.stringify(data);
    // Ignore duplicate key errors (already exists)
    if (msg.includes('duplicate key') || msg.includes('already exists')) {
      console.log(`  ⚠️  ${label} — already exists, skipping`);
      return true;
    }
    console.error(`  ❌ ${label} — HTTP ${status}: ${msg.slice(0, 200)}`);
    return false;
  }
  return false;
}

const ARTISTS = [
  { id: '3a8715df-711a-4abf-823c-807c5ba63f70', email: 'camille.b@art-core.com', username: 'camille_b', full_name: 'Camille Beaumont', bio: 'Peintre abstraite française, diplômée des Beaux-Arts de Paris. Exploration de la mémoire et du temps.', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80' },
  { id: 'eb86ae13-c964-4fb1-b63c-cdd620f6a41b', email: 'marco.ferretti@art-core.com', username: 'marco_ferretti', full_name: 'Marco Ferretti', bio: 'Sculpteur italien contemporain. Travaille le marbre de Carrare et les métaux nobles.', avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80' },
  { id: '17450261-f2ec-4b8c-a5c7-6098d88b6856', email: 'aicha.benali@art-core.com', username: 'aicha_benali', full_name: 'Aicha Benali', bio: 'Photographe maroco-française, docteure en arts visuels. Son travail questionne l\'identité et l\'appartenance.', avatar_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=80' },
  { id: '087bb8ee-cb7e-41c2-a205-affa28a58c4d', email: 'lena.hoff@art-core.com', username: 'lena_hoff', full_name: 'Léna Hoffmann', bio: 'Artiste numérique berlinoise. Fusion de l\'art génératif et de l\'intelligence artificielle.', avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80' },
  { id: '2d948937-330a-45d6-ac3b-c80b15b4de75', email: 'yusuf.ade@art-core.com', username: 'yusuf_ade', full_name: 'Yusuf Adeyemi', bio: 'Peintre nigérian-londonien. Ses œuvres célèbrent la culture afro-contemporaine avec des couleurs vibrantes.', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80' },
  { id: '79e50d17-0509-48f4-b1da-80d5a8e7ea61', email: 'sakura.tanaka@art-core.com', username: 'sakura_t', full_name: 'Sakura Tanaka', bio: 'Céramiste japonaise établie à Kyoto. Maîtrise des techniques ancestrales Raku et Wabi-sabi contemporain.', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80' },
  { id: '6451c039-8b27-4707-bcab-2de0772c66fa', email: 'pablo.mendoza@art-core.com', username: 'pablo_mendoza', full_name: 'Pablo Mendoza', bio: 'Muraliste et peintre argentin. Son œuvre navigue entre réalisme magique et expressionnisme urbain.', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80' },
  { id: 'bc0e451c-238e-4f19-9840-a77dae8a0c20', email: 'ingrid.larsen@art-core.com', username: 'ingrid_l', full_name: 'Ingrid Larsen', bio: 'Graveuse et illustratrice danoise. Techniques traditionnelles : eau-forte, lithographie, sérigraphie.', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80' },
  { id: 'ffc12138-d112-49a9-8fec-bcf0d6787bed', email: 'zhao.wei@art-core.com', username: 'zhao_wei_art', full_name: 'Zhao Wei', bio: 'Artiste multidisciplinaire sino-parisien. Dialogue entre calligraphie traditionnelle et art contemporain occidental.', avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80' },
  { id: 'd22cb823-9a02-4a27-b66b-6f5583519949', email: 'elena.volkov@art-core.com', username: 'elena_v', full_name: 'Elena Volkov', bio: 'Artiste ukrainienne basée à Paris. Installation, vidéo et performance — mémoire collective et trauma.', avatar_url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&q=80' },
];

async function main() {
  console.log('\n🎨 Fixing artists in public.users...\n');

  // Step 1: Verify auth users exist
  console.log('Step 1: Checking auth.users...');
  const checkResult = await sql(`SELECT id, email FROM auth.users WHERE id IN (${ARTISTS.map(a => `'${a.id}'`).join(',')}) ORDER BY email`);
  if (checkResult.status !== 200 && checkResult.status !== 201) {
    console.error('Failed to query auth.users:', JSON.stringify(checkResult.data));
    process.exit(1);
  }
  const found = Array.isArray(checkResult.data) ? checkResult.data.length : 0;
  console.log(`  Found ${found}/10 artists in auth.users`);

  if (found === 0) {
    console.error('❌ No artists found in auth.users. Cannot proceed without auth user records.');
    process.exit(1);
  }

  // Step 2: Delete any partial rows first, then insert clean
  console.log('\nStep 2: Removing any stale artist rows...');
  await exec(
    `DELETE FROM public.users WHERE id IN (${ARTISTS.map(a => `'${a.id}'`).join(',')})`,
    'Clean stale artist rows'
  );
  await sleep(500);

  // Step 3: Insert artists into public.users
  console.log('\nStep 3: Inserting artists into public.users...');
  for (const a of ARTISTS) {
    const esc = s => s ? String(s).replace(/'/g, "''") : '';
    const q = `INSERT INTO public.users (id, email, username, full_name, bio, avatar_url, verified, onboarding_done, created_at, updated_at)
VALUES ('${a.id}', '${esc(a.email)}', '${esc(a.username)}', '${esc(a.full_name)}', '${esc(a.bio)}', '${esc(a.avatar_url)}', true, true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, username = EXCLUDED.username, full_name = EXCLUDED.full_name, bio = EXCLUDED.bio, avatar_url = EXCLUDED.avatar_url, verified = true, onboarding_done = true`;
    await exec(q, `Insert user ${a.username}`);
    await sleep(300);
  }

  // Step 4: Insert artist roles into user_roles
  console.log('\nStep 4: Inserting artist roles...');
  for (const a of ARTISTS) {
    const q = `INSERT INTO public.user_roles (user_id, role, granted_at)
VALUES ('${a.id}', 'artist', NOW())
ON CONFLICT DO NOTHING`;
    await exec(q, `Role artist for ${a.username}`);
    await sleep(200);
  }

  // Step 5: Verify
  console.log('\nStep 5: Verifying...');
  const verify = await sql(`SELECT COUNT(*) as cnt FROM public.users WHERE id IN (${ARTISTS.map(a => `'${a.id}'`).join(',')})`);
  const cnt = Array.isArray(verify.data) && verify.data[0] ? verify.data[0].cnt : '?';
  console.log(`  ✅ ${cnt}/10 artists now in public.users`);

  const verifyRoles = await sql(`SELECT COUNT(*) as cnt FROM public.user_roles WHERE user_id IN (${ARTISTS.map(a => `'${a.id}'`).join(',')}) AND role = 'artist'`);
  const roleCnt = Array.isArray(verifyRoles.data) && verifyRoles.data[0] ? verifyRoles.data[0].cnt : '?';
  console.log(`  ✅ ${roleCnt}/10 artist roles in user_roles`);

  console.log('\n✅ Artists fixed! Now inserting artworks...\n');

  // Step 6: Run insert-artworks.js
  try {
    execSync('node scripts/insert-artworks.js', { stdio: 'inherit', cwd: process.cwd() });
  } catch (e) {
    console.error('insert-artworks.js failed:', e.message);
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
