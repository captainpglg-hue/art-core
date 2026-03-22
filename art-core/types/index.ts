// ============================================================
// ART-CORE — Master TypeScript Types
// Shared across PASS-CORE, ART-CORE, PRIME-CORE
// ============================================================

// ── Enums ────────────────────────────────────────────────────

export type AppModule = "pass-core" | "art-core" | "prime-core" | "admin";

export type UserRole =
  | "collector"      // buyer / owner
  | "artist"         // creator
  | "gallery"        // gallery / dealer
  | "scout"          // Prime-Core scout
  | "admin"          // platform admin
  | "super_admin";   // Art-core LTD

export type ArtworkStatus =
  | "draft"           // not published yet
  | "pending_cert"    // awaiting Pass-Core certification
  | "certified"       // has a valid Pass-Core
  | "listed"          // active on marketplace
  | "auction"         // in active auction
  | "sold"            // transferred ownership
  | "rented"          // currently rented
  | "archived";       // removed from marketplace

export type PassCoreStatus =
  | "active"          // valid, unlocked
  | "locked"          // transfer initiated, awaiting new owner
  | "transferred"     // transfer complete, new Pass issued
  | "revoked";        // invalidated by admin

export type TransactionType =
  | "purchase"
  | "auction_win"
  | "rental"
  | "royalty"
  | "scout_commission"
  | "platform_fee"
  | "refund";

export type TransactionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "refunded";

export type AuctionStatus =
  | "scheduled"
  | "live"
  | "ended"
  | "cancelled";

export type RentalStatus =
  | "active"
  | "overdue"
  | "returned"
  | "disputed";

// ── User & Profile ───────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  role: UserRole;
  stripe_account_id: string | null;   // Stripe Connect express account
  stripe_customer_id: string | null;
  verified: boolean;                  // KYC verified
  verified_at: string | null;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface ArtistProfile extends Profile {
  role: "artist";
  artist_name: string | null;
  specialty: string[];
  total_sales: number;
  total_artworks: number;
  royalty_rate: number;               // default 5%
  scout_id: string | null;            // linked Scout
}

export interface GalleryProfile extends Profile {
  role: "gallery";
  gallery_name: string;
  address: string | null;
  commission_rate: number;
  total_artists: number;
}

// ── Artwork ───────────────────────────────────────────────────

export interface Artwork {
  id: string;
  title: string;
  description: string | null;
  artist_id: string;
  artist: Pick<ArtistProfile, "id" | "full_name" | "artist_name" | "avatar_url">;
  status: ArtworkStatus;

  // Media
  image_url: string;            // HD — Cloudinary
  image_preview_url: string;    // Watermarked preview
  image_public_id: string;      // Cloudinary public_id
  additional_images: string[];

  // Artwork details
  year: number | null;
  medium: string | null;
  dimensions: string | null;    // e.g. "80 x 60 cm"
  edition: string | null;       // e.g. "1/1" or "3/10"
  category: ArtworkCategory;
  tags: string[];
  style: string[];

  // Pricing
  price: number | null;          // in cents (EUR)
  currency: string;
  rental_price_per_day: number | null;
  reserve_price: number | null;  // auction reserve

  // Certification
  pass_core_id: string | null;
  pass_core_status: PassCoreStatus | null;

  // Ownership
  current_owner_id: string;
  previous_owners: string[];

  // Visibility
  is_public: boolean;
  is_for_sale: boolean;
  is_for_rent: boolean;
  is_for_auction: boolean;

  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export type ArtworkCategory =
  | "painting"
  | "sculpture"
  | "photography"
  | "digital"
  | "drawing"
  | "printmaking"
  | "mixed_media"
  | "installation"
  | "video"
  | "textile"
  | "ceramics"
  | "other";

// ── Pass-Core (Certification Blockchain) ─────────────────────

export interface PassCore {
  id: string;
  artwork_id: string;
  artwork: Pick<Artwork, "id" | "title" | "artist_id">;

  // Blockchain data
  hash: string;                 // SHA-256 of artwork metadata
  tx_hash: string;              // blockchain transaction hash
  block_number: number;
  network: string;              // "polygon" | "base" | "simulation"
  contract_address: string | null;
  token_id: string | null;

  // Ownership
  current_owner_id: string;
  current_owner: Pick<Profile, "id" | "full_name" | "email">;
  previous_owner_id: string | null;
  issued_by: string;            // Art-core LTD — always platform

  // Status
  status: PassCoreStatus;
  locked_at: string | null;
  transferred_at: string | null;

  // QR / verification
  qr_code_url: string | null;
  verification_url: string;

  created_at: string;
  updated_at: string;
}

export interface PassCoreTransferEvent {
  id: string;
  pass_core_id: string;
  from_owner_id: string;
  to_owner_id: string;
  transaction_id: string;
  tx_hash: string;
  transferred_at: string;
}

// ── Marketplace (Art-Core) ────────────────────────────────────

export interface Listing {
  id: string;
  artwork_id: string;
  artwork: Artwork;
  seller_id: string;
  seller: Pick<Profile, "id" | "full_name" | "avatar_url" | "verified">;

