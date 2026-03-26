import { createAdminClient } from "@/lib/supabase/server";

// ── Supabase admin client (bypasses RLS) ──────────────────
// Replaces the old SQLite `getDb()`. Routes that called getDb() directly
// should now use `getSupabase()` which returns a Supabase client.
// For backward compat, `getDb()` is an alias.

function getSupabase() {
  return createAdminClient();
}

/** @deprecated Use getSupabase() — kept for backward compatibility with routes that import getDb */
export function getDb() {
  return getSupabase();
}

// Generate proper UUIDs for Supabase (v4 format)
function genId(_prefix?: string): string {
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${hex(3)}-${hex(12)}`;
}

// ── Seed demo data (run once) ─────────────────────────────
export async function seedDemoData() {
  const sb = getSupabase();

  // Check if users already exist
  const { count } = await sb.from("users").select("id", { count: "exact", head: true });
  if (count && count > 0) return;

  const bcrypt = require("bcryptjs");
  const hash = bcrypt.hashSync("password123", 10);
  const testHash = bcrypt.hashSync("Test1234!", 10);

  const users = [
    { id: "usr_artist_1", email: "artist@demo.com", password_hash: hash, full_name: "Marie Dubois", username: "marie.dubois", role: "artist", bio: "Artiste peintre contemporaine.", points_balance: 25, total_earned: 150, is_initie: false },
    { id: "usr_artist_2", email: "artist2@demo.com", password_hash: hash, full_name: "Lucas Martin", username: "lucas.martin", role: "artist", bio: "Sculpteur et photographe.", points_balance: 40, total_earned: 320, is_initie: false },
    { id: "usr_initie_1", email: "initie@demo.com", password_hash: hash, full_name: "Sophie Laurent", username: "sophie.laurent", role: "initiate", bio: "Passionnee d'art contemporain.", points_balance: 45, total_earned: 280, is_initie: true },
    { id: "usr_initie_2", email: "initie2@demo.com", password_hash: hash, full_name: "Thomas Bernard", username: "thomas.bernard", role: "initiate", bio: "Expert en art moderne.", points_balance: 60, total_earned: 450, is_initie: true },
    { id: "usr_client_1", email: "client@demo.com", password_hash: hash, full_name: "Jean Dupont", username: "jean.dupont", role: "client", bio: "Collectionneur amateur.", points_balance: 0, total_earned: 0, is_initie: false },
    { id: "usr_admin_1", email: "admin@artcore.com", password_hash: hash, full_name: "Admin Core", username: "admin", role: "admin", bio: "Administrateur de la plateforme.", points_balance: 0, total_earned: 0, is_initie: false },
    { id: "usr_test_marie", email: "marie.test@passcore.io", password_hash: testHash, full_name: "Marie Lefort", username: "marie_lefort", role: "artist", bio: "Artiste peintre basee a Lyon.", points_balance: 0, total_earned: 0, is_initie: false },
    { id: "usr_test_alex", email: "alex.test@passcore.io", password_hash: testHash, full_name: "Alex Moreau", username: "alex_moreau", role: "ambassador", bio: "Ambassadeur a Paris.", points_balance: 0, total_earned: 0, is_initie: false },
    { id: "usr_test_galerie", email: "galerie.test@passcore.io", password_hash: testHash, full_name: "Galerie Dupont", username: "galerie_dupont", role: "gallery", bio: "Galerie d'art a Paris.", points_balance: 0, total_earned: 0, is_initie: false },
    { id: "usr_test_jean", email: "jean.test@passcore.io", password_hash: testHash, full_name: "Jean Blanc", username: "jean_blanc", role: "client", bio: "Collectionneur a Bordeaux.", points_balance: 0, total_earned: 0, is_initie: false },
  ];

  await sb.from("users").upsert(users, { onConflict: "id" });

  const promoItems = [
    { id: "promo_boost_search", name: "Boost Recherche 24h", description: "Remonte en tete des resultats.", cost_points: 50, cost_euros: 5, tier: "bronze", type: "boost_search", duration_hours: 24, icon: "search", sort_order: 1 },
    { id: "promo_badge_new", name: "Badge Nouveau 72h", description: "Badge dore visible 72h.", cost_points: 75, cost_euros: 7, tier: "bronze", type: "badge_new", duration_hours: 72, icon: "sparkles", sort_order: 2 },
    { id: "promo_notif_scouts", name: "Notification Scouts", description: "Alerte les scouts actifs.", cost_points: 100, cost_euros: 10, tier: "bronze", type: "notify_scouts", duration_hours: 1, icon: "bell-ring", sort_order: 3 },
    { id: "promo_story", name: "Story ART-CORE 48h", description: "Apparait dans les stories.", cost_points: 150, cost_euros: 15, tier: "bronze", type: "story", duration_hours: 48, icon: "film", sort_order: 4 },
    { id: "promo_carousel", name: "Homepage Carousel 48h", description: "Affichee dans le carousel.", cost_points: 200, cost_euros: 20, tier: "silver", type: "carousel", duration_hours: 48, icon: "layout-dashboard", sort_order: 5 },
    { id: "promo_newsletter", name: "Newsletter Feature", description: "Incluse dans la newsletter.", cost_points: 300, cost_euros: 30, tier: "silver", type: "newsletter", duration_hours: 168, icon: "mail", sort_order: 6 },
    { id: "promo_editorial", name: "Selection Editoriale", description: "Collection thematique curatee.", cost_points: 400, cost_euros: 40, tier: "silver", type: "editorial", duration_hours: 336, icon: "bookmark", sort_order: 7 },
    { id: "promo_geo", name: "Boost Geolocalise", description: "Mis en avant localement.", cost_points: 500, cost_euros: 50, tier: "silver", type: "geo_boost", duration_hours: 168, icon: "map-pin", sort_order: 8 },
    { id: "promo_featured_artist", name: "Artiste a la Une 1 semaine", description: "Page dediee avec interview.", cost_points: 1000, cost_euros: 100, tier: "gold", type: "featured_artist", duration_hours: 168, icon: "crown", sort_order: 9 },
    { id: "promo_social_pack", name: "Pack Reseaux Sociaux", description: "Post Instagram + TikTok.", cost_points: 1500, cost_euros: 150, tier: "gold", type: "social_pack", duration_hours: 168, icon: "share-2", sort_order: 10 },
    { id: "promo_push_buyers", name: "Notification Push Acheteurs", description: "Alerte push envoyee.", cost_points: 1500, cost_euros: 150, tier: "gold", type: "push_buyers", duration_hours: 1, icon: "zap", sort_order: 11 },
    { id: "promo_premium_badge", name: "Badge Certifie Premium 30j", description: "Badge premium 30 jours.", cost_points: 2000, cost_euros: 200, tier: "gold", type: "premium_badge", duration_hours: 720, icon: "award", sort_order: 12 },
  ];

  await sb.from("promo_items").upsert(promoItems, { onConflict: "id" });

  const artworks = [
    { id: "art_001", title: "Crepuscule Dore", artist_id: "usr_artist_1", description: "Une exploration lumineuse du coucher de soleil.", technique: "Huile sur toile", dimensions: "80x120 cm", creation_date: "2024-06-15", category: "painting", photos: '["https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800"]', macro_photo: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=200", blockchain_hash: "0xABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890", blockchain_tx_id: "tx_001_poly", certification_date: "2024-07-01", certification_status: "approved", status: "for_sale", price: 4500, gauge_points: 72, gauge_locked: false, listed_at: "2024-07-02" },
    { id: "art_002", title: "Fragments Urbains", artist_id: "usr_artist_1", description: "Collage mixte capturant la ville.", technique: "Technique mixte", dimensions: "60x90 cm", creation_date: "2024-08-20", category: "mixed_media", photos: '["https://images.unsplash.com/photo-1549490349-8643362247b5?w=800"]', blockchain_hash: "0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF", blockchain_tx_id: "tx_002_poly", certification_date: "2024-09-01", certification_status: "approved", status: "for_sale", price: 2800, gauge_points: 35, gauge_locked: false, listed_at: "2024-09-02" },
    { id: "art_003", title: "Silence Mineral", artist_id: "usr_artist_2", description: "Sculpture en marbre de Carrare.", technique: "Sculpture marbre", dimensions: "45x30x25 cm", creation_date: "2024-05-10", category: "sculpture", photos: '["https://images.unsplash.com/photo-1554188248-986adbb73be4?w=800"]', blockchain_hash: "0xFEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210", blockchain_tx_id: "tx_003_poly", certification_date: "2024-06-01", certification_status: "approved", status: "for_sale", price: 8500, gauge_points: 100, gauge_locked: true, listed_at: "2024-06-05" },
    { id: "art_004", title: "Ondes Paralleles", artist_id: "usr_artist_2", description: "Photographie grand format noir et blanc.", technique: "Photographie argentique", dimensions: "100x150 cm", creation_date: "2024-10-01", category: "photography", photos: '["https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800"]', blockchain_hash: "0x9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA", blockchain_tx_id: "tx_004_poly", certification_date: "2024-10-15", certification_status: "approved", status: "for_sale", price: 3200, gauge_points: 18, gauge_locked: false, listed_at: "2024-10-16" },
    { id: "art_005", title: "Eclats de Memoire", artist_id: "usr_artist_1", description: "Aquarelle abstraite.", technique: "Aquarelle sur papier", dimensions: "50x70 cm", creation_date: "2024-11-01", category: "painting", photos: '["https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800"]', blockchain_hash: "0x5555AAAA5555AAAA5555AAAA5555AAAA5555AAAA5555AAAA5555AAAA5555AAAA", blockchain_tx_id: "tx_005_poly", certification_date: "2024-11-10", certification_status: "approved", status: "for_sale", price: 1800, gauge_points: 55, gauge_locked: false, listed_at: "2024-11-11" },
  ];

  // artworks table uses width_cm/height_cm not dimensions, but we added a 'dimensions' col via technique
  // Actually the Supabase artworks table doesn't have 'dimensions' — store in description or ignore.
  // We'll insert the columns that exist.
  for (const a of artworks) {
    await sb.from("artworks").upsert({
      id: a.id,
      title: a.title,
      artist_id: a.artist_id,
      owner_id: a.artist_id,
      description: a.description,
      technique: a.technique,
      creation_date: a.creation_date,
      category: a.category,
      photos: a.photos,
      macro_photo: a.macro_photo || null,
      blockchain_hash: a.blockchain_hash,
      blockchain_tx_id: a.blockchain_tx_id,
      certification_date: a.certification_date,
      certification_status: a.certification_status,
      status: a.status,
      price: a.price,
      gauge_points: a.gauge_points,
      gauge_locked: a.gauge_locked,
      listed_at: a.listed_at,
    }, { onConflict: "id" });
  }

  const gaugeEntries = [
    { id: "ge_001", artwork_id: "art_001", initiate_id: "usr_initie_1", points: 40, created_at: "2024-07-10T00:00:00Z" },
    { id: "ge_002", artwork_id: "art_001", initiate_id: "usr_initie_2", points: 32, created_at: "2024-07-15T00:00:00Z" },
    { id: "ge_003", artwork_id: "art_003", initiate_id: "usr_initie_1", points: 55, created_at: "2024-06-10T00:00:00Z" },
    { id: "ge_004", artwork_id: "art_003", initiate_id: "usr_initie_2", points: 45, created_at: "2024-06-15T00:00:00Z" },
  ];

  await sb.from("gauge_entries").upsert(gaugeEntries, { onConflict: "id" });

  const bettingMarkets = [
    { id: "mkt_001", artwork_id: "art_001", market_type: "time", question: "Crepuscule Dore vendue en moins de 30 jours ?", threshold_days: 30, total_yes_amount: 45, total_no_amount: 30, odds_yes: 1.67, odds_no: 2.50, status: "open", created_at: "2024-07-05T00:00:00Z" },
  ];

  await sb.from("betting_markets").upsert(bettingMarkets, { onConflict: "id" });
}

// ── User queries ──────────────────────────────────────────
// The Supabase `users` table uses `full_name` instead of `name`.
// We add a virtual `name` alias in the returned object for backward compat.

function userWithNameAlias(row: any) {
  if (!row) return null;
  return { ...row, name: row.full_name, points_balance: Number(row.points_balance ?? 0), total_earned: Number(row.total_earned ?? 0) };
}

export function getUserById(id: string) {
  const sb = getSupabase();
  return sb.from("users").select("*").eq("id", id).single()
    .then(({ data }) => userWithNameAlias(data));
}

export function getUserByEmail(email: string) {
  const sb = getSupabase();
  return sb.from("users").select("*").eq("email", email).single()
    .then(({ data }) => userWithNameAlias(data));
}

export function getUserByToken(token: string) {
  const sb = getSupabase();
  return sb.from("sessions").select("*").eq("token", token).gt("expires_at", new Date().toISOString()).single()
    .then(async ({ data: session }) => {
      if (!session) return null;
      return getUserById(session.user_id);
    });
}

export async function createSession(userId: string, token: string) {
  const sb = getSupabase();
  const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await sb.from("sessions").insert({ user_id: userId, token, expires_at }).select("id").single();
  if (error) console.error("createSession error:", error.message);
  return data?.id ?? null;
}

export function deleteSession(token: string) {
  const sb = getSupabase();
  return sb.from("sessions").delete().eq("token", token).then(() => {});
}

// ── Artwork queries ───────────────────────────────────────
// Supabase uses `full_name` in users. We join manually via a nested select or RPC.
// For the join (artworks + users), we use Supabase's foreign key join syntax.

function artworkWithAliases(row: any) {
  if (!row) return null;
  // Map Supabase column names back to what the routes expect
  const r = { ...row };
  r.price = Number(r.price ?? 0);
  r.gauge_points = Number(r.gauge_points ?? 0);
  r.final_sale_price = r.final_sale_price != null ? Number(r.final_sale_price) : null;
  r.views_count = Number(r.views_count ?? 0);
  r.favorites_count = Number(r.favorites_count ?? 0);
  // Ensure photos is always a valid JSON array string
  // Some artworks use image_url instead of photos
  if (!r.photos || r.photos === "[]" || r.photos === "null") {
    if (r.image_url) {
      r.photos = JSON.stringify([r.image_url]);
    } else if (r.additional_images && Array.isArray(r.additional_images) && r.additional_images.length > 0) {
      r.photos = JSON.stringify(r.additional_images);
    } else {
      r.photos = "[]";
    }
  }
  // If joined with artist info
  if (r.artist) {
    r.artist_name = r.artist.full_name;
    r.artist_username = r.artist.username;
    r.artist_avatar = r.artist.avatar_url;
    r.artist_bio = r.artist.bio;
    delete r.artist;
  }
  return r;
}

export async function getArtworks(options: {
  status?: string;
  category?: string;
  search?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  artistId?: string;
  boosted?: boolean;
}) {
  const sb = getSupabase();
  let query = sb.from("artworks").select("*, artist:users!artworks_artist_id_fkey(full_name, username, avatar_url)");

  if (options.status) query = query.eq("status", options.status);
  if (options.category) query = query.eq("category", options.category);
  if (options.artistId) query = query.eq("artist_id", options.artistId);
  if (options.search) {
    query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }

  // Sorting
  if (options.sort === "price_asc") query = query.order("price", { ascending: true });
  else if (options.sort === "price_desc") query = query.order("price", { ascending: false });
  else if (options.sort === "gauge") query = query.order("gauge_points", { ascending: false });
  else if (options.sort === "popular") query = query.order("views_count", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const limit = options.limit || 20;
  const offset = options.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(artworkWithAliases);
}

export async function getArtworkById(id: string) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("artworks")
    .select("*, artist:users!artworks_artist_id_fkey(full_name, username, avatar_url, bio)")
    .eq("id", id)
    .single();
  if (error) return null;
  return artworkWithAliases(data);
}

export async function countArtworks(options: { status?: string; category?: string; search?: string; artistId?: string }) {
  const sb = getSupabase();
  let query = sb.from("artworks").select("id", { count: "exact", head: true });

  if (options.status) query = query.eq("status", options.status);
  if (options.category) query = query.eq("category", options.category);
  if (options.artistId) query = query.eq("artist_id", options.artistId);
  if (options.search) {
    query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

// ── Gauge queries ─────────────────────────────────────────
export async function getGaugeEntries(artworkId: string) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("gauge_entries")
    .select("*, initiate:users!gauge_entries_initiate_id_fkey(full_name, username)")
    .eq("artwork_id", artworkId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    ...row,
    points: Number(row.points),
    initiate_name: row.initiate?.full_name,
    initiate_username: row.initiate?.username,
    initiate: undefined,
  }));
}

export async function depositGauge(artworkId: string, initiateId: string, points: number) {
  const sb = getSupabase();

  // Fetch artwork
  const { data: artwork } = await sb.from("artworks").select("*").eq("id", artworkId).single();
  if (!artwork) throw new Error("Artwork not found");
  if (artwork.gauge_locked) throw new Error("Gauge is locked");
  if (artwork.status === "sold") throw new Error("Artwork already sold");

  // Fetch user
  const { data: user } = await sb.from("users").select("*").eq("id", initiateId).single();
  if (!user || !user.is_initie) throw new Error("User is not an initiate");
  if (Number(user.points_balance) < points) throw new Error("Insufficient points");

  const currentGauge = Number(artwork.gauge_points ?? 0);
  const newGauge = Math.min(currentGauge + points, 100);
  const actualPoints = newGauge - currentGauge;
  if (actualPoints <= 0) throw new Error("Gauge is full");

  const gId = genId("ge");
  await sb.from("gauge_entries").insert({ id: gId, artwork_id: artworkId, initiate_id: initiateId, points: actualPoints });

  await sb.from("users").update({ points_balance: Number(user.points_balance) - actualPoints }).eq("id", initiateId);

  const locked = newGauge >= 100;
  await sb.from("artworks").update({ gauge_points: newGauge, gauge_locked: locked, updated_at: new Date().toISOString() }).eq("id", artworkId);

  const ptId = genId("pt");
  await sb.from("point_transactions").insert({ id: ptId, user_id: initiateId, amount: -actualPoints, type: "gauge_deposit", reference_id: gId, description: `Depot jauge: ${artwork.title}` });

  if (locked) {
    const nId = `notif_${Date.now()}`;
    await sb.from("notifications").insert({ id: nId, user_id: artwork.artist_id, type: "gauge_locked", title: "Jauge verrouillee !", message: `La jauge de "${artwork.title}" a atteint 100 points !`, link: `/art-core/oeuvre/${artworkId}` });
  }

  return { gauge_points: newGauge, gauge_locked: locked, points_deposited: actualPoints };
}

export async function emptyGauge(artworkId: string, artistId: string) {
  const sb = getSupabase();

  const { data: artwork } = await sb.from("artworks").select("*").eq("id", artworkId).single();
  if (!artwork) throw new Error("Artwork not found");
  if (artwork.artist_id !== artistId) throw new Error("Not the artist");
  const pointsRecovered = Number(artwork.gauge_points ?? 0);
  if (pointsRecovered <= 0) throw new Error("Gauge is already empty");

  const { data: artist } = await sb.from("users").select("points_balance").eq("id", artistId).single();
  await sb.from("users").update({ points_balance: Number(artist?.points_balance ?? 0) + pointsRecovered }).eq("id", artistId);

  await sb.from("artworks").update({ gauge_points: 0, gauge_locked: false, gauge_emptied_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", artworkId);

  const ptId = genId("pt");
  await sb.from("point_transactions").insert({ id: ptId, user_id: artistId, amount: pointsRecovered, type: "artist_gauge_empty", reference_id: artworkId, description: `Vidage jauge: ${artwork.title}` });

  // Notify initiates
  const { data: entries } = await sb.from("gauge_entries").select("initiate_id").eq("artwork_id", artworkId);
  const uniqueInitiates = Array.from(new Set((entries || []).map((e: any) => e.initiate_id)));
  for (const initiateId of uniqueInitiates) {
    const nId = genId("notif");
    await sb.from("notifications").insert({ id: nId, user_id: initiateId, type: "gauge_emptied", title: "Jauge videe", message: `L'artiste a vide la jauge de "${artwork.title}".`, link: `/art-core/oeuvre/${artworkId}` });
  }

  await sb.from("gauge_entries").delete().eq("artwork_id", artworkId);

  return { points_recovered: pointsRecovered };
}

