// ============================================================
// ART-CORE — Supabase Database Types
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ── Enums ─────────────────────────────────────────────────────

export type UserRoleEnum =
  | "collector" | "artist" | "gallery" | "scout" | "admin" | "super_admin";

export type ArtworkStatusEnum =
  | "draft" | "pending_cert" | "certified" | "listed" | "auction"
  | "available" | "sold" | "rented" | "archived";

export type ArtworkCategoryEnum =
  | "painting" | "sculpture" | "photography" | "digital" | "drawing"
  | "printmaking" | "mixed_media" | "installation" | "video"
  | "textile" | "ceramics" | "other";

export type PassCoreStatusEnum =
  | "active" | "certified" | "pending" | "locked" | "transferred" | "revoked";

export type TransactionTypeEnum =
  | "purchase" | "auction_win" | "rental" | "royalty"
  | "scout_commission" | "platform_fee" | "refund" | "subscription";

export type TransactionStatusEnum =
  | "pending" | "processing" | "completed" | "failed" | "refunded";

export type SubscriptionPlanEnum   = "free" | "starter" | "pro" | "elite";
export type SubscriptionStatusEnum = "active" | "past_due" | "cancelled" | "trialing";
export type BetStatusEnum          = "active" | "winning" | "outbid" | "won" | "lost" | "cancelled";
export type AuctionStatusEnum      = "scheduled" | "live" | "ended" | "cancelled";
export type RecipientTypeEnum      = "artist" | "scout" | "platform";
export type ListingTypeEnum        = "fixed" | "auction" | "rental";
export type ListingStatusEnum      = "active" | "sold" | "cancelled" | "expired";
export type RentalStatusEnum       = "active" | "overdue" | "returned" | "disputed";

// ── Standalone Insert types (avoids circular reference in Database) ──

type UserInsert = {
  id: string; email: string; username: string;
  full_name?: string; avatar_url?: string | null; bio?: string | null;
  website?: string | null; phone?: string | null;
  stripe_account_id?: string | null; stripe_customer_id?: string | null;
  verified?: boolean; verified_at?: string | null; onboarded?: boolean;
  total_artworks?: number; total_sales?: number;
  total_purchases?: number; total_earned?: number;
  created_at?: string; updated_at?: string;
};

type UserRoleInsert = {
  id?: string; user_id: string; role: UserRoleEnum;
  granted_by?: string | null; granted_at?: string; is_active?: boolean;
};

type ArtworkInsert = {
  id?: string; title: string; description?: string | null;
  artist_id: string; status?: ArtworkStatusEnum;
  image_url?: string; image_preview_url?: string; image_public_id?: string;
  additional_images?: string[]; images?: string[];
  year?: number | null; medium?: string | null; dimensions?: string | null;
  edition?: string | null; category?: ArtworkCategoryEnum | null;
  tags?: string[]; style?: string[];
  price?: number | null; currency?: string;
  rental_price_per_day?: number | null; reserve_price?: number | null;
  pass_core_id?: string | null; pass_core_status?: PassCoreStatusEnum | null;
  current_owner_id: string; previous_owners?: string[];
  is_public?: boolean; is_for_sale?: boolean;
  is_for_rent?: boolean; is_for_auction?: boolean;
  demand_score?: number | null; scout_id?: string | null;
  views?: number; favorites?: number;
  created_at?: string; updated_at?: string; published_at?: string | null;
};

type PassCoreInsert = {
  id?: string; artwork_id: string; hash: string;
  tx_hash?: string | null; block_number?: number | null;
  network?: string | null; contract_address?: string | null;
  token_id?: string | null; current_owner_id: string;
  previous_owner_id?: string | null; issued_by: string;
  status?: PassCoreStatusEnum; locked_at?: string | null;
  transferred_at?: string | null; qr_code_url?: string | null;
  verification_url?: string | null; transfer_history?: Json;
  created_at?: string; updated_at?: string;
};

