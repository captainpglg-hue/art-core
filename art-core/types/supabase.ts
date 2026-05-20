export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_codes: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          name: string | null
          used: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id: string
          name?: string | null
          used?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          name?: string | null
          used?: number | null
        }
        Relationships: []
      }
      affiliate_links: {
        Row: {
          artwork_id: string | null
          clicks: number
          code: string
          conversions: number
          created_at: string
          earnings: number
          expires_at: string | null
          id: string
          scout_id: string
        }
        Insert: {
          artwork_id?: string | null
          clicks?: number
          code: string
          conversions?: number
          created_at?: string
          earnings?: number
          expires_at?: string | null
          id?: string
          scout_id: string
        }
        Update: {
          artwork_id?: string | null
          clicks?: number
          code?: string
          conversions?: number
          created_at?: string
          earnings?: number
          expires_at?: string | null
          id?: string
          scout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_links_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_links_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassadeurs: {
        Row: {
          carte_id: string | null
          certifications_count: number | null
          created_at: string | null
          gains_en_attente: number | null
          gains_total: number | null
          id: string
          kit_expedie: boolean | null
          kit_rembourse: boolean | null
          niveau: number | null
          profile_id: string | null
          royalties_oeuvres: Json | null
        }
        Insert: {
          carte_id?: string | null
          certifications_count?: number | null
          created_at?: string | null
          gains_en_attente?: number | null
          gains_total?: number | null
          id?: string
          kit_expedie?: boolean | null
          kit_rembourse?: boolean | null
          niveau?: number | null
          profile_id?: string | null
          royalties_oeuvres?: Json | null
        }
        Update: {
          carte_id?: string | null
          certifications_count?: number | null
          created_at?: string | null
          gains_en_attente?: number | null
          gains_total?: number | null
          id?: string
          kit_expedie?: boolean | null
          kit_rembourse?: boolean | null
          niveau?: number | null
          profile_id?: string | null
          royalties_oeuvres?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ambassadeurs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      anonymous_messages: {
        Row: {
          artwork_id: string | null
          content: string
          created_at: string
          id: string
          read: boolean
          recipient_id: string | null
          sender_id: string | null
        }
        Insert: {
          artwork_id?: string | null
          content: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_id?: string | null
          sender_id?: string | null
        }
        Update: {
          artwork_id?: string | null
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anonymous_messages_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anonymous_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anonymous_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      artworks: {
        Row: {
          additional_images: string[] | null
          artist_id: string
          artist_royalty_pct: number | null
          blockchain_hash: string | null
          blockchain_tx_id: string | null
          boost_active: boolean | null
          boost_expires_at: string | null
          buyer_id: string | null
          category: Database["public"]["Enums"]["artwork_category"]
          certification_date: string | null
          certification_photos: string[] | null
          certification_status: string | null
          certified_by_merchant_id: string | null
          commission_model: string | null
          community_boosts: number | null
          community_highlighted: number | null
          created_at: string
          creation_date: string | null
          depth_cm: number | null
          description: string | null
          dimensions: string | null
          edition: string | null
          favorites_count: number
          final_sale_price: number | null
          fingerprint_version: number | null
          fragility: string | null
          gauge_emptied_at: string | null
          gauge_locked: boolean | null
          gauge_points: number | null
          height_cm: number | null
          highlight_active: boolean | null
          highlight_expires_at: string | null
          id: string
          image_url: string | null
          is_for_rent: boolean
          is_for_sale: boolean
          is_public: boolean
          listed_at: string | null
          macro_ahash: string | null
          macro_dhash: string | null
          macro_fingerprint: string | null
          macro_photo: string | null
          macro_position: string | null
          macro_quality_score: number | null
          macro_radial_hist: string | null
          macro_texture_lbp: string | null
          macro_zones: Json | null
          medium: string | null
          owner_id: string
          p_hash: string | null
          pass_core_id: string | null
          pending_seller_profile: boolean
          photos: string | null
          price: number | null
          published_at: string | null
          rental_price_per_day: number | null
          scout_id: string | null
          scout_royalty_pct: number | null
          search_vector: unknown
          shipping_from: string | null
          shipping_from_city: string | null
          shipping_from_country: string | null
          slug: string | null
          sold_at: string | null
          status: Database["public"]["Enums"]["artwork_status"]
          tags: string[] | null
          technique: string | null
          title: string
          updated_at: string
          views_count: number
          watermarked_url: string | null
          weight_kg: number | null
          width_cm: number | null
          year: number | null
        }
        Insert: {
          additional_images?: string[] | null
          artist_id: string
          artist_royalty_pct?: number | null
          blockchain_hash?: string | null
          blockchain_tx_id?: string | null
          boost_active?: boolean | null
          boost_expires_at?: string | null
          buyer_id?: string | null
          category?: Database["public"]["Enums"]["artwork_category"]
          certification_date?: string | null
          certification_photos?: string[] | null
          certification_status?: string | null
          certified_by_merchant_id?: string | null
          commission_model?: string | null
          community_boosts?: number | null
          community_highlighted?: number | null
          created_at?: string
          creation_date?: string | null
          depth_cm?: number | null
          description?: string | null
          dimensions?: string | null
          edition?: string | null
          favorites_count?: number
          final_sale_price?: number | null
          fingerprint_version?: number | null
          fragility?: string | null
          gauge_emptied_at?: string | null
          gauge_locked?: boolean | null
          gauge_points?: number | null
          height_cm?: number | null
          highlight_active?: boolean | null
          highlight_expires_at?: string | null
          id?: string
          image_url?: string | null
          is_for_rent?: boolean
          is_for_sale?: boolean
          is_public?: boolean
          listed_at?: string | null
          macro_ahash?: string | null
          macro_dhash?: string | null
          macro_fingerprint?: string | null
          macro_photo?: string | null
          macro_position?: string | null
          macro_quality_score?: number | null
          macro_radial_hist?: string | null
          macro_texture_lbp?: string | null
          macro_zones?: Json | null
          medium?: string | null
          owner_id: string
          p_hash?: string | null
          pass_core_id?: string | null
          pending_seller_profile?: boolean
          photos?: string | null
          price?: number | null
          published_at?: string | null
          rental_price_per_day?: number | null
          scout_id?: string | null
          scout_royalty_pct?: number | null
          search_vector?: unknown
          shipping_from?: string | null
          shipping_from_city?: string | null
          shipping_from_country?: string | null
          slug?: string | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["artwork_status"]
          tags?: string[] | null
          technique?: string | null
          title: string
          updated_at?: string
          views_count?: number
          watermarked_url?: string | null
          weight_kg?: number | null
          width_cm?: number | null
          year?: number | null
        }
        Update: {
          additional_images?: string[] | null
          artist_id?: string
          artist_royalty_pct?: number | null
          blockchain_hash?: string | null
          blockchain_tx_id?: string | null
          boost_active?: boolean | null
          boost_expires_at?: string | null
          buyer_id?: string | null
          category?: Database["public"]["Enums"]["artwork_category"]
          certification_date?: string | null
          certification_photos?: string[] | null
          certification_status?: string | null
          certified_by_merchant_id?: string | null
          commission_model?: string | null
          community_boosts?: number | null
          community_highlighted?: number | null
          created_at?: string
          creation_date?: string | null
          depth_cm?: number | null
          description?: string | null
          dimensions?: string | null
          edition?: string | null
          favorites_count?: number
          final_sale_price?: number | null
          fingerprint_version?: number | null
          fragility?: string | null
          gauge_emptied_at?: string | null
          gauge_locked?: boolean | null
          gauge_points?: number | null
          height_cm?: number | null
          highlight_active?: boolean | null
          highlight_expires_at?: string | null
          id?: string
          image_url?: string | null
          is_for_rent?: boolean
          is_for_sale?: boolean
          is_public?: boolean
          listed_at?: string | null
          macro_ahash?: string | null
          macro_dhash?: string | null
          macro_fingerprint?: string | null
          macro_photo?: string | null
          macro_position?: string | null
          macro_quality_score?: number | null
          macro_radial_hist?: string | null
          macro_texture_lbp?: string | null
          macro_zones?: Json | null
          medium?: string | null
          owner_id?: string
          p_hash?: string | null
          pass_core_id?: string | null
          pending_seller_profile?: boolean
          photos?: string | null
          price?: number | null
          published_at?: string | null
          rental_price_per_day?: number | null
          scout_id?: string | null
          scout_royalty_pct?: number | null
          search_vector?: unknown
          shipping_from?: string | null
          shipping_from_city?: string | null
          shipping_from_country?: string | null
          slug?: string | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["artwork_status"]
          tags?: string[] | null
          technique?: string | null
          title?: string
          updated_at?: string
          views_count?: number
          watermarked_url?: string | null
          weight_kg?: number | null
          width_cm?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "artworks_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artworks_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artworks_certified_by_merchant_id_fkey"
            columns: ["certified_by_merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artworks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artworks_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_artworks_pass_core"
            columns: ["pass_core_id"]
            isOneToOne: false
            referencedRelation: "pass_core"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          artwork_id: string
          created_at: string
          current_price: number
          ends_at: string
          id: string
          reserve_price: number
          seller_id: string
          starts_at: string
          status: Database["public"]["Enums"]["auction_status"]
          updated_at: string
          winning_bid_id: string | null
        }
        Insert: {
          artwork_id: string
          created_at?: string
          current_price?: number
          ends_at: string
          id?: string
          reserve_price?: number
          seller_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["auction_status"]
          updated_at?: string
          winning_bid_id?: string | null
        }
        Update: {
          artwork_id?: string
          created_at?: string
          current_price?: number
          ends_at?: string
          id?: string
          reserve_price?: number
          seller_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["auction_status"]
          updated_at?: string
          winning_bid_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bets: {
        Row: {
          amount: number
          auction_id: string | null
          bidder_id: string | null
          id: string
          market_id: string | null
          odds_at_bet: number | null
          payout: number | null
          placed_at: string
          position: string | null
          potential_payout: number | null
          result: string | null
          status: Database["public"]["Enums"]["bet_status"]
          user_id: string | null
        }
        Insert: {
          amount: number
          auction_id?: string | null
          bidder_id?: string | null
          id?: string
          market_id?: string | null
          odds_at_bet?: number | null
          payout?: number | null
          placed_at?: string
          position?: string | null
          potential_payout?: number | null
          result?: string | null
          status?: Database["public"]["Enums"]["bet_status"]
          user_id?: string | null
        }
        Update: {
          amount?: number
          auction_id?: string | null
          bidder_id?: string | null
          id?: string
          market_id?: string | null
          odds_at_bet?: number | null
          payout?: number | null
          placed_at?: string
          position?: string | null
          potential_payout?: number | null
          result?: string | null
          status?: Database["public"]["Enums"]["bet_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bets_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_bidder_id_fkey"
            columns: ["bidder_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "betting_markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      betting_markets: {
        Row: {
          artwork_id: string
          created_at: string | null
          id: string
          market_type: string
          odds_no: number | null
          odds_yes: number | null
          question: string
          resolved_at: string | null
          status: string | null
          threshold_days: number | null
          threshold_value: number | null
          total_no_amount: number | null
          total_yes_amount: number | null
        }
        Insert: {
          artwork_id: string
          created_at?: string | null
          id?: string
          market_type: string
          odds_no?: number | null
          odds_yes?: number | null
          question: string
          resolved_at?: string | null
          status?: string | null
          threshold_days?: number | null
          threshold_value?: number | null
          total_no_amount?: number | null
          total_yes_amount?: number | null
        }
        Update: {
          artwork_id?: string
          created_at?: string | null
          id?: string
          market_type?: string
          odds_no?: number | null
          odds_yes?: number | null
          question?: string
          resolved_at?: string | null
          status?: string | null
          threshold_days?: number | null
          threshold_value?: number | null
          total_no_amount?: number | null
          total_yes_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "betting_markets_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          artwork_id: string
          certificate_number: string
          created_at: string | null
          id: string
          issued_to: string
          qr_data: string | null
        }
        Insert: {
          artwork_id: string
          certificate_number: string
          created_at?: string | null
          id?: string
          issued_to: string
          qr_data?: string | null
        }
        Update: {
          artwork_id?: string
          certificate_number?: string
          created_at?: string | null
          id?: string
          issued_to?: string
          qr_data?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
        ]
      }
      certification_attempts: {
        Row: {
          artwork_id: string | null
          created_at: string
          duplicate_of: string | null
          id: string
          image_url: string | null
          metadata: Json | null
          phash: string | null
          status: string
          user_id: string
        }
        Insert: {
          artwork_id?: string | null
          created_at?: string
          duplicate_of?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          phash?: string | null
          status?: string
          user_id: string
        }
        Update: {
          artwork_id?: string | null
          created_at?: string
          duplicate_of?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          phash?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certification_attempts_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_attempts_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "certification_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      certificats: {
        Row: {
          bloc_simule: string | null
          conteste_le: string | null
          conteste_par: string | null
          created_at: string | null
          docs_hashes: Json | null
          docs_noms: Json | null
          emetteur_id: string | null
          empreinte_hash: string
          id: string
          niveau_provenance: number | null
          oeuvre_id: string | null
          pdf_url: string | null
          qr_code_url: string | null
          reseau: string | null
          tx_hash: string | null
          type_cert: string
          valide: boolean | null
        }
        Insert: {
          bloc_simule?: string | null
          conteste_le?: string | null
          conteste_par?: string | null
          created_at?: string | null
          docs_hashes?: Json | null
          docs_noms?: Json | null
          emetteur_id?: string | null
          empreinte_hash: string
          id?: string
          niveau_provenance?: number | null
          oeuvre_id?: string | null
          pdf_url?: string | null
          qr_code_url?: string | null
          reseau?: string | null
          tx_hash?: string | null
          type_cert: string
          valide?: boolean | null
        }
        Update: {
          bloc_simule?: string | null
          conteste_le?: string | null
          conteste_par?: string | null
          created_at?: string | null
          docs_hashes?: Json | null
          docs_noms?: Json | null
          emetteur_id?: string | null
          empreinte_hash?: string
          id?: string
          niveau_provenance?: number | null
          oeuvre_id?: string | null
          pdf_url?: string | null
          qr_code_url?: string | null
          reseau?: string | null
          tx_hash?: string | null
          type_cert?: string
          valide?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "certificats_conteste_par_fkey"
            columns: ["conteste_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificats_emetteur_id_fkey"
            columns: ["emetteur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificats_oeuvre_id_fkey"
            columns: ["oeuvre_id"]
            isOneToOne: false
            referencedRelation: "oeuvres"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_config: {
        Row: {
          created_at: string | null
          description: string | null
          first_sale_ambassador_pct: number
          first_sale_artist_pct: number
          first_sale_platform_pct: number
          first_sale_scout_pct: number
          id: string
          model_name: string
          resale_artist_royalty_pct: number
          resale_insider_pct: number
          resale_platform_pct: number
          resale_seller_pct: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          first_sale_ambassador_pct?: number
          first_sale_artist_pct?: number
          first_sale_platform_pct?: number
          first_sale_scout_pct?: number
          id?: string
          model_name: string
          resale_artist_royalty_pct?: number
          resale_insider_pct?: number
          resale_platform_pct?: number
          resale_seller_pct?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          first_sale_ambassador_pct?: number
          first_sale_artist_pct?: number
          first_sale_platform_pct?: number
          first_sale_scout_pct?: number
          id?: string
          model_name?: string
          resale_artist_royalty_pct?: number
          resale_insider_pct?: number
          resale_platform_pct?: number
          resale_seller_pct?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      commission_ledger: {
        Row: {
          ambassador_amount: number
          ambassador_id: string | null
          artist_id: string | null
          artist_royalty_amount: number
          artwork_id: string
          commission_model: string
          created_at: string | null
          id: string
          insider_amount: number
          is_first_sale: boolean
          platform_amount: number
          sale_price: number
          scout_amount: number
          scout_id: string | null
          seller_amount: number
          seller_id: string | null
          transaction_id: string | null
        }
        Insert: {
          ambassador_amount?: number
          ambassador_id?: string | null
          artist_id?: string | null
          artist_royalty_amount?: number
          artwork_id: string
          commission_model: string
          created_at?: string | null
          id?: string
          insider_amount?: number
          is_first_sale?: boolean
          platform_amount?: number
          sale_price: number
          scout_amount?: number
          scout_id?: string | null
          seller_amount?: number
          seller_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          ambassador_amount?: number
          ambassador_id?: string | null
          artist_id?: string | null
          artist_royalty_amount?: number
          artwork_id?: string
          commission_model?: string
          created_at?: string | null
          id?: string
          insider_amount?: number
          is_first_sale?: boolean
          platform_amount?: number
          sale_price?: number
          scout_amount?: number
          scout_id?: string | null
          seller_amount?: number
          seller_id?: string | null
          transaction_id?: string | null
        }
        Relationships: []
      }
      community_boosts: {
        Row: {
          artwork_id: string
          created_at: string | null
          id: string
          points_spent: number | null
          user_id: string
        }
        Insert: {
          artwork_id: string
          created_at?: string | null
          id?: string
          points_spent?: number | null
          user_id: string
        }
        Update: {
          artwork_id?: string
          created_at?: string | null
          id?: string
          points_spent?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_boosts_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_boosts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string | null
          hash_difference: boolean | null
          id: string
          reason: string | null
          resolution: string | null
          resolved_at: string | null
          shipping_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          hash_difference?: boolean | null
          id?: string
          reason?: string | null
          resolution?: string | null
          resolved_at?: string | null
          shipping_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          hash_difference?: boolean | null
          id?: string
          reason?: string | null
          resolution?: string | null
          resolved_at?: string | null
          shipping_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_shipping_id_fkey"
            columns: ["shipping_id"]
            isOneToOne: false
            referencedRelation: "shipping"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          artwork_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          artwork_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          artwork_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gauge_entries: {
        Row: {
          artwork_id: string
          created_at: string | null
          id: string
          initiate_id: string
          points: number
        }
        Insert: {
          artwork_id: string
          created_at?: string | null
          id?: string
          initiate_id: string
          points: number
        }
        Update: {
          artwork_id?: string
          created_at?: string | null
          id?: string
          initiate_id?: string
          points?: number
        }
        Relationships: [
          {
            foreignKeyName: "gauge_entries_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gauge_entries_initiate_id_fkey"
            columns: ["initiate_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      initiate_commissions: {
        Row: {
          artwork_id: string
          commission_amount: number
          created_at: string | null
          id: string
          initiate_id: string
          paid_as_points: number | null
          percentage: number
          points_invested: number
          transaction_id: string | null
        }
        Insert: {
          artwork_id: string
          commission_amount: number
          created_at?: string | null
          id?: string
          initiate_id: string
          paid_as_points?: number | null
          percentage: number
          points_invested: number
          transaction_id?: string | null
        }
        Update: {
          artwork_id?: string
          commission_amount?: number
          created_at?: string | null
          id?: string
          initiate_id?: string
          paid_as_points?: number | null
          percentage?: number
          points_invested?: number
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "initiate_commissions_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "initiate_commissions_initiate_id_fkey"
            columns: ["initiate_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "initiate_commissions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          artwork_id: string
          created_at: string
          id: string
          is_active: boolean
          price: number
          seller_id: string
          updated_at: string
        }
        Insert: {
          artwork_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          price: number
          seller_id: string
          updated_at?: string
        }
        Update: {
          artwork_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          price?: number
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      magic_links: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          intent: string
          ip_address: string | null
          signup_data: Json | null
          token_hash: string
          used_at: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          intent?: string
          ip_address?: string | null
          signup_data?: Json | null
          token_hash: string
          used_at?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          intent?: string
          ip_address?: string | null
          signup_data?: Json | null
          token_hash?: string
          used_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      merchants: {
        Row: {
          abonnement: string | null
          actif: boolean | null
          activite: string
          adresse: string | null
          code_postal: string | null
          created_at: string | null
          email: string
          id: string
          nom_gerant: string
          numero_rom: string | null
          numero_rom_prefix: string | null
          raison_sociale: string
          regime_tva: string | null
          siret: string
          telephone: string | null
          user_id: string | null
          ville: string | null
        }
        Insert: {
          abonnement?: string | null
          actif?: boolean | null
          activite: string
          adresse?: string | null
          code_postal?: string | null
          created_at?: string | null
          email: string
          id?: string
          nom_gerant: string
          numero_rom?: string | null
          numero_rom_prefix?: string | null
          raison_sociale: string
          regime_tva?: string | null
          siret: string
          telephone?: string | null
          user_id?: string | null
          ville?: string | null
        }
        Update: {
          abonnement?: string | null
          actif?: boolean | null
          activite?: string
          adresse?: string | null
          code_postal?: string | null
          created_at?: string | null
          email?: string
          id?: string
          nom_gerant?: string
          numero_rom?: string | null
          numero_rom_prefix?: string | null
          raison_sociale?: string
          regime_tva?: string | null
          siret?: string
          telephone?: string | null
          user_id?: string | null
          ville?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          artwork_id: string | null
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          artwork_id?: string | null
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          artwork_id?: string | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          link: string | null
          message: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      nova_accounts: {
        Row: {
          account_type: string
          address_line1: string | null
          address_line2: string | null
          art_interests: string | null
          bonus_amount: number | null
          bonus_credited: boolean | null
          bonus_type: string | null
          city: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          geo_zone: string | null
          iban: string | null
          id: string
          kit_macro_ordered: boolean | null
          kit_macro_shipped: boolean | null
          kit_tracking_number: string | null
          last_name: string | null
          network_size: number | null
          nova_account_number: string
          phone: string | null
          portfolio_url: string | null
          postal_code: string | null
          preferred_styles: string | null
          specialty: string | null
          user_id: string
        }
        Insert: {
          account_type: string
          address_line1?: string | null
          address_line2?: string | null
          art_interests?: string | null
          bonus_amount?: number | null
          bonus_credited?: boolean | null
          bonus_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          geo_zone?: string | null
          iban?: string | null
          id: string
          kit_macro_ordered?: boolean | null
          kit_macro_shipped?: boolean | null
          kit_tracking_number?: string | null
          last_name?: string | null
          network_size?: number | null
          nova_account_number: string
          phone?: string | null
          portfolio_url?: string | null
          postal_code?: string | null
          preferred_styles?: string | null
          specialty?: string | null
          user_id: string
        }
        Update: {
          account_type?: string
          address_line1?: string | null
          address_line2?: string | null
          art_interests?: string | null
          bonus_amount?: number | null
          bonus_credited?: boolean | null
          bonus_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          geo_zone?: string | null
          iban?: string | null
          id?: string
          kit_macro_ordered?: boolean | null
          kit_macro_shipped?: boolean | null
          kit_tracking_number?: string | null
          last_name?: string | null
          network_size?: number | null
          nova_account_number?: string
          phone?: string | null
          portfolio_url?: string | null
          postal_code?: string | null
          preferred_styles?: string | null
          specialty?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nova_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      oeuvres: {
        Row: {
          annee_creation: number | null
          artiste_id: string | null
          autres_liens: string | null
          coord_coin_ref: string | null
          coord_diametre_mm: number | null
          coord_distance_capteur_cm: number | null
          coord_orientation_deg: number | null
          coord_x_cm: number | null
          coord_y_cm: number | null
          created_at: string | null
          edition: string | null
          hauteur_cm: number | null
          histoire: string | null
          id: string
          instagram: string | null
          largeur_cm: number | null
          matiere: string | null
          photo_hash: string | null
          photo_macro_url: string | null
          poids_kg: number | null
          prix_achat: number | null
          prix_vente: number | null
          serie_nom: string | null
          serie_numero: number | null
          site_web: string | null
          statut: string | null
          titre: string
          type_art: string | null
        }
        Insert: {
          annee_creation?: number | null
          artiste_id?: string | null
          autres_liens?: string | null
          coord_coin_ref?: string | null
          coord_diametre_mm?: number | null
          coord_distance_capteur_cm?: number | null
          coord_orientation_deg?: number | null
          coord_x_cm?: number | null
          coord_y_cm?: number | null
          created_at?: string | null
          edition?: string | null
          hauteur_cm?: number | null
          histoire?: string | null
          id?: string
          instagram?: string | null
          largeur_cm?: number | null
          matiere?: string | null
          photo_hash?: string | null
          photo_macro_url?: string | null
          poids_kg?: number | null
          prix_achat?: number | null
          prix_vente?: number | null
          serie_nom?: string | null
          serie_numero?: number | null
          site_web?: string | null
          statut?: string | null
          titre: string
          type_art?: string | null
        }
        Update: {
          annee_creation?: number | null
          artiste_id?: string | null
          autres_liens?: string | null
          coord_coin_ref?: string | null
          coord_diametre_mm?: number | null
          coord_distance_capteur_cm?: number | null
          coord_orientation_deg?: number | null
          coord_x_cm?: number | null
          coord_y_cm?: number | null
          created_at?: string | null
          edition?: string | null
          hauteur_cm?: number | null
          histoire?: string | null
          id?: string
          instagram?: string | null
          largeur_cm?: number | null
          matiere?: string | null
          photo_hash?: string | null
          photo_macro_url?: string | null
          poids_kg?: number | null
          prix_achat?: number | null
          prix_vente?: number | null
          serie_nom?: string | null
          serie_numero?: number | null
          site_web?: string | null
          statut?: string | null
          titre?: string
          type_art?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oeuvres_artiste_id_fkey"
            columns: ["artiste_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          amount: number
          artwork_id: string
          buyer_id: string
          created_at: string | null
          id: string
          message: string | null
          status: string | null
        }
        Insert: {
          amount: number
          artwork_id: string
          buyer_id: string
          created_at?: string | null
          id?: string
          message?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          artwork_id?: string
          buyer_id?: string
          created_at?: string | null
          id?: string
          message?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_queue: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          photo_b64: string | null
          profile_id: string | null
          synced: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          photo_b64?: string | null
          profile_id?: string | null
          synced?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          photo_b64?: string | null
          profile_id?: string | null
          synced?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "offline_queue_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          artwork_id: string
          buyer_address: Json | null
          buyer_country: string | null
          buyer_id: string
          carrier: string | null
          created_at: string | null
          delivered_at: string | null
          dispute_open: boolean | null
          dispute_reason: string | null
          id: string
          insurance_cost: number | null
          reception_hash: string | null
          reception_photo_url: string | null
          reception_verified: boolean | null
          seller_id: string
          shipped_at: string | null
          shipping_cost: number | null
          shipping_method: string | null
          shipping_zone: string | null
          status: string
          total_amount: number
          tracking_number: string | null
          tracking_url: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          artwork_id: string
          buyer_address?: Json | null
          buyer_country?: string | null
          buyer_id: string
          carrier?: string | null
          created_at?: string | null
          delivered_at?: string | null
          dispute_open?: boolean | null
          dispute_reason?: string | null
          id?: string
          insurance_cost?: number | null
          reception_hash?: string | null
          reception_photo_url?: string | null
          reception_verified?: boolean | null
          seller_id: string
          shipped_at?: string | null
          shipping_cost?: number | null
          shipping_method?: string | null
          shipping_zone?: string | null
          status?: string
          total_amount: number
          tracking_number?: string | null
          tracking_url?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          artwork_id?: string
          buyer_address?: Json | null
          buyer_country?: string | null
          buyer_id?: string
          carrier?: string | null
          created_at?: string | null
          delivered_at?: string | null
          dispute_open?: boolean | null
          dispute_reason?: string | null
          id?: string
          insurance_cost?: number | null
          reception_hash?: string | null
          reception_photo_url?: string | null
          reception_verified?: boolean | null
          seller_id?: string
          shipped_at?: string | null
          shipping_cost?: number | null
          shipping_method?: string | null
          shipping_zone?: string | null
          status?: string
          total_amount?: number
          tracking_number?: string | null
          tracking_url?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ownership_history: {
        Row: {
          artwork_id: string
          from_user: string | null
          id: string
          to_user: string
          transaction_id: string | null
          transferred_at: string
        }
        Insert: {
          artwork_id: string
          from_user?: string | null
          id?: string
          to_user: string
          transaction_id?: string | null
          transferred_at?: string
        }
        Update: {
          artwork_id?: string
          from_user?: string | null
          id?: string
          to_user?: string
          transaction_id?: string | null
          transferred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ownership_history_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_history_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_history_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ownership_transfers: {
        Row: {
          artwork_id: string
          blockchain_tx: string | null
          created_at: string | null
          from_user_id: string | null
          id: string
          notes: string | null
          price: number | null
          to_user_id: string
          transfer_type: string
        }
        Insert: {
          artwork_id: string
          blockchain_tx?: string | null
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          notes?: string | null
          price?: number | null
          to_user_id: string
          transfer_type?: string
        }
        Update: {
          artwork_id?: string
          blockchain_tx?: string | null
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          notes?: string | null
          price?: number | null
          to_user_id?: string
          transfer_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ownership_transfers_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_transfers_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_transfers_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pass_core: {
        Row: {
          artwork_id: string
          blockchain_network: string
          blockchain_tx_hash: string | null
          certificate_hash: string
          created_at: string
          current_owner_id: string
          id: string
          issued_at: string
          issuer_id: string
          locked_at: string | null
          metadata_uri: string | null
          status: Database["public"]["Enums"]["pass_core_status"]
          transferred_at: string | null
          updated_at: string
        }
        Insert: {
          artwork_id: string
          blockchain_network?: string
          blockchain_tx_hash?: string | null
          certificate_hash: string
          created_at?: string
          current_owner_id: string
          id?: string
          issued_at?: string
          issuer_id: string
          locked_at?: string | null
          metadata_uri?: string | null
          status?: Database["public"]["Enums"]["pass_core_status"]
          transferred_at?: string | null
          updated_at?: string
        }
        Update: {
          artwork_id?: string
          blockchain_network?: string
          blockchain_tx_hash?: string | null
          certificate_hash?: string
          created_at?: string
          current_owner_id?: string
          id?: string
          issued_at?: string
          issuer_id?: string
          locked_at?: string | null
          metadata_uri?: string | null
          status?: Database["public"]["Enums"]["pass_core_status"]
          transferred_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pass_core_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pass_core_current_owner_id_fkey"
            columns: ["current_owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pass_core_issuer_id_fkey"
            columns: ["issuer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pass_core_certifications: {
        Row: {
          artwork_id: string
          block_number: number | null
          certified_at: string | null
          created_at: string
          hash: string
          id: string
          network: string | null
          status: Database["public"]["Enums"]["pass_core_status"]
          tx_hash: string | null
          updated_at: string
        }
        Insert: {
          artwork_id: string
          block_number?: number | null
          certified_at?: string | null
          created_at?: string
          hash: string
          id?: string
          network?: string | null
          status?: Database["public"]["Enums"]["pass_core_status"]
          tx_hash?: string | null
          updated_at?: string
        }
        Update: {
          artwork_id?: string
          block_number?: number | null
          certified_at?: string | null
          created_at?: string
          hash?: string
          id?: string
          network?: string | null
          status?: Database["public"]["Enums"]["pass_core_status"]
          tx_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pass_core_certifications_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
        ]
      }
      pass_core_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          pass_core_id: string
          sender_id: string | null
          sender_tag: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          pass_core_id: string
          sender_id?: string | null
          sender_tag: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          pass_core_id?: string
          sender_id?: string | null
          sender_tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "pass_core_messages_pass_core_id_fkey"
            columns: ["pass_core_id"]
            isOneToOne: false
            referencedRelation: "pass_core"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pass_core_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pass_core_transactions: {
        Row: {
          artcore_fee: number | null
          artist_royalty: number | null
          artwork_id: string
          buyer_id: string | null
          chain_index: number
          created_at: string | null
          event_data: Json | null
          event_type: string
          hash_current: string
          hash_previous: string | null
          id: string
          phash: string | null
          photo_ensemble_url: string | null
          photo_macro_url: string | null
          sale_location: string | null
          sale_price: number | null
          scout_royalty: number | null
          seller_id: string | null
          sha256: string | null
          status: string | null
          transaction_date: string | null
          zone_macro: Json | null
        }
        Insert: {
          artcore_fee?: number | null
          artist_royalty?: number | null
          artwork_id: string
          buyer_id?: string | null
          chain_index?: number
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          hash_current: string
          hash_previous?: string | null
          id?: string
          phash?: string | null
          photo_ensemble_url?: string | null
          photo_macro_url?: string | null
          sale_location?: string | null
          sale_price?: number | null
          scout_royalty?: number | null
          seller_id?: string | null
          sha256?: string | null
          status?: string | null
          transaction_date?: string | null
          zone_macro?: Json | null
        }
        Update: {
          artcore_fee?: number | null
          artist_royalty?: number | null
          artwork_id?: string
          buyer_id?: string | null
          chain_index?: number
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          hash_current?: string
          hash_previous?: string | null
          id?: string
          phash?: string | null
          photo_ensemble_url?: string | null
          photo_macro_url?: string | null
          sale_location?: string | null
          sale_price?: number | null
          scout_royalty?: number | null
          seller_id?: string | null
          sha256?: string | null
          status?: string | null
          transaction_date?: string | null
          zone_macro?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pass_core_transactions_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pass_core_transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pass_core_transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      passport_requests: {
        Row: {
          admin_notes: string | null
          artwork_id: string
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          sale_location: string | null
          sale_price: number | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          artwork_id: string
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sale_location?: string | null
          sale_price?: number | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          artwork_id?: string
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sale_location?: string | null
          sale_price?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "passport_requests_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passport_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passport_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_secrets: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      police_register_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          register_entry_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          register_entry_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          register_entry_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "police_register_audit_log_register_entry_id_fkey"
            columns: ["register_entry_id"]
            isOneToOne: false
            referencedRelation: "police_register_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "police_register_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      police_register_entries: {
        Row: {
          acquisition_date: string
          artwork_id: string | null
          blockchain_hash: string | null
          buyer_address: string | null
          buyer_name: string | null
          category: string | null
          classement_mh: boolean | null
          created_at: string
          description: string
          designation: string | null
          distinctive_signs: string | null
          entry_number: number
          estimated_value: number | null
          fingerprint_hash: string | null
          id: string
          is_lot: boolean | null
          is_voided: boolean | null
          lot_description: string | null
          lot_item_count: number | null
          macro_fingerprints: Json | null
          macro_quality_scores: Json | null
          macro_zones: Json | null
          merchant_id: string | null
          nft_certificate_url: string | null
          object_nature: string | null
          payment_method: string | null
          payment_reference: string | null
          photo_detail: string | null
          photo_macro: string | null
          photo_overview: string | null
          photo_side: string | null
          photos: Json | null
          polygon_timestamp: string | null
          polygon_tx_hash: string | null
          previous_hash: string | null
          price: number | null
          professional_signature: string | null
          published_at: string | null
          published_to_marketplace: boolean | null
          purchase_price: number | null
          qr_code_data: string | null
          sealed_at: string | null
          seller_address: string | null
          seller_birth_date: string | null
          seller_company_address: string | null
          seller_company_name: string | null
          seller_company_siret: string | null
          seller_first_name: string | null
          seller_id_authority: string | null
          seller_id_date: string | null
          seller_id_number: string | null
          seller_id_type: string | null
          seller_last_name: string | null
          seller_name: string | null
          seller_profession: string | null
          seller_representative_name: string | null
          seller_type: string
          transaction_type: string | null
          updated_at: string
          user_id: string
          void_amendment_id: string | null
          void_reason: string | null
        }
        Insert: {
          acquisition_date?: string
          artwork_id?: string | null
          blockchain_hash?: string | null
          buyer_address?: string | null
          buyer_name?: string | null
          category?: string | null
          classement_mh?: boolean | null
          created_at?: string
          description: string
          designation?: string | null
          distinctive_signs?: string | null
          entry_number: number
          estimated_value?: number | null
          fingerprint_hash?: string | null
          id?: string
          is_lot?: boolean | null
          is_voided?: boolean | null
          lot_description?: string | null
          lot_item_count?: number | null
          macro_fingerprints?: Json | null
          macro_quality_scores?: Json | null
          macro_zones?: Json | null
          merchant_id?: string | null
          nft_certificate_url?: string | null
          object_nature?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          photo_detail?: string | null
          photo_macro?: string | null
          photo_overview?: string | null
          photo_side?: string | null
          photos?: Json | null
          polygon_timestamp?: string | null
          polygon_tx_hash?: string | null
          previous_hash?: string | null
          price?: number | null
          professional_signature?: string | null
          published_at?: string | null
          published_to_marketplace?: boolean | null
          purchase_price?: number | null
          qr_code_data?: string | null
          sealed_at?: string | null
          seller_address?: string | null
          seller_birth_date?: string | null
          seller_company_address?: string | null
          seller_company_name?: string | null
          seller_company_siret?: string | null
          seller_first_name?: string | null
          seller_id_authority?: string | null
          seller_id_date?: string | null
          seller_id_number?: string | null
          seller_id_type?: string | null
          seller_last_name?: string | null
          seller_name?: string | null
          seller_profession?: string | null
          seller_representative_name?: string | null
          seller_type?: string
          transaction_type?: string | null
          updated_at?: string
          user_id: string
          void_amendment_id?: string | null
          void_reason?: string | null
        }
        Update: {
          acquisition_date?: string
          artwork_id?: string | null
          blockchain_hash?: string | null
          buyer_address?: string | null
          buyer_name?: string | null
          category?: string | null
          classement_mh?: boolean | null
          created_at?: string
          description?: string
          designation?: string | null
          distinctive_signs?: string | null
          entry_number?: number
          estimated_value?: number | null
          fingerprint_hash?: string | null
          id?: string
          is_lot?: boolean | null
          is_voided?: boolean | null
          lot_description?: string | null
          lot_item_count?: number | null
          macro_fingerprints?: Json | null
          macro_quality_scores?: Json | null
          macro_zones?: Json | null
          merchant_id?: string | null
          nft_certificate_url?: string | null
          object_nature?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          photo_detail?: string | null
          photo_macro?: string | null
          photo_overview?: string | null
          photo_side?: string | null
          photos?: Json | null
          polygon_timestamp?: string | null
          polygon_tx_hash?: string | null
          previous_hash?: string | null
          price?: number | null
          professional_signature?: string | null
          published_at?: string | null
          published_to_marketplace?: boolean | null
          purchase_price?: number | null
          qr_code_data?: string | null
          sealed_at?: string | null
          seller_address?: string | null
          seller_birth_date?: string | null
          seller_company_address?: string | null
          seller_company_name?: string | null
          seller_company_siret?: string | null
          seller_first_name?: string | null
          seller_id_authority?: string | null
          seller_id_date?: string | null
          seller_id_number?: string | null
          seller_id_type?: string | null
          seller_last_name?: string | null
          seller_name?: string | null
          seller_profession?: string | null
          seller_representative_name?: string | null
          seller_type?: string
          transaction_type?: string | null
          updated_at?: string
          user_id?: string
          void_amendment_id?: string | null
          void_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "police_register_entries_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "police_register_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_id: string | null
          compte_bancaire_lie: boolean | null
          created_at: string | null
          email: string | null
          id: string
          is_premium: boolean | null
          lang: string | null
          max_free: number | null
          nom: string | null
          oeuvres_count: number | null
          profil_type: string
          updated_at: string | null
          zone_geo: string | null
        }
        Insert: {
          auth_id?: string | null
          compte_bancaire_lie?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_premium?: boolean | null
          lang?: string | null
          max_free?: number | null
          nom?: string | null
          oeuvres_count?: number | null
          profil_type: string
          updated_at?: string | null
          zone_geo?: string | null
        }
        Update: {
          auth_id?: string | null
          compte_bancaire_lie?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_premium?: boolean | null
          lang?: string | null
          max_free?: number | null
          nom?: string | null
          oeuvres_count?: number | null
          profil_type?: string
          updated_at?: string | null
          zone_geo?: string | null
        }
        Relationships: []
      }
      promo_items: {
        Row: {
          cost_euros: number | null
          cost_points: number
          description: string | null
          duration_hours: number | null
          icon: string | null
          id: string
          name: string
          sort_order: number | null
          tier: string | null
          type: string
        }
        Insert: {
          cost_euros?: number | null
          cost_points: number
          description?: string | null
          duration_hours?: number | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number | null
          tier?: string | null
          type: string
        }
        Update: {
          cost_euros?: number | null
          cost_points?: number
          description?: string | null
          duration_hours?: number | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          tier?: string | null
          type?: string
        }
        Relationships: []
      }
      promo_purchases: {
        Row: {
          amount_paid: number | null
          artwork_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          paid_with: string | null
          promo_item_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          artwork_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          paid_with?: string | null
          promo_item_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          artwork_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          paid_with?: string | null
          promo_item_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_purchases_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_purchases_promo_item_id_fkey"
            columns: ["promo_item_id"]
            isOneToOne: false
            referencedRelation: "promo_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          user_id: string
          uses: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          user_id: string
          uses?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          user_id?: string
          uses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      register_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "register_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rentals: {
        Row: {
          artwork_id: string
          created_at: string
          daily_rate: number
          ends_at: string
          id: string
          owner_id: string
          renter_id: string
          starts_at: string
          status: string
          total_amount: number
        }
        Insert: {
          artwork_id: string
          created_at?: string
          daily_rate: number
          ends_at: string
          id?: string
          owner_id: string
          renter_id: string
          starts_at: string
          status?: string
          total_amount: number
        }
        Update: {
          artwork_id?: string
          created_at?: string
          daily_rate?: number
          ends_at?: string
          id?: string
          owner_id?: string
          renter_id?: string
          starts_at?: string
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "rentals_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      royalties: {
        Row: {
          amount: number
          artist_id: string
          artwork_id: string
          created_at: string
          id: string
          paid_at: string | null
          rate: number
          transaction_id: string
        }
        Insert: {
          amount: number
          artist_id: string
          artwork_id: string
          created_at?: string
          id?: string
          paid_at?: string | null
          rate?: number
          transaction_id: string
        }
        Update: {
          amount?: number
          artist_id?: string
          artwork_id?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          rate?: number
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "royalties_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "royalties_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "royalties_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      scouted_artists: {
        Row: {
          artist_id: string
          commission_rate: number
          contract_signed_at: string | null
          created_at: string
          id: string
          is_active: boolean
          scout_id: string
          total_commission_earned: number
          total_sales_generated: number
        }
        Insert: {
          artist_id: string
          commission_rate?: number
          contract_signed_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          scout_id: string
          total_commission_earned?: number
          total_sales_generated?: number
        }
        Update: {
          artist_id?: string
          commission_rate?: number
          contract_signed_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          scout_id?: string
          total_commission_earned?: number
          total_sales_generated?: number
        }
        Relationships: [
          {
            foreignKeyName: "scouted_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scouted_artists_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "scouts"
            referencedColumns: ["id"]
          },
        ]
      }
      scouts: {
        Row: {
          active_bets: number
          created_at: string
          id: string
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          total_earned: number
          total_scouted: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active_bets?: number
          created_at?: string
          id?: string
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          total_earned?: number
          total_scouted?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active_bets?: number
          created_at?: string
          id?: string
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          total_earned?: number
          total_scouted?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_profiles: {
        Row: {
          adresse: string | null
          cahier_police: boolean
          code_postal: string | null
          created_at: string
          id: string
          merchant_id: string | null
          nom_gerant: string | null
          raison_sociale: string | null
          role: string
          siret: string | null
          telephone_pro: string | null
          updated_at: string
          user_id: string
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          cahier_police?: boolean
          code_postal?: string | null
          created_at?: string
          id?: string
          merchant_id?: string | null
          nom_gerant?: string | null
          raison_sociale?: string | null
          role: string
          siret?: string | null
          telephone_pro?: string | null
          updated_at?: string
          user_id: string
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          cahier_police?: boolean
          code_postal?: string | null
          created_at?: string
          id?: string
          merchant_id?: string | null
          nom_gerant?: string | null
          raison_sociale?: string | null
          role?: string
          siret?: string | null
          telephone_pro?: string | null
          updated_at?: string
          user_id?: string
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_profiles_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      shipping: {
        Row: {
          artwork_id: string | null
          buyer_address: Json | null
          buyer_country: string | null
          buyer_id: string | null
          carrier: string | null
          created_at: string | null
          declared_value: number | null
          delivered_at: string | null
          dimensions_cm: Json | null
          fragility: string | null
          hash_post_delivery: string | null
          hash_pre_shipping: string | null
          id: string
          insurance_cost: number | null
          integrity_verified: boolean | null
          margin_artcore: number | null
          order_id: string | null
          price_buyer: number | null
          price_carrier: number | null
          seller_id: string | null
          shipped_at: string | null
          shipping_level: number | null
          status: string | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          artwork_id?: string | null
          buyer_address?: Json | null
          buyer_country?: string | null
          buyer_id?: string | null
          carrier?: string | null
          created_at?: string | null
          declared_value?: number | null
          delivered_at?: string | null
          dimensions_cm?: Json | null
          fragility?: string | null
          hash_post_delivery?: string | null
          hash_pre_shipping?: string | null
          id?: string
          insurance_cost?: number | null
          integrity_verified?: boolean | null
          margin_artcore?: number | null
          order_id?: string | null
          price_buyer?: number | null
          price_carrier?: number | null
          seller_id?: string | null
          shipped_at?: string | null
          shipping_level?: number | null
          status?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          artwork_id?: string | null
          buyer_address?: Json | null
          buyer_country?: string | null
          buyer_id?: string | null
          carrier?: string | null
          created_at?: string | null
          declared_value?: number | null
          delivered_at?: string | null
          dimensions_cm?: Json | null
          fragility?: string | null
          hash_post_delivery?: string | null
          hash_pre_shipping?: string | null
          id?: string
          insurance_cost?: number | null
          integrity_verified?: boolean | null
          margin_artcore?: number | null
          order_id?: string | null
          price_buyer?: number | null
          price_carrier?: number | null
          seller_id?: string | null
          shipped_at?: string | null
          shipping_level?: number | null
          status?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_rates: {
        Row: {
          base_rate: number
          countries: string[]
          created_at: string | null
          estimated_days_max: number
          estimated_days_min: number
          fragile_surcharge: number
          id: string
          insurance_rate: number
          per_kg_rate: number
          very_fragile_surcharge: number
          zone: string
        }
        Insert: {
          base_rate: number
          countries: string[]
          created_at?: string | null
          estimated_days_max?: number
          estimated_days_min?: number
          fragile_surcharge?: number
          id?: string
          insurance_rate?: number
          per_kg_rate?: number
          very_fragile_surcharge?: number
          zone: string
        }
        Update: {
          base_rate?: number
          countries?: string[]
          created_at?: string | null
          estimated_days_max?: number
          estimated_days_min?: number
          fragile_surcharge?: number
          id?: string
          insurance_rate?: number
          per_kg_rate?: number
          very_fragile_surcharge?: number
          zone?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          acheteur_id: string | null
          amount: number | null
          artwork_id: string | null
          buyer_id: string | null
          certificat_id: string | null
          commission_artcore: number | null
          commission_artist_royalty: number | null
          commission_platform: number | null
          created_at: string | null
          id: string
          oeuvre_id: string | null
          prix_vente: number | null
          royalty_ambassadeur: number | null
          royalty_artiste: number | null
          seller_id: string | null
          status: string | null
          stripe_payment_id: string | null
          stripe_status: string | null
          type_transaction: string | null
          vendeur_id: string | null
        }
        Insert: {
          acheteur_id?: string | null
          amount?: number | null
          artwork_id?: string | null
          buyer_id?: string | null
          certificat_id?: string | null
          commission_artcore?: number | null
          commission_artist_royalty?: number | null
          commission_platform?: number | null
          created_at?: string | null
          id?: string
          oeuvre_id?: string | null
          prix_vente?: number | null
          royalty_ambassadeur?: number | null
          royalty_artiste?: number | null
          seller_id?: string | null
          status?: string | null
          stripe_payment_id?: string | null
          stripe_status?: string | null
          type_transaction?: string | null
          vendeur_id?: string | null
        }
        Update: {
          acheteur_id?: string | null
          amount?: number | null
          artwork_id?: string | null
          buyer_id?: string | null
          certificat_id?: string | null
          commission_artcore?: number | null
          commission_artist_royalty?: number | null
          commission_platform?: number | null
          created_at?: string | null
          id?: string
          oeuvre_id?: string | null
          prix_vente?: number | null
          royalty_ambassadeur?: number | null
          royalty_artiste?: number | null
          seller_id?: string | null
          status?: string | null
          stripe_payment_id?: string | null
          stripe_status?: string | null
          type_transaction?: string | null
          vendeur_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_acheteur_id_fkey"
            columns: ["acheteur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_certificat_id_fkey"
            columns: ["certificat_id"]
            isOneToOne: false
            referencedRelation: "certificats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_oeuvre_id_fkey"
            columns: ["oeuvre_id"]
            isOneToOne: false
            referencedRelation: "oeuvres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_vendeur_id_fkey"
            columns: ["vendeur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role_enum"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role_enum"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          bank_partner_connected: boolean | null
          bio: string | null
          blockchain_identifier: string | null
          business_activity: string | null
          business_address: string | null
          business_name: string | null
          business_siret: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string
          first_cert_bonus: boolean | null
          first_name: string | null
          full_name: string
          id: string
          is_initie: boolean | null
          is_professional: boolean | null
          last_name: string | null
          latitude: number | null
          longitude: number | null
          onboarding_done: boolean
          password_hash: string | null
          phone: string | null
          points_balance: number | null
          prefecture_registration: string | null
          profile_complete: boolean | null
          referred_by: string | null
          register_opened_at: string | null
          role: string | null
          seller_profile_type: string | null
          stripe_account_id: string | null
          stripe_customer_id: string | null
          technique_artistique: string | null
          total_earned: number
          total_spent: number
          updated_at: string
          username: string
          verified: boolean
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bank_partner_connected?: boolean | null
          bio?: string | null
          blockchain_identifier?: string | null
          business_activity?: string | null
          business_address?: string | null
          business_name?: string | null
          business_siret?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email: string
          first_cert_bonus?: boolean | null
          first_name?: string | null
          full_name?: string
          id: string
          is_initie?: boolean | null
          is_professional?: boolean | null
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          onboarding_done?: boolean
          password_hash?: string | null
          phone?: string | null
          points_balance?: number | null
          prefecture_registration?: string | null
          profile_complete?: boolean | null
          referred_by?: string | null
          register_opened_at?: string | null
          role?: string | null
          seller_profile_type?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          technique_artistique?: string | null
          total_earned?: number
          total_spent?: number
          updated_at?: string
          username: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bank_partner_connected?: boolean | null
          bio?: string | null
          blockchain_identifier?: string | null
          business_activity?: string | null
          business_address?: string | null
          business_name?: string | null
          business_siret?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string
          first_cert_bonus?: boolean | null
          first_name?: string | null
          full_name?: string
          id?: string
          is_initie?: boolean | null
          is_professional?: boolean | null
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          onboarding_done?: boolean
          password_hash?: string | null
          phone?: string | null
          points_balance?: number | null
          prefecture_registration?: string | null
          profile_complete?: boolean | null
          referred_by?: string | null
          register_opened_at?: string | null
          role?: string | null
          seller_profile_type?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          technique_artistique?: string | null
          total_earned?: number
          total_spent?: number
          updated_at?: string
          username?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calc_royalty_ambassadeur: {
        Args: { p_prix: number; p_type: string }
        Returns: number
      }
      generate_amb_id: { Args: never; Returns: string }
      increment_artwork_views: { Args: { p_id: string }; Returns: undefined }
      increment_oeuvres_count: { Args: { p_id: string }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      artwork_category:
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
        | "other"
      artwork_status:
        | "draft"
        | "pending_cert"
        | "certified"
        | "listed"
        | "auction"
        | "sold"
        | "rented"
        | "archived"
        | "available"
        | "for_sale"
      auction_status: "scheduled" | "live" | "ended" | "cancelled"
      bet_status: "active" | "winning" | "outbid" | "won" | "lost" | "cancelled"
      pass_core_status:
        | "active"
        | "locked"
        | "transferred"
        | "revoked"
        | "pending"
        | "certified"
      subscription_plan: "free" | "starter" | "pro" | "elite"
      subscription_status: "active" | "past_due" | "cancelled" | "trialing"
      transaction_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "refunded"
      transaction_type:
        | "purchase"
        | "auction_win"
        | "rental"
        | "royalty"
        | "scout_commission"
        | "platform_fee"
        | "refund"
        | "subscription"
      user_role_enum:
        | "collector"
        | "artist"
        | "gallery"
        | "scout"
        | "admin"
        | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      artwork_category: [
        "painting",
        "sculpture",
        "photography",
        "digital",
        "drawing",
        "printmaking",
        "mixed_media",
        "installation",
        "video",
        "textile",
        "ceramics",
        "other",
      ],
      artwork_status: [
        "draft",
        "pending_cert",
        "certified",
        "listed",
        "auction",
        "sold",
        "rented",
        "archived",
        "available",
        "for_sale",
      ],
      auction_status: ["scheduled", "live", "ended", "cancelled"],
      bet_status: ["active", "winning", "outbid", "won", "lost", "cancelled"],
      pass_core_status: [
        "active",
        "locked",
        "transferred",
        "revoked",
        "pending",
        "certified",
      ],
      subscription_plan: ["free", "starter", "pro", "elite"],
      subscription_status: ["active", "past_due", "cancelled", "trialing"],
      transaction_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "refunded",
      ],
      transaction_type: [
        "purchase",
        "auction_win",
        "rental",
        "royalty",
        "scout_commission",
        "platform_fee",
        "refund",
        "subscription",
      ],
      user_role_enum: [
        "collector",
        "artist",
        "gallery",
        "scout",
        "admin",
        "super_admin",
      ],
    },
  },
} as const