// ── Sale / Transaction ────────────────────────────────────
export async function confirmSale(artworkId: string, buyerId: string) {
  const sb = getSupabase();

  const { data: artwork } = await sb.from("artworks").select("*").eq("id", artworkId).single();
  if (!artwork) throw new Error("Artwork not found");
  if (artwork.status === "sold") throw new Error("Already sold");

  const amount = Number(artwork.price);
  const commissionPlatform = amount * 0.10;

  const txId = genId("tx");
  await sb.from("transactions").insert({
    id: txId, artwork_id: artworkId, buyer_id: buyerId, seller_id: artwork.artist_id,
    amount, commission_platform: commissionPlatform, status: "completed",
  });

  await sb.from("artworks").update({
    status: "sold", final_sale_price: amount, buyer_id: buyerId,
    sold_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("id", artworkId);

  // Initiate commissions if gauge was locked
  if (artwork.gauge_locked) {
    // Manual aggregation of gauge entries
    const { data: rawEntries } = await sb.from("gauge_entries").select("initiate_id, points").eq("artwork_id", artworkId);
    const grouped: Record<string, number> = {};
    (rawEntries || []).forEach((e: any) => {
      grouped[e.initiate_id] = (grouped[e.initiate_id] || 0) + Number(e.points);
    });
    const totalGaugePoints = Object.values(grouped).reduce((sum, p) => sum + p, 0);
    const commissionPool = commissionPlatform * 0.5;

    for (const [initiateId, totalPoints] of Object.entries(grouped)) {
      const percentage = (totalPoints / totalGaugePoints) * 100;
      const commissionAmount = (totalPoints / totalGaugePoints) * commissionPool;
      const bonusPoints = commissionAmount * 1.2;

      const icId = genId("ic");
      await sb.from("initiate_commissions").insert({
        id: icId, transaction_id: txId, initiate_id: initiateId, artwork_id: artworkId,
        points_invested: totalPoints, percentage, commission_amount: commissionAmount, paid_as_points: bonusPoints,
      });

      const { data: initUser } = await sb.from("users").select("points_balance, total_earned").eq("id", initiateId).single();
      await sb.from("users").update({
        points_balance: Number(initUser?.points_balance ?? 0) + bonusPoints,
        total_earned: Number(initUser?.total_earned ?? 0) + commissionAmount,
      }).eq("id", initiateId);

      const ptId = genId("pt");
      await sb.from("point_transactions").insert({
        id: ptId, user_id: initiateId, amount: bonusPoints, type: "commission",
        reference_id: icId, description: `Commission vente: ${artwork.title}`,
      });

      const nId = genId("notif");
      await sb.from("notifications").insert({
        id: nId, user_id: initiateId, type: "commission", title: "Commission recue !",
        message: `Vous avez recu ${bonusPoints.toFixed(0)} pts pour "${artwork.title}".`, link: "/art-core/wallet",
      });
    }
  }

  // Resolve betting markets
  const { data: markets } = await sb.from("betting_markets").select("*").eq("artwork_id", artworkId).eq("status", "open");
  const saleDate = new Date();
  const listDate = new Date(artwork.listed_at || artwork.created_at);
  const daysSinceListing = Math.floor((saleDate.getTime() - listDate.getTime()) / (1000 * 60 * 60 * 24));

  for (const market of (markets || [])) {
    let resolved: string;
    if (market.market_type === "time") {
      resolved = daysSinceListing <= market.threshold_days ? "resolved_yes" : "resolved_no";
    } else {
      resolved = amount >= Number(market.threshold_value) ? "resolved_yes" : "resolved_no";
    }

    await sb.from("betting_markets").update({ status: resolved, resolved_at: new Date().toISOString() }).eq("id", market.id);

    const winPosition = resolved === "resolved_yes" ? "yes" : "no";
    await sb.from("bets").update({ result: "won" }).eq("market_id", market.id).eq("position", winPosition);
    await sb.from("bets").update({ result: "lost", payout: 0 }).eq("market_id", market.id).neq("position", winPosition);

    const { data: winners } = await sb.from("bets").select("*").eq("market_id", market.id).eq("result", "won");
    for (const bet of (winners || [])) {
      const { data: betUser } = await sb.from("users").select("points_balance").eq("id", bet.user_id).single();
      await sb.from("users").update({
        points_balance: Number(betUser?.points_balance ?? 0) + Number(bet.potential_payout),
      }).eq("id", bet.user_id);

      const ptId = genId("pt");
      await sb.from("point_transactions").insert({
        id: ptId, user_id: bet.user_id, amount: Number(bet.potential_payout), type: "bet_win",
        reference_id: bet.id, description: `Pari gagne: ${market.question}`,
      });
    }
  }

  // Seller reward
  const sellerPointsReward = Math.round(amount * 0.10);
  const { data: seller } = await sb.from("users").select("points_balance, total_earned").eq("id", artwork.artist_id).single();
  await sb.from("users").update({
    points_balance: Number(seller?.points_balance ?? 0) + sellerPointsReward,
    total_earned: Number(seller?.total_earned ?? 0) + sellerPointsReward,
  }).eq("id", artwork.artist_id);

  const ptSeller = genId("pt");
  await sb.from("point_transactions").insert({
    id: ptSeller, user_id: artwork.artist_id, amount: sellerPointsReward, type: "sale_reward",
    reference_id: txId, description: `+${sellerPointsReward} pts (10% vente "${artwork.title}")`,
  });

  const nId = genId("notif");
  await sb.from("notifications").insert({
    id: nId, user_id: artwork.artist_id, type: "sale", title: "Oeuvre vendue !",
    message: `"${artwork.title}" vendue pour ${amount}E. +${sellerPointsReward} pts !`, link: `/art-core/oeuvre/${artworkId}`,
  });

  return { transactionId: txId, amount, commissionPlatform, sellerPointsReward };
}

// ── Betting ───────────────────────────────────────────────
export async function placeBet(marketId: string, userId: string, position: "yes" | "no", amount: number) {
  const sb = getSupabase();

  const { data: market } = await sb.from("betting_markets").select("*").eq("id", marketId).single();
  if (!market) throw new Error("Market not found");
  if (market.status !== "open") throw new Error("Market is closed");

  const { data: user } = await sb.from("users").select("*").eq("id", userId).single();
  if (Number(user?.points_balance) < amount) throw new Error("Insufficient points");

  // Update market totals
  if (position === "yes") {
    await sb.from("betting_markets").update({ total_yes_amount: Number(market.total_yes_amount) + amount }).eq("id", marketId);
  } else {
    await sb.from("betting_markets").update({ total_no_amount: Number(market.total_no_amount) + amount }).eq("id", marketId);
  }

  // Re-fetch to compute odds
  const { data: updated } = await sb.from("betting_markets").select("*").eq("id", marketId).single();
  const totalPool = Number(updated!.total_yes_amount) + Number(updated!.total_no_amount);
  const oddsYes = totalPool / Math.max(Number(updated!.total_yes_amount), 0.01);
  const oddsNo = totalPool / Math.max(Number(updated!.total_no_amount), 0.01);

  await sb.from("betting_markets").update({
    odds_yes: Math.round(oddsYes * 100) / 100,
    odds_no: Math.round(oddsNo * 100) / 100,
  }).eq("id", marketId);

  const odds = position === "yes" ? oddsYes : oddsNo;
  const potentialPayout = amount * odds;

  const betId = genId("bet");
  await sb.from("bets").insert({
    id: betId, market_id: marketId, user_id: userId, position, amount,
    odds_at_bet: Math.round(odds * 100) / 100,
    potential_payout: Math.round(potentialPayout * 100) / 100, result: "pending",
  });

  await sb.from("users").update({ points_balance: Number(user!.points_balance) - amount }).eq("id", userId);

  const ptId = genId("pt");
  await sb.from("point_transactions").insert({
    id: ptId, user_id: userId, amount: -amount, type: "bet_place",
    reference_id: betId, description: `Pari: ${market.question}`,
  });

  return { betId, odds: Math.round(odds * 100) / 100, potentialPayout: Math.round(potentialPayout * 100) / 100 };
}

// ── Messages ──────────────────────────────────────────────
export async function getConversations(userId: string) {
  const sb = getSupabase();

  // Get all messages where user is sender or receiver, grouped by conversation
  const { data: allMessages } = await sb
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (!allMessages || allMessages.length === 0) return [];

  // Group by conversation_id, take latest message per conversation
  const convMap: Record<string, any> = {};
  for (const m of allMessages) {
    if (!convMap[m.conversation_id]) {
      convMap[m.conversation_id] = m;
    }
  }

  const result = [];
  for (const m of Object.values(convMap)) {
    const otherUserId = m.sender_id === userId ? m.receiver_id : m.sender_id;
    const { data: otherUser } = await sb.from("users").select("full_name, avatar_url").eq("id", otherUserId).single();

    // Count unread
    const { count: unreadCount } = await sb.from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", m.conversation_id)
      .eq("receiver_id", userId)
      .eq("read", false);

    // Get artwork title if linked
    let artworkTitle = null;
    if (m.artwork_id) {
      const { data: art } = await sb.from("artworks").select("title").eq("id", m.artwork_id).single();
      artworkTitle = art?.title;
    }

    result.push({
      conversation_id: m.conversation_id,
      artwork_id: m.artwork_id,
      artwork_title: artworkTitle,
      other_user_id: otherUserId,
      other_user_name: otherUser?.full_name,
      other_user_avatar: otherUser?.avatar_url,
      last_message: m.content,
      last_message_at: m.created_at,
      unread_count: unreadCount || 0,
    });
  }

  return result.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
}

export async function getMessages(conversationId: string) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("messages")
    .select("*, sender:users!messages_sender_id_fkey(full_name, avatar_url)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map((m: any) => ({
    ...m,
    sender_name: m.sender?.full_name,
    sender_avatar: m.sender?.avatar_url,
    sender: undefined,
  }));
}