type PassCoreCertInsert = {
  id?: string; artwork_id: string; hash: string;
  tx_hash?: string | null; block_number?: number | null;
  network?: string | null; status?: PassCoreStatusEnum;
  certified_at?: string | null; created_at?: string; updated_at?: string;
};

type SubscriptionInsert = {
  id?: string; user_id: string;
  plan?: SubscriptionPlanEnum; status?: SubscriptionStatusEnum;
  stripe_subscription_id?: string | null; stripe_price_id?: string | null;
  current_period_start?: string | null; current_period_end?: string | null;
  cancel_at?: string | null; cancelled_at?: string | null; trial_end?: string | null;
  max_artworks?: number; max_certifications?: number; featured_listings?: number;
  created_at?: string; updated_at?: string;
};

type TransactionInsert = {
  id?: string; type: TransactionTypeEnum; status?: TransactionStatusEnum;
  artwork_id?: string | null; buyer_id?: string | null; seller_id?: string | null;
  amount: number; platform_fee?: number; artist_royalty?: number;
  scout_commission?: number; seller_net?: number; currency?: string;
  stripe_payment_intent_id?: string | null; stripe_transfer_id?: string | null;
  metadata?: Json; notes?: string | null;
  created_at?: string; completed_at?: string | null;
};

type RoyaltyInsert = {
  id?: string; transaction_id?: string | null; artwork_id?: string | null;
  recipient_id: string; recipient_type: RecipientTypeEnum; type?: string | null;
  amount: number; currency?: string; rate: number;
  stripe_transfer_id?: string | null; paid_at?: string | null; created_at?: string;
};

type BetInsert = {
  id?: string; auction_id: string; bidder_id: string;
  amount: number; currency?: string; status?: BetStatusEnum;
  stripe_payment_method_id?: string | null; stripe_setup_intent_id?: string | null;
  ip_address?: string | null; created_at?: string;
};

type AffiliateLinkInsert = {
  id?: string; scout_id: string; code: string;
  artwork_id?: string | null; clicks?: number; conversions?: number;
  total_earned?: number; utm_source?: string | null; utm_medium?: string | null;
  is_active?: boolean; expires_at?: string | null; created_at?: string;
};

type AnonymousMessageInsert = {
  id?: string; sender_id?: string | null; recipient_id: string;
  artwork_id?: string | null; subject?: string | null; body: string;
  is_anonymous?: boolean; is_read?: boolean; is_flagged?: boolean;
  flagged_at?: string | null; flagged_by?: string | null;
  parent_id?: string | null; created_at?: string;
};

type SettingInsert = {
  id?: string; key: string; value: string;
  description?: string | null; updated_by?: string | null; updated_at?: string;
};

type AuctionInsert = {
  id?: string; artwork_id: string; seller_id: string;
  status?: AuctionStatusEnum; start_price: number;
  reserve_price?: number | null; current_bid?: number | null;
  current_bidder_id?: string | null; bid_count?: number; currency?: string;
  starts_at: string; ends_at: string;
  extended_end?: string | null; created_at?: string;
};

type ListingInsert = {
  id?: string; artwork_id: string; seller_id: string;
  auction_id?: string | null; type: ListingTypeEnum; price: number;
  currency?: string; status?: ListingStatusEnum; featured?: boolean;
  featured_until?: string | null; affiliate_code?: string | null;
  views?: number; favorites?: number; created_at?: string; expires_at?: string | null;
};

type ScoutInsert = {
  id?: string; user_id: string; commission_rate?: number;
  total_artists_scouted?: number; total_earnings?: number;
  affiliate_code: string; is_active?: boolean; created_at?: string;
};

type ScoutedArtistInsert = {
  id?: string; scout_id: string; artist_id: string;
  commission_rate?: number; total_sales_generated?: number;
  total_commission_earned?: number; contract_signed_at?: string | null;
  is_active?: boolean; created_at?: string;
};

