import Stripe from "stripe";
import { loadStripe } from "@stripe/stripe-js";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_PUB_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

// ── Server-side Stripe instance ───────────────────────────────
export const stripe = STRIPE_KEY
  ? new Stripe(STRIPE_KEY, { apiVersion: "2024-04-10", typescript: true })
  : (null as unknown as Stripe);

export const isStripeConfigured = () => !!STRIPE_KEY;

// ── Client-side Stripe (singleton) ───────────────────────────
let stripePromise: ReturnType<typeof loadStripe>;
export const getStripe = () => {
  if (!STRIPE_PUB_KEY) {
    console.warn("[Stripe] Non configuré — NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY manquant");
    return Promise.resolve(null);
  }
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUB_KEY);
  }
  return stripePromise;
};

// ── Commission splits ─────────────────────────────────────────
// Décision Philippe (31/05/2026) :
//   VENTE PRIMAIRE (artiste vend son œuvre) : 90% vendeur · 10% plateforme.
//     Pas de pool Initiés, pas de royalties. Aligné sur /api/purchase/confirm.
//   REVENTE (œuvre de collection revendue) : 75% vendeur · 15% plateforme ·
//     5% pool Initiés · 5% royalties artiste original.
export const COMMISSION = {
  // Primaire
  PRIMARY_PLATFORM: 0.10, // 10% — Art-Core LTD sur vente primaire
  // Revente
  SELLER: 0.75,         // 75% — revendeur
  INITIE_POOL: 0.05,    // 5%  — pool Initiés (proportionnel aux points investis)
  ARTIST_ROYALTY: 0.05, // 5%  — artiste original sur revente
  // Plateforme en revente = remainder (~15%)
} as const;

export const calculateSplit = (amountCents: number, isResale = false) => {
  if (!isResale) {
    // Vente primaire : 90 / 10, rien d'autre.
    const platform = Math.round(amountCents * COMMISSION.PRIMARY_PLATFORM);
    const sellerNet = amountCents - platform;
    return { platform, artistRoyalty: 0, scout: 0, sellerNet, initiePool: 0 };
  }
  // Revente : vendeur 75 / Initiés 5 / royalties 5 / plateforme = remainder (~15).
  const sellerNet = Math.round(amountCents * COMMISSION.SELLER);
  const initiePool = Math.round(amountCents * COMMISSION.INITIE_POOL);
  const artistRoyalty = Math.round(amountCents * COMMISSION.ARTIST_ROYALTY);
  const platform = amountCents - sellerNet - initiePool - artistRoyalty;
  const scout = initiePool; // alias legacy
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
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !stripe) {
    throw new Error("Stripe non configuré — STRIPE_WEBHOOK_SECRET manquant");
  }
  return stripe.webhooks.constructEvent(payload, signature, secret);
};
