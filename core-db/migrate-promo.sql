-- ══════════════════════════════════════════════════════════
-- MIGRATION: Full Promotion System
-- ══════════════════════════════════════════════════════════

-- Add profile_complete flag to users
ALTER TABLE users ADD COLUMN profile_complete INTEGER DEFAULT 0;
-- Add referral tracking
ALTER TABLE users ADD COLUMN referred_by TEXT;
-- Add first certification bonus tracking
ALTER TABLE users ADD COLUMN first_cert_bonus INTEGER DEFAULT 0;

-- Drop old promo_items and recreate with tiers
DROP TABLE IF EXISTS promo_purchases;
DROP TABLE IF EXISTS promo_items;

CREATE TABLE IF NOT EXISTS promo_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cost_points REAL NOT NULL,
  cost_euros REAL NOT NULL DEFAULT 0,
  tier TEXT NOT NULL CHECK(tier IN ('bronze', 'silver', 'gold')),
  type TEXT NOT NULL,
  duration_hours INTEGER DEFAULT 24,
  icon TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS promo_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  artwork_id TEXT REFERENCES artworks(id),
  promo_item_id TEXT NOT NULL REFERENCES promo_items(id),
  paid_with TEXT NOT NULL DEFAULT 'points' CHECK(paid_with IN ('points', 'euros')),
  amount_paid REAL NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'expired', 'cancelled')),
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Community boosts
CREATE TABLE IF NOT EXISTS community_boosts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  artwork_id TEXT NOT NULL REFERENCES artworks(id),
  points_spent REAL NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, artwork_id)
);

-- Add boost count to artworks
ALTER TABLE artworks ADD COLUMN community_boosts INTEGER DEFAULT 0;
-- Add community boost auto-highlight threshold flag
ALTER TABLE artworks ADD COLUMN community_highlighted INTEGER DEFAULT 0;

-- Referral codes
CREATE TABLE IF NOT EXISTS referral_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  code TEXT UNIQUE NOT NULL,
  uses INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Update point_transactions to support new types
-- SQLite doesn't support ALTER CHECK, so we recreate
DROP TABLE IF EXISTS point_transactions_old;
ALTER TABLE point_transactions RENAME TO point_transactions_old;

CREATE TABLE point_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount REAL NOT NULL,
  type TEXT NOT NULL,
  reference_id TEXT,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO point_transactions SELECT * FROM point_transactions_old;
DROP TABLE point_transactions_old;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_promo_purchases_user ON promo_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_purchases_artwork ON promo_purchases(artwork_id);
CREATE INDEX IF NOT EXISTS idx_promo_purchases_status ON promo_purchases(status);
CREATE INDEX IF NOT EXISTS idx_community_boosts_artwork ON community_boosts(artwork_id);
CREATE INDEX IF NOT EXISTS idx_community_boosts_user ON community_boosts(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);

-- ══════════════════════════════════════════════════════════
-- SEED: Promo Items (3 tiers)
-- ══════════════════════════════════════════════════════════

-- BRONZE (50-150 pts / 5-15€)
INSERT OR REPLACE INTO promo_items (id, name, description, cost_points, cost_euros, tier, type, duration_hours, icon, sort_order) VALUES
('promo_boost_search', 'Boost Recherche 24h', 'Votre oeuvre remonte en tete des resultats de recherche pendant 24 heures.', 50, 5, 'bronze', 'boost_search', 24, 'search', 1),
('promo_badge_new', 'Badge "Nouveau" 72h', 'Badge dore visible sur la fiche oeuvre pendant 72 heures.', 75, 7, 'bronze', 'badge_new', 72, 'sparkles', 2),
('promo_notif_scouts', 'Notification Scouts', 'Alerte les scouts actifs qui suivent le meme style artistique.', 100, 10, 'bronze', 'notify_scouts', 1, 'bell-ring', 3),
('promo_story', 'Story ART-CORE 48h', 'Votre oeuvre apparait dans les stories de la plateforme pendant 48h.', 150, 15, 'bronze', 'story', 48, 'film', 4);

-- ARGENT (200-500 pts / 20-50€)
INSERT OR REPLACE INTO promo_items (id, name, description, cost_points, cost_euros, tier, type, duration_hours, icon, sort_order) VALUES
('promo_carousel', 'Homepage Carousel 48h', 'Oeuvre affichee dans le carousel de la page d''accueil pendant 48 heures.', 200, 20, 'silver', 'carousel', 48, 'layout-dashboard', 5),
('promo_newsletter', 'Newsletter Feature', 'Votre oeuvre incluse dans la newsletter hebdomadaire envoyee a tous les membres.', 300, 30, 'silver', 'newsletter', 168, 'mail', 6),
('promo_editorial', 'Selection Editoriale', 'Integration dans une collection thematique curatee par l''equipe ART-CORE.', 400, 40, 'silver', 'editorial', 336, 'bookmark', 7),
('promo_geo', 'Boost Geolocalisé', 'Mis en avant aupres des acheteurs dans votre zone geographique.', 500, 50, 'silver', 'geo_boost', 168, 'map-pin', 8);

-- OR (1000-2000 pts / 100-200€)
INSERT OR REPLACE INTO promo_items (id, name, description, cost_points, cost_euros, tier, type, duration_hours, icon, sort_order) VALUES
('promo_featured_artist', 'Artiste a la Une 1 semaine', 'Page dediee avec interview courte, mise en avant maximale sur la plateforme.', 1000, 100, 'gold', 'featured_artist', 168, 'crown', 9),
('promo_social_pack', 'Pack Reseaux Sociaux', 'Post Instagram + TikTok sur les comptes officiels ART-CORE.', 1500, 150, 'gold', 'social_pack', 168, 'share-2', 10),
('promo_push_buyers', 'Notification Push Acheteurs', 'Alerte push envoyee aux acheteurs cibles selon leurs preferences.', 1500, 150, 'gold', 'push_buyers', 1, 'zap', 11),
('promo_premium_badge', 'Badge "Certifie Premium" 30j', 'Badge premium permanent sur le profil et toutes les oeuvres pendant 30 jours.', 2000, 200, 'gold', 'premium_badge', 720, 'award', 12);
