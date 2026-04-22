-- ══════════════════════════════════════════════════════════
-- CORE ECOSYSTEM — Central Database Schema (SQLite)
-- Shared between ART-CORE, PASS-CORE, PRIME-CORE
-- ══════════════════════════════════════════════════════════

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'client' CHECK(role IN ('artist', 'initiate', 'client', 'admin')),
  avatar_url TEXT,
  bio TEXT,
  points_balance REAL DEFAULT 0,
  total_earned REAL DEFAULT 0,
  bank_partner_connected INTEGER DEFAULT 0,
  is_initie INTEGER DEFAULT 0,
  stripe_account_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Artworks
CREATE TABLE IF NOT EXISTS artworks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist_id TEXT NOT NULL REFERENCES users(id),
  description TEXT,
  technique TEXT,
  dimensions TEXT,
  creation_date TEXT,
  category TEXT DEFAULT 'painting',
  photos TEXT DEFAULT '[]',
  macro_photo TEXT,
  macro_position TEXT DEFAULT '',
  macro_quality_score INTEGER DEFAULT 0,
  blockchain_hash TEXT,
  blockchain_tx_id TEXT,
  certification_date TEXT,
  status TEXT DEFAULT 'certified' CHECK(status IN ('certified', 'for_sale', 'pending_sale', 'sold')),
  price REAL DEFAULT 0,
  final_sale_price REAL,
  gauge_points REAL DEFAULT 0,
  gauge_locked INTEGER DEFAULT 0,
  gauge_emptied_at TEXT,
  listed_at TEXT,
  sold_at TEXT,
  buyer_id TEXT REFERENCES users(id),
  boost_active INTEGER DEFAULT 0,
  boost_expires_at TEXT,
  highlight_active INTEGER DEFAULT 0,
  highlight_expires_at TEXT,
  views_count INTEGER DEFAULT 0,
  favorites_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Gauge entries (points deposited by initiates)
CREATE TABLE IF NOT EXISTS gauge_entries (
  id TEXT PRIMARY KEY,
  artwork_id TEXT NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  initiate_id TEXT NOT NULL REFERENCES users(id),
  points REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Transactions (sales)
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  artwork_id TEXT NOT NULL REFERENCES artworks(id),
  buyer_id TEXT NOT NULL REFERENCES users(id),
  seller_id TEXT NOT NULL REFERENCES users(id),
  amount REAL NOT NULL,
  commission_platform REAL DEFAULT 0,
  commission_artist_royalty REAL DEFAULT 0,
  status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'cancelled')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Initiate commissions (paid out when artwork sells)
CREATE TABLE IF NOT EXISTS initiate_commissions (
  id TEXT PRIMARY KEY,
  transaction_id TEXT REFERENCES transactions(id),
  initiate_id TEXT NOT NULL REFERENCES users(id),
  artwork_id TEXT NOT NULL REFERENCES artworks(id),
  points_invested REAL NOT NULL,
  percentage REAL NOT NULL,
  commission_amount REAL NOT NULL,
  paid_as_points REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL REFERENCES users(id),
  receiver_id TEXT NOT NULL REFERENCES users(id),
  artwork_id TEXT REFERENCES artworks(id),
  content TEXT NOT NULL,
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artwork_id TEXT NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, artwork_id)
);

-- Follows
CREATE TABLE IF NOT EXISTS follows (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL REFERENCES users(id),
  following_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(follower_id, following_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Promo shop items
CREATE TABLE IF NOT EXISTS promo_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cost_points REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('boost', 'highlight', 'badge', 'search_priority', 'featured')),
  duration_hours INTEGER DEFAULT 24,
  icon TEXT
);

-- Promo purchases
CREATE TABLE IF NOT EXISTS promo_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  artwork_id TEXT REFERENCES artworks(id),
  promo_item_id TEXT NOT NULL REFERENCES promo_items(id),
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Offers (price proposals)
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  artwork_id TEXT NOT NULL REFERENCES artworks(id),
  buyer_id TEXT NOT NULL REFERENCES users(id),
  amount REAL NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- ══════════════════════════════════════════════════════════
-- PRIME-CORE: Prediction Markets (Bets)
-- ══════════════════════════════════════════════════════════

-- Betting markets
CREATE TABLE IF NOT EXISTS betting_markets (
  id TEXT PRIMARY KEY,
  artwork_id TEXT NOT NULL REFERENCES artworks(id),
  market_type TEXT NOT NULL CHECK(market_type IN ('time', 'value')),
  question TEXT NOT NULL,
  threshold_value REAL,
  threshold_days INTEGER,
  total_yes_amount REAL DEFAULT 0,
  total_no_amount REAL DEFAULT 0,
  odds_yes REAL DEFAULT 2.0,
  odds_no REAL DEFAULT 2.0,
  status TEXT DEFAULT 'open' CHECK(status IN ('open', 'closed', 'resolved_yes', 'resolved_no')),
  resolved_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Individual bets
CREATE TABLE IF NOT EXISTS bets (
  id TEXT PRIMARY KEY,
  market_id TEXT NOT NULL REFERENCES betting_markets(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  position TEXT NOT NULL CHECK(position IN ('yes', 'no')),
  amount REAL NOT NULL,
  odds_at_bet REAL NOT NULL,
  potential_payout REAL NOT NULL,
  result TEXT CHECK(result IN ('won', 'lost', 'pending')),
  payout REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Point transactions ledger
CREATE TABLE IF NOT EXISTS point_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('signup_bonus', 'gauge_deposit', 'gauge_refund', 'commission', 'promo_purchase', 'bet_place', 'bet_win', 'points_purchase', 'artist_gauge_empty')),
  reference_id TEXT,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Admin OTP codes (for admin email authentication)
CREATE TABLE IF NOT EXISTS admin_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_codes_email ON admin_codes(email);
CREATE INDEX IF NOT EXISTS idx_admin_codes_code ON admin_codes(code);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_artworks_artist ON artworks(artist_id);
CREATE INDEX IF NOT EXISTS idx_artworks_status ON artworks(status);
CREATE INDEX IF NOT EXISTS idx_artworks_category ON artworks(category);
CREATE INDEX IF NOT EXISTS idx_gauge_entries_artwork ON gauge_entries(artwork_id);
CREATE INDEX IF NOT EXISTS idx_gauge_entries_initiate ON gauge_entries(initiate_id);
CREATE INDEX IF NOT EXISTS idx_transactions_artwork ON transactions(artwork_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_bets_market ON bets(market_id);
CREATE INDEX IF NOT EXISTS idx_betting_markets_artwork ON betting_markets(artwork_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