type RentalInsert = {
  id?: string; artwork_id: string; renter_id: string;
  owner_id: string; listing_id?: string | null; status?: RentalStatusEnum;
  daily_rate: number; total_amount: number; currency?: string;
  deposit_amount?: number; deposit_paid?: boolean;
  start_date: string; end_date: string;
  returned_at?: string | null; created_at?: string;
};

type FavoriteInsert = {
  id?: string; user_id: string; artwork_id: string; created_at?: string;
};

type NotificationInsert = {
  id?: string; user_id: string; type: string; title: string;
  body?: string; data?: Json; action_url?: string | null;
  is_read?: boolean; created_at?: string;
};

// ============================================================
// DATABASE TYPE
// ============================================================

export interface Database {
  public: {
    Tables: {

      users: {
        Row: {
          id: string; email: string; username: string; full_name: string;
          avatar_url: string | null; bio: string | null; website: string | null;
          phone: string | null; stripe_account_id: string | null;
          stripe_customer_id: string | null; verified: boolean;
          verified_at: string | null; onboarded: boolean;
          total_artworks: number; total_sales: number;
          total_purchases: number; total_earned: number;
          created_at: string; updated_at: string;
        };
        Insert: UserInsert;
        Update: Partial<UserInsert>;
        Relationships: [];
      };

      user_roles: {
        Row: {
          id: string; user_id: string; role: UserRoleEnum;
          granted_by: string | null; granted_at: string; is_active: boolean;
        };
        Insert: UserRoleInsert;
        Update: Partial<UserRoleInsert>;
        Relationships: [];
      };

      artworks: {
        Row: {
          id: string; title: string; description: string | null;
          artist_id: string; status: ArtworkStatusEnum;
          image_url: string; image_preview_url: string; image_public_id: string;
          additional_images: string[]; images: string[];
          year: number | null; medium: string | null; dimensions: string | null;
          edition: string | null; category: ArtworkCategoryEnum | null;
          tags: string[]; style: string[];
          price: number | null; currency: string;
          rental_price_per_day: number | null; reserve_price: number | null;
          pass_core_id: string | null; pass_core_status: PassCoreStatusEnum | null;
          current_owner_id: string; previous_owners: string[];
          is_public: boolean; is_for_sale: boolean;
          is_for_rent: boolean; is_for_auction: boolean;
          demand_score: number | null; scout_id: string | null;
          views: number; favorites: number;
          search_vector: string | null;
          created_at: string; updated_at: string; published_at: string | null;
        };
        Insert: ArtworkInsert;
        Update: Partial<ArtworkInsert>;
        Relationships: [];
      };

      pass_core: {
        Row: {
          id: string; artwork_id: string; hash: string;
          tx_hash: string | null; block_number: number | null;
          network: string | null; contract_address: string | null;
          token_id: string | null; current_owner_id: string;
          previous_owner_id: string | null; issued_by: string;
          status: PassCoreStatusEnum; locked_at: string | null;
          transferred_at: string | null; qr_code_url: string | null;
          verification_url: string | null; transfer_history: Json;
          created_at: string; updated_at: string;
        };
        Insert: PassCoreInsert;
        Update: Partial<PassCoreInsert>;
        Relationships: [];
      };

      pass_core_certifications: {
        Row: {
          id: string; artwork_id: string; hash: string;
          tx_hash: string | null; block_number: number | null;
          network: string | null; status: PassCoreStatusEnum;
          certified_at: string | null; created_at: string; updated_at: string;
        };
        Insert: PassCoreCertInsert;
        Update: Partial<PassCoreCertInsert>;
        Relationships: [];
      };

      subscriptions: {
        Row: {
          id: string; user_id: string;
          plan: SubscriptionPlanEnum; status: SubscriptionStatusEnum;
          stripe_subscription_id: string | null; stripe_price_id: string | null;
          current_period_start: string | null; current_period_end: string | null;
          cancel_at: string | null; cancelled_at: string | null;
          trial_end: string | null; max_artworks: number;
          max_certifications: number; featured_listings: number;
          created_at: string; updated_at: string;
        };
        Insert: SubscriptionInsert;
        Update: Partial<SubscriptionInsert>;
        Relationships: [];
      };

      transactions: {
        Row: {
          id: string; type: TransactionTypeEnum; status: TransactionStatusEnum;
          artwork_id: string | null; buyer_id: string | null; seller_id: string | null;
          amount: number; platform_fee: number; artist_royalty: number;
          scout_commission: number; seller_net: number; currency: string;
          stripe_payment_intent_id: string | null; stripe_transfer_id: string | null;
          metadata: Json; notes: string | null;
          created_at: string; completed_at: string | null;
        };
        Insert: TransactionInsert;
        Update: Partial<TransactionInsert>;
        Relationships: [];
      };

      royalties: {
        Row: {
          id: string; transaction_id: string | null; artwork_id: string | null;
          recipient_id: string; recipient_type: RecipientTypeEnum;
          type: string | null; amount: number; currency: string; rate: number;
          stripe_transfer_id: string | null; paid_at: string | null; created_at: string;
        };
        Insert: RoyaltyInsert;
        Update: Partial<RoyaltyInsert>;
        Relationships: [];
      };

      bets: {
        Row: {
          id: string; auction_id: string; bidder_id: string;
          amount: number; currency: string; status: BetStatusEnum;
          stripe_payment_method_id: string | null; stripe_setup_intent_id: string | null;
          ip_address: string | null; created_at: string;
        };
        Insert: BetInsert;
        Update: Partial<BetInsert>;
        Relationships: [];
      };

      affiliate_links: {
        Row: {
          id: string; scout_id: string; code: string;
          artwork_id: string | null; clicks: number; conversions: number;
          total_earned: number; utm_source: string | null; utm_medium: string | null;
          is_active: boolean; expires_at: string | null; created_at: string;
        };
        Insert: AffiliateLinkInsert;
        Update: Partial<AffiliateLinkInsert>;
        Relationships: [];
      };

      anonymous_messages: {
        Row: {
          id: string; sender_id: string | null; recipient_id: string;
          artwork_id: string | null; subject: string | null; body: string;
          is_anonymous: boolean; is_read: boolean; is_flagged: boolean;
          flagged_at: string | null; flagged_by: string | null;
          parent_id: string | null; created_at: string;
        };
        Insert: AnonymousMessageInsert;
        Update: Partial<AnonymousMessageInsert>;
        Relationships: [];
      };

      settings: {
        Row: {
          id: string; key: string; value: string;
          description: string | null; updated_by: string | null; updated_at: string;
        };
        Insert: SettingInsert;
        Update: Partial<SettingInsert>;
        Relationships: [];
      };

      auctions: {
        Row: {
          id: string; artwork_id: string; seller_id: string;
          status: AuctionStatusEnum; start_price: number;
          reserve_price: number | null; current_bid: number | null;
          current_bidder_id: string | null; bid_count: number; currency: string;
          starts_at: string; ends_at: string;
          extended_end: string | null; created_at: string;
        };
        Insert: AuctionInsert;
        Update: Partial<AuctionInsert>;
        Relationships: [];
      };

      listings: {
        Row: {
          id: string; artwork_id: string; seller_id: string;
          auction_id: string | null; type: ListingTypeEnum; price: number;
          currency: string; status: ListingStatusEnum; featured: boolean;
          featured_until: string | null; affiliate_code: string | null;
          views: number; favorites: number;
          created_at: string; expires_at: string | null;
        };
        Insert: ListingInsert;
        Update: Partial<ListingInsert>;
        Relationships: [];
      };

      scouts: {
        Row: {
          id: string; user_id: string; commission_rate: number;
          total_artists_scouted: number; total_earnings: number;
          affiliate_code: string; is_active: boolean; created_at: string;
        };
        Insert: ScoutInsert;
        Update: Partial<ScoutInsert>;
        Relationships: [];
      };

      scouted_artists: {
        Row: {
          id: string; scout_id: string; artist_id: string;
          commission_rate: number; total_sales_generated: number;
          total_commission_earned: number; contract_signed_at: string | null;
          is_active: boolean; created_at: string;
        };
        Insert: ScoutedArtistInsert;
        Update: Partial<ScoutedArtistInsert>;
        Relationships: [];
      };

      rentals: {
        Row: {
          id: string; artwork_id: string; renter_id: string;
          owner_id: string; listing_id: string | null; status: RentalStatusEnum;
          daily_rate: number; total_amount: number; currency: string;
          deposit_amount: number; deposit_paid: boolean;
          start_date: string; end_date: string;
          returned_at: string | null; created_at: string;
        };
        Insert: RentalInsert;
        Update: Partial<RentalInsert>;
        Relationships: [];
      };

      favorites: {
        Row: { id: string; user_id: string; artwork_id: string; created_at: string; };
        Insert: FavoriteInsert;
        Update: Partial<FavoriteInsert>;
        Relationships: [];
      };

      notifications: {
        Row: {
          id: string; user_id: string; type: string; title: string;
          body: string; data: Json; action_url: string | null;
          is_read: boolean; created_at: string;
        };
        Insert: NotificationInsert;
        Update: Partial<NotificationInsert>;
        Relationships: [];
      };
    };

    Views: Record<string, never>;

    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      user_primary_role: { Args: { p_user_id: string }; Returns: UserRoleEnum };
    };

