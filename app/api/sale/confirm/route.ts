import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb } from "@/lib/db";
import {
  calculateFirstSale,
  calculateResale,
  distributeInitiatesPool,
} from "@/lib/royalties";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("core_session")?.value;
    if (!token) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const { artwork_id, payment_intent_id, simulation } = await req.json();
    if (!artwork_id) return NextResponse.json({ error: "artwork_id requis" }, { status: 400 });

    const sb = getDb();

    // Fetch artwork
    const { data: artwork, error: artErr } = await sb.from("artworks").select("*").eq("id", artwork_id).single();
    if (artErr || !artwork) return NextResponse.json({ error: "Oeuvre non trouvee" }, { status: 404 });
    if (artwork.status === "sold") return NextResponse.json({ error: "Deja vendue" }, { status: 400 });

    const price = Number(artwork.price);
    if (price <= 0) return NextResponse.json({ error: "Prix invalide" }, { status: 400 });

    const isResale = artwork.owner_id !== artwork.artist_id;

    // Count previous sales for resale number
    const { count: previousSales } = await sb
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("artwork_id", artwork_id)
      .eq("status", "completed");
    const saleNumber = (previousSales || 0) + 1;

    // Get first sale date for ambassador expiry
    let firstSaleDate = new Date();
    if (isResale) {
      const { data: firstTx } = await sb
        .from("transactions")
        .select("created_at")
        .eq("artwork_id", artwork_id)
        .eq("status", "completed")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      if (firstTx) firstSaleDate = new Date(firstTx.created_at);
    }

    // Calculate splits using royalties.ts
    const firstSplit = !isResale ? calculateFirstSale(price) : null;
    const resaleSplit = isResale ? calculateResale(price, saleNumber, firstSaleDate) : null;

    const platformFee = firstSplit ? firstSplit.platform : resaleSplit!.platform;

    // Create transaction record
    const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await sb.from("transactions").insert({
      id: txId,
      artwork_id,
      buyer_id: user.id,
      seller_id: artwork.owner_id || artwork.artist_id,
      amount: price,
      commission_platform: platformFee,
      status: "completed",
    });

    // Update artwork status
    await sb.from("artworks").update({
      status: "sold",
      final_sale_price: price,
      buyer_id: user.id,
      owner_id: user.id,
      sold_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", artwork_id);

    // ── Distribute funds ──────────────────────────────
    const walletUpdates: { userId: string; amount: number; type: string; description: string }[] = [];

    if (firstSplit) {
      walletUpdates.push({
        userId: artwork.artist_id,
        amount: firstSplit.artist,
        type: "sale_revenue",
        description: `Vente "${artwork.title}" — artiste 85%`,
      });
    } else if (resaleSplit) {
      walletUpdates.push({
        userId: artwork.owner_id,
        amount: resaleSplit.seller,
        type: "sale_revenue",
        description: `Revente "${artwork.title}" — vendeur 84%`,
      });

      walletUpdates.push({
        userId: artwork.artist_id,
        amount: resaleSplit.artistRoyalty,
        type: "artist_royalty",
        description: `Royalty perpetuelle "${artwork.title}" — 10%`,
      });
    }

    // Apply all wallet updates
    for (const update of walletUpdates) {
      try {
        const { data: targetUser } = await sb
          .from("users")
          .select("total_earned")
          .eq("id", update.userId)
          .single();

        await sb.from("users").update({
          total_earned: Number(targetUser?.total_earned ?? 0) + update.amount,
        }).eq("id", update.userId);

        const ptId = `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await sb.from("point_transactions").insert({
          id: ptId,
          user_id: update.userId,
          amount: update.amount,
          type: update.type,
          reference_id: txId,
          description: update.description,
        });
      } catch (e) {
        console.error("Wallet update error:", e);
      }
    }

    // Notify seller
    try {
      const sellerId = artwork.owner_id !== user.id ? artwork.owner_id : artwork.artist_id;
      await sb.from("notifications").insert({
        user_id: sellerId,
        type: "sale",
        title: "Oeuvre vendue !",
        message: `"${artwork.title}" vendue pour ${price}€${simulation ? " (mode test)" : ""}`,
        link: `/art-core/oeuvre/${artwork_id}`,
      });
    } catch (e) {
      console.error("Notification error:", e);
    }

    // Record ownership transfer
    try {
      await sb.from("ownership_transfers").insert({
        artwork_id,
        from_user_id: artwork.owner_id || artwork.artist_id,
        to_user_id: user.id,
        transfer_type: "sale",
        price,
        notes: simulation ? "Achat test (simulation)" : "Achat via ART-CORE",
        blockchain_tx: payment_intent_id,
      });
    } catch { /* table may not exist in Supabase */ }

    return NextResponse.json({
      success: true,
      transactionId: txId,
      amount: price,
      simulation: !!simulation,
      split: (firstSplit
        ? { platform: firstSplit.platform, artist: firstSplit.artist, ambassador: firstSplit.ambassador }
        : { platform: resaleSplit!.platform, artistRoyalty: resaleSplit!.artistRoyalty, seller: resaleSplit!.seller, initiates: resaleSplit!.initiatesPool, ambassador: resaleSplit!.ambassador }) as Record<string, number>,
      payment_intent_id,
    });
  } catch (error: any) {
    console.error("Sale confirm error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
