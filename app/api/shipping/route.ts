import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";
import { calculateShipping, calculateMargin, generateTrackingNumber, type Fragility } from "@/lib/shipping";

// GET: Calculate shipping cost for an artwork
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const artworkId = searchParams.get("artwork_id");

  if (!artworkId) {
    // Return default rates
    const result = calculateShipping({ weight_kg: 2, max_dimension_cm: 60, fragility: "standard", declared_value: 1000 });
    return NextResponse.json(result);
  }

  const sb = getDb();
  const { data: artwork } = await sb.from("artworks").select("price, weight_kg, fragility, width_cm, height_cm, depth_cm").eq("id", artworkId).single();

  if (!artwork) return NextResponse.json({ error: "Oeuvre non trouvee" }, { status: 404 });

  const weight = Number(artwork.weight_kg) || 1;
  const maxDim = Math.max(Number(artwork.width_cm) || 50, Number(artwork.height_cm) || 50, Number(artwork.depth_cm) || 5);
  const fragility = (artwork.fragility as Fragility) || "standard";
  const value = Number(artwork.price) || 0;

  const result = calculateShipping({ weight_kg: weight, max_dimension_cm: maxDim, fragility, declared_value: value });
  return NextResponse.json(result);
}

// POST: Create shipping order after payment
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const { artwork_id, buyer_address, buyer_country, shipping_zone } = await req.json();
    if (!artwork_id) return NextResponse.json({ error: "artwork_id requis" }, { status: 400 });

    const sb = getDb();
    const { data: artwork } = await sb.from("artworks").select("*").eq("id", artwork_id).single();
    if (!artwork) return NextResponse.json({ error: "Oeuvre non trouvee" }, { status: 404 });

    const weight = Number(artwork.weight_kg) || 1;
    const maxDim = Math.max(Number(artwork.width_cm) || 50, Number(artwork.height_cm) || 50, Number(artwork.depth_cm) || 5);
    const fragility = (artwork.fragility as Fragility) || "standard";
    const value = Number(artwork.price) || 0;

    const shippingCalc = calculateShipping({ weight_kg: weight, max_dimension_cm: maxDim, fragility, declared_value: value });
    const selectedZone = shippingCalc.zones.find(z => z.zone === (shipping_zone || "FR")) || shippingCalc.zones[0];
    const priceBuyer = selectedZone.cost;
    const { price_carrier, margin, insurance } = calculateMargin(priceBuyer);
    const trackingNumber = generateTrackingNumber();

    // Get pre-shipping hash from certification
    const { data: cert } = await sb.from("pass_core_certifications").select("hash").eq("artwork_id", artwork_id).limit(1).single();

    const { data: shipping, error } = await sb.from("shipping").insert({
      artwork_id,
      seller_id: artwork.artist_id || artwork.owner_id,
      buyer_id: user.id,
      weight_kg: weight,
      dimensions_cm: { width: artwork.width_cm, height: artwork.height_cm, depth: artwork.depth_cm },
      fragility,
      declared_value: value,
      shipping_level: shippingCalc.level,
      price_buyer: priceBuyer,
      price_carrier,
      margin_artcore: margin,
      insurance_cost: insurance,
      carrier: "Art-Core Express",
      tracking_number: trackingNumber,
      tracking_url: `https://art-core-brown.vercel.app/art-core/orders?tracking=${trackingNumber}`,
      status: "preparing",
      hash_pre_shipping: cert?.hash || null,
      buyer_country: buyer_country || "FR",
      buyer_address: buyer_address || null,
    }).select("*").single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      shipping_id: shipping?.id,
      tracking_number: trackingNumber,
      shipping_cost: priceBuyer,
      insurance_cost: insurance,
      estimated_days: selectedZone.days,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
