-- Add SELECT-self RLS policies for 10 user-owned tables so that Supabase
-- Realtime can push row-level events to the right authenticated user.
-- Service_role (used by server-side code via getDb()) continues to bypass RLS.
-- Anonymous users get nothing here (no anon role mentioned).

CREATE POLICY "bets_select_self" ON public.bets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR bidder_id = auth.uid());

CREATE POLICY "scouts_select_self" ON public.scouts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "follows_select_self" ON public.follows
  FOR SELECT TO authenticated
  USING (follower_id = auth.uid() OR following_id = auth.uid());

CREATE POLICY "affiliate_links_select_self" ON public.affiliate_links
  FOR SELECT TO authenticated
  USING (scout_id IN (SELECT id FROM public.scouts WHERE user_id = auth.uid()));

CREATE POLICY "passport_requests_select_self" ON public.passport_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "listings_select_seller" ON public.listings
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid());

CREATE POLICY "auctions_select_seller" ON public.auctions
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid());

CREATE POLICY "orders_select_parties" ON public.orders
  FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "rentals_select_parties" ON public.rentals
  FOR SELECT TO authenticated
  USING (renter_id = auth.uid() OR owner_id = auth.uid());

CREATE POLICY "scouted_artists_select_self" ON public.scouted_artists
  FOR SELECT TO authenticated
  USING (
    artist_id = auth.uid()
    OR scout_id IN (SELECT id FROM public.scouts WHERE user_id = auth.uid())
  );

-- Enable Realtime broadcast on these tables. Postgres will now publish
-- INSERT/UPDATE/DELETE events; subscribers see only rows their RLS allows.

ALTER PUBLICATION supabase_realtime ADD TABLE public.bets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scouts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.affiliate_links;
ALTER PUBLICATION supabase_realtime ADD TABLE public.passport_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rentals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scouted_artists;