// ── Points System ─────────────────────────────────────────
export async function awardPoints(userId: string, amount: number, type: string, refId: string | null, description: string) {
  const sb = getSupabase();
  const { data: user } = await sb.from("users").select("points_balance, total_earned").eq("id", userId).single();
  await sb.from("users").update({
    points_balance: Number(user?.points_balance ?? 0) + amount,
    total_earned: Number(user?.total_earned ?? 0) + Math.max(0, amount),
  }).eq("id", userId);

  const ptId = genId("pt");
  await sb.from("point_transactions").insert({
    id: ptId, user_id: userId, amount, type, reference_id: refId, description,
  });
  return ptId;
}

export async function getPromoItems() {
  const sb = getSupabase();
  const { data } = await sb.from("promo_items").select("*").order("sort_order", { ascending: true });
  return data || [];
}

export async function getActivePromos(userId: string) {
  const sb = getSupabase();
  const { data } = await sb
    .from("promo_purchases")
    .select("*, promo_item:promo_items!promo_purchases_promo_item_id_fkey(name, type, tier, icon), artwork:artworks!promo_purchases_artwork_id_fkey(title)")
    .eq("user_id", userId)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  return (data || []).map((row: any) => ({
    ...row,
    name: row.promo_item?.name,
    type: row.promo_item?.type,
    tier: row.promo_item?.tier,
    icon: row.promo_item?.icon,
    artwork_title: row.artwork?.title,
    promo_item: undefined,
    artwork: undefined,
  }));
}