  type: "fixed" | "auction" | "rental";
  price: number;              // cents
  currency: string;
  status: "active" | "sold" | "cancelled" | "expired";

  featured: boolean;
  featured_until: string | null;

  views: number;
  favorites: number;

  created_at: string;
  expires_at: string | null;
}

export interface Auction {
  id: string;
  listing_id: string;
  artwork_id: string;
  artwork: Artwork;

  status: AuctionStatus;
  start_price: number;         // cents
  reserve_price: number | null;
  current_bid: number | null;
  current_bidder_id: string | null;
  bid_count: number;
  currency: string;

  starts_at: string;
  ends_at: string;
  extended_end: string | null;  // shill-bid protection extension

  created_at: string;
}

export interface Bid {
  id: string;
  auction_id: string;
  bidder_id: string;
  bidder: Pick<Profile, "id" | "full_name" | "avatar_url">;
  amount: number;              // cents
  currency: string;
  is_winning: boolean;
  created_at: string;
}

export interface Rental {
  id: string;
  artwork_id: string;
  artwork: Pick<Artwork, "id" | "title" | "image_url">;
  renter_id: string;
  owner_id: string;

  status: RentalStatus;
  daily_rate: number;          // cents
  total_amount: number;
  currency: string;
  deposit_amount: number;

  start_date: string;
  end_date: string;
  returned_at: string | null;

  created_at: string;
}

// ── Transaction ───────────────────────────────────────────────

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;

  artwork_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;

  amount: number;              // cents — total charged to buyer
  platform_fee: number;        // cents — Art-core commission
  artist_royalty: number;      // cents — resale royalty
  scout_commission: number;    // cents — Prime-Core scout
  seller_net: number;          // cents — seller receives

  currency: string;

  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;

  metadata: Record<string, unknown>;

  created_at: string;
  completed_at: string | null;
}

// ── Prime-Core (Scouting & Royalties) ────────────────────────

export interface Scout {
  id: string;
  profile_id: string;
  profile: Pick<Profile, "id" | "full_name" | "avatar_url">;

  commission_rate: number;     // default 2%
  total_artists_scouted: number;
  total_earnings: number;      // cents lifetime
  affiliate_code: string;      // unique referral code

  stripe_account_id: string | null;
  is_active: boolean;

  created_at: string;
}

export interface ScoutedArtist {
  id: string;
  scout_id: string;
  artist_id: string;
  artist: Pick<ArtistProfile, "id" | "full_name" | "artist_name" | "avatar_url">;

  commission_rate: number;
  total_sales_generated: number;
  total_commission_earned: number;

  contract_signed_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface RoyaltyPayment {
  id: string;
  transaction_id: string;
  recipient_id: string;
  recipient_type: "artist" | "scout" | "platform";
  amount: number;
  currency: string;
  rate: number;
  stripe_transfer_id: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface AffiliateLink {
  id: string;
  scout_id: string;
  code: string;                // unique slug
  artwork_id: string | null;   // null = global link
  clicks: number;
  conversions: number;
  total_earned: number;
  expires_at: string | null;
  created_at: string;
}

// ── Dashboard Stats ───────────────────────────────────────────

export interface AdminStats {
  total_artworks: number;
  total_certifications: number;
  total_transactions: number;
  total_volume: number;           // cents
  total_platform_fees: number;
  active_listings: number;
  active_auctions: number;
  active_rentals: number;
  total_artists: number;
  total_collectors: number;
  total_scouts: number;
}

export interface ArtistStats {
  total_artworks: number;
  total_sales: number;
  total_revenue: number;
  total_royalties: number;
  active_listings: number;
  avg_sale_price: number;
  top_sale_price: number;
}

export interface ScoutStats {
  total_artists: number;
  total_sales_generated: number;
  total_commission_earned: number;
  pending_payouts: number;
  conversion_rate: number;
  affiliate_clicks: number;
}

// ── API Payloads ──────────────────────────────────────────────

export interface CertifyArtworkPayload {
  artwork_id: string;
  owner_id: string;
}

export interface PurchasePayload {
  artwork_id: string;
  listing_id: string;
  buyer_id: string;
  amount: number;
  currency?: string;
}

export interface PlaceBidPayload {
  auction_id: string;
  bidder_id: string;
  amount: number;
  currency?: string;
}

export interface GenerateAffiliateLinkPayload {
  scout_id: string;
  artwork_id?: string;
}

export interface PassCoreStatusResponse {
  pass_core_id: string;
  status: PassCoreStatus;
  hash: string;
  current_owner: Pick<Profile, "id" | "full_name">;
  locked: boolean;
  verification_url: string;
}

// ── Utility Types ─────────────────────────────────────────────

export type Paginated<T> = {
  data: T[];
  count: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export type SortOrder = "asc" | "desc";

export interface PaginationParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: SortOrder;
}

export interface ArtworkFilters extends PaginationParams {
  category?: ArtworkCategory;
  status?: ArtworkStatus;
  artist_id?: string;
  min_price?: number;
  max_price?: number;
  is_for_sale?: boolean;
  is_for_rent?: boolean;
  is_for_auction?: boolean;
  certified_only?: boolean;
  tags?: string[];
  search?: string;
}
