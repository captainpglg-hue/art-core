import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-04-10" as any,
});

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const { artwork_id } = await req.json();
    if (!artwork_id) return NextResponse.json({ error: "artwork_id requis" }, { status: 400 });

    const sb = getDb();
    const { data: artwork } = await sb.from("artworks").select("*").eq("id", artwork_id).single();
    if (!artwork) return NextResponse.json({ error: "Oeuvre non trouvee" }, { status: 404 });
    if (artwork.status === "sold") return NextResponse.json({ error: "Oeuvre deja vendue" }, { status: 400 });

    const amount = Math.round(Number(artwork.price) * 100); // Stripe uses cents

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "eur",
      metadata: {
        artwork_id: artwork.id,
        buyer_id: user.id,
        artwork_title: artwork.title,
      },
    });

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      amount: Number(artwork.price),
    });
  } catch (error: any) {
    console.error("Stripe PaymentIntent error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
