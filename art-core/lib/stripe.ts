import Stripe from "stripe";
import { loadStripe } from "@stripe/stripe-js";

// ── Server-side Stripe instance ───────────────────────────────
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
  typescript: true,
});

// ── Client-side Stripe (singleton) ───────────────────────────
let stripePromise: ReturnType<typeof loadStripe>;
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

// ── Commission splits ─────────────────────────────────────────
// Sale: 75% seller · 20% Art-Core LTD · 5% Initiés pool
// Resale: artist royalty 5% taken from platform's 20% (platform keeps 15%)
export const COMMISSION = {
  SELLER: 0.75,         // 75% — seller (artist or collector)
  PLATFORM: 0.20,       // 20% — Art-Core LTD
  INITIE_POOL: 0.05,    // 5%  — Initiés (proportional to points invested)
  ARTIST_ROYALTY: 0.05, // 5%  — original artist on resale (from platform cut)
} as const;

export const calculateSplit = (amountCents: number, isResale = false) => {
  const sellerNet = Math.round(amountCents * COMMISSION.SELLER);
  const initiePool = Math.round(amountCents * COMMISSION.INITIE_POOL);
  const artistRoyalty = isResale ? Math.round(amountCents * COMMISSION.ARTIST_ROYALTY) : 0;
  const platform = amountCents - sellerNet - initiePool - artistRoyalty;
  // Legacy aliases kept for compat
  const scout = initiePool;
  return { platform, artistRoyalty, scout, sellerNet, initiePool };
};

// ── Stripe Connect — Create Express Account ───────────────────
export const createConnectAccount = async (email: string) => {
  return stripe.accounts.create({
    type: "express",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: "individual",
    settings: {
      payouts: { schedule: { interval: "weekly" } },
    },
  });
};

export const createOnboardingLink = async (
  accountId: string,
  returnUrl: string,
  refreshUrl: string
) => {
  return stripe.accountLinks.create({
    account: accountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: "account_onboarding",
  });
};

// ── Payment Intent with automatic splits ─────────────────────
export const createArtworkPaymentIntent = async ({
  amountCents,
  currency = "eur",
  sellerAccountId,
  artworkId,
  buyerId,
  isResale = false,
}: {
  amountCents: number;
  currency?: string;
  sellerAccountId: string;
  artworkId: string;
  buyerId: string;
  isResale?: boolean;
}) => {
  const { platform } = calculateSplit(amountCents, isResale);

  return stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    application_fee_amount: platform,
    transfer_data: {
      destination: sellerAccountId,
    },
    metadata: {
      artwork_id: artworkId,
      buyer_id: buyerId,
      is_resale: String(isResale),
      type: "artwork_purchase",
    },
    automatic_payment_methods: { enabled: true },
  });
};

// ── Simple Payment Intent (no Connect — for test/demo) ────────
// Use when the seller has no Stripe Connect account (test mode)
export const createSimplePaymentIntent = async ({
  amountCents,
  currency = "eur",
  artworkId,
  buyerId,
  isResale = false,
}: {
  amountCents: number;
  currency?: string;
  artworkId: string;
  buyerId: string;
  isResale?: boolean;
}) => {
  return stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    metadata: {
      artwork_id: artworkId,
      buyer_id: buyerId,
      is_resale: String(isResale),
      type: "artwork_purchase_direct",
    },
    automatic_payment_methods: { enabled: true },
  });
};

// ── Rental Payment ─────────────────────────────────────────────
export const createRentalPaymentIntent = async ({
  amountCents,
  depositCents,
  currency = "eur",
  ownerAccountId,
  artworkId,
  renterId,
}: {
  amountCents: number;
  depositCents: number;
  currency?: string;
  ownerAccountId: string;
  artworkId: string;
  renterId: string;
}) => {
  const { platform } = calculateSplit(amountCents);
  const totalCents = amountCents + depositCents;

  return stripe.paymentIntents.create({
    amount: totalCents,
    currency,
    application_fee_amount: platform,
    transfer_data: {
      destination: ownerAccountId,
    },
    metadata: {
      artwork_id: artworkId,
      renter_id: renterId,
      rental_amount: String(amountCents),
      deposit_amount: String(depositCents),
      type: "artwork_rental",
    },
    automatic_payment_methods: { enabled: true },
  });
};

// ── Construct Webhook Event ────────────────────────────────────
export const constructWebhookEvent = (
  payload: string | Buffer,
  signature: string
) => {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
};
