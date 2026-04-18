import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { verifyOnChain, getConfig, getExplorerUrl } from "@/lib/blockchain";

export async function POST(req: NextRequest) {
  try {
    const { hash } = await req.json();
    if (!hash) {
      return NextResponse.json({ error: "Hash requis" }, { status: 400 });
    }

    // 1. Check local DB
    const artwork = await queryOne<any>(
      `SELECT a.*, u.full_name as artist_name FROM artworks a JOIN users u ON a.artist_id = u.id WHERE a.blockchain_hash = ?`,
      [hash]
    );

    // 2. Check on-chain (if configured)
    let onChainResult = null;
    const config = getConfig();
    if (!config.isSimulation) {
      try {
        onChainResult = await verifyOnChain(hash as `0x${string}`);
      } catch {}
    }

    if (!artwork && !onChainResult?.verified) {
      return NextResponse.json({
        verified: false,
        on_chain: false,
        error: "Aucune oeuvre trouvée avec ce hash",
      });
    }

    return NextResponse.json({
      verified: true,
      on_chain: onChainResult?.verified || false,
      artwork: artwork ? {
        id: artwork.id,
        title: artwork.title,
        artist_name: artwork.artist_name,
        certification_date: artwork.certification_date,
        blockchain_hash: artwork.blockchain_hash,
        tx_hash: artwork.blockchain_tx_id,
        explorer_url: getExplorerUrl(artwork.blockchain_tx_id),
        photos: JSON.parse(artwork.photos || "[]"),
      } : null,
      blockchain: onChainResult ? {
        certified_by: onChainResult.certifiedBy,
        timestamp: onChainResult.timestamp,
        on_chain: onChainResult.onChain,
      } : null,
      config: {
        network: config.network,
        simulation: config.isSimulation,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const hash = new URL(req.url).searchParams.get("hash");
  if (!hash) return NextResponse.json({ error: "Hash requis" }, { status: 400 });

  const body = JSON.stringify({ hash });
  const fakeReq = new NextRequest(req.url, { method: "POST", body, headers: { "content-type": "application/json" } });
  return POST(fakeReq);
}