    Enums: {
      user_role_enum:      UserRoleEnum;
      artwork_status:      ArtworkStatusEnum;
      artwork_category:    ArtworkCategoryEnum;
      pass_core_status:    PassCoreStatusEnum;
      transaction_type:    TransactionTypeEnum;
      transaction_status:  TransactionStatusEnum;
      subscription_plan:   SubscriptionPlanEnum;
      subscription_status: SubscriptionStatusEnum;
      bet_status:          BetStatusEnum;
      auction_status:      AuctionStatusEnum;
    };

    CompositeTypes: Record<string, never>;
  };
}

// ── Convenience row-type aliases ──────────────────────────────

export type DbUser             = Database["public"]["Tables"]["users"]["Row"];
export type DbUserRole         = Database["public"]["Tables"]["user_roles"]["Row"];
export type DbArtwork          = Database["public"]["Tables"]["artworks"]["Row"];
export type DbPassCore         = Database["public"]["Tables"]["pass_core"]["Row"];
export type DbSubscription     = Database["public"]["Tables"]["subscriptions"]["Row"];
export type DbTransaction      = Database["public"]["Tables"]["transactions"]["Row"];
export type DbRoyalty          = Database["public"]["Tables"]["royalties"]["Row"];
export type DbBet              = Database["public"]["Tables"]["bets"]["Row"];
export type DbAuction          = Database["public"]["Tables"]["auctions"]["Row"];
export type DbAffiliateLink    = Database["public"]["Tables"]["affiliate_links"]["Row"];
export type DbAnonymousMessage = Database["public"]["Tables"]["anonymous_messages"]["Row"];
export type DbSetting          = Database["public"]["Tables"]["settings"]["Row"];
export type DbListing          = Database["public"]["Tables"]["listings"]["Row"];
export type DbScout            = Database["public"]["Tables"]["scouts"]["Row"];
export type DbScoutedArtist    = Database["public"]["Tables"]["scouted_artists"]["Row"];
export type DbRental           = Database["public"]["Tables"]["rentals"]["Row"];
export type DbFavorite         = Database["public"]["Tables"]["favorites"]["Row"];
export type DbNotification     = Database["public"]["Tables"]["notifications"]["Row"];
