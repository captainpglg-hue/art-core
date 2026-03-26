// ── Art-Core Transport Module ─────────────────────────────
// Calcul automatique des frais de livraison selon 4 niveaux

export type Fragility = "standard" | "fragile" | "tres_fragile";

export interface ShippingInput {
  weight_kg: number;
  max_dimension_cm: number;
  fragility: Fragility;
  declared_value: number;
}

export interface ShippingZone {
  zone: string;
  label: string;
  cost: number;
  insurance: string;
  days: string;
}

export interface ShippingResult {
  level: number;
  zones: ShippingZone[];
  fragility_surcharge: number;
  insurance_included: string;
  on_quote: boolean;
}

const FRAGILITY_SURCHARGE: Record<Fragility, number> = {
  standard: 0,
  fragile: 10,
  tres_fragile: 25,
};

export function calculateShipping(input: ShippingInput): ShippingResult {
  const { weight_kg, max_dimension_cm, fragility, declared_value } = input;
  const surcharge = FRAGILITY_SURCHARGE[fragility] || 0;

  // Niveau 4 — Valeur > 50 000€
  if (declared_value > 50000) {
    return {
      level: 4,
      zones: [
        { zone: "all", label: "Tous pays", cost: 0, insurance: "Sur mesure", days: "Sur devis" },
      ],
      fragility_surcharge: 0,
      insurance_included: "Sur mesure",
      on_quote: true,
    };
  }

  // Niveau 3 — Poids > 10kg ou dimensions > 100cm
  if (weight_kg > 10 || max_dimension_cm > 100) {
    return {
      level: 3,
      zones: [
        { zone: "FR", label: "France", cost: 89.90 + surcharge, insurance: "50 000€", days: "5-7 jours" },
        { zone: "EU", label: "Europe", cost: 189.90 + surcharge, insurance: "50 000€", days: "7-14 jours" },
        { zone: "INT", label: "International", cost: 0, insurance: "50 000€", days: "Sur devis" },
      ],
      fragility_surcharge: surcharge,
      insurance_included: "jusqu'à 50 000€",
      on_quote: false,
    };
  }

  // Niveau 2 — Poids 1-10kg ou dimensions 40-100cm
  if (weight_kg > 1 || max_dimension_cm > 40) {
    return {
      level: 2,
      zones: [
        { zone: "FR", label: "France", cost: 19.90 + surcharge, insurance: "5 000€", days: "3-5 jours" },
        { zone: "EU_NEAR", label: "Europe < 1500km", cost: 45.90 + surcharge, insurance: "5 000€", days: "5-7 jours" },
        { zone: "EU_FAR", label: "Europe > 1500km", cost: 69.90 + surcharge, insurance: "5 000€", days: "7-10 jours" },
        { zone: "INT", label: "International", cost: 149.90 + surcharge, insurance: "5 000€", days: "10-21 jours" },
      ],
      fragility_surcharge: surcharge,
      insurance_included: "jusqu'à 5 000€",
      on_quote: false,
    };
  }

  // Niveau 1 — Poids < 1kg, dimensions < 40cm
  return {
    level: 1,
    zones: [
      { zone: "FR", label: "France", cost: 4.90 + surcharge, insurance: "500€", days: "2-4 jours" },
      { zone: "EU_NEAR", label: "Europe < 1500km", cost: 12.90 + surcharge, insurance: "500€", days: "3-5 jours" },
      { zone: "EU_FAR", label: "Europe > 1500km", cost: 19.90 + surcharge, insurance: "500€", days: "5-7 jours" },
      { zone: "INT", label: "International", cost: 39.90 + surcharge, insurance: "500€", days: "7-14 jours" },
    ],
    fragility_surcharge: surcharge,
    insurance_included: "jusqu'à 500€",
    on_quote: false,
  };
}

export function getShippingLevel(weight_kg: number, max_dimension_cm: number, declared_value: number): number {
  if (declared_value > 50000) return 4;
  if (weight_kg > 10 || max_dimension_cm > 100) return 3;
  if (weight_kg > 1 || max_dimension_cm > 40) return 2;
  return 1;
}

export function generateTrackingNumber(): string {
  const prefix = "AC";
  const num = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}-${num.slice(0, 4)}-${num.slice(4, 8)}-FR`;
}

export function calculateMargin(price_buyer: number): { price_carrier: number; margin: number; insurance: number } {
  const price_carrier = Math.round(price_buyer * 0.63 * 100) / 100; // -37%
  const margin = Math.round((price_buyer - price_carrier - 2) * 100) / 100;
  return { price_carrier, margin, insurance: 2.00 };
}
