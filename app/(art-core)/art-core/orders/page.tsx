import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatPrice, formatDate } from "@/lib/utils";
import { Package, Truck, CheckCircle2, Clock, AlertTriangle, MapPin, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

type ShippingStatus = "preparing" | "shipped" | "transit" | "delivered" | "disputed";

const STATUS_CONFIG: Record<ShippingStatus, { label: string; color: string; bg: string; border: string }> = {
  preparing: { label: "En preparation", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30" },
  shipped: { label: "Expedie", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30" },
  transit: { label: "En transit", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30" },
  delivered: { label: "Livre", color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/30" },
  disputed: { label: "Litige", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30" },
};

const TIMELINE_STEPS: { key: ShippingStatus; icon: typeof Clock }[] = [
  { key: "preparing", icon: Clock },
  { key: "shipped", icon: Package },
  { key: "transit", icon: Truck },
  { key: "delivered", icon: CheckCircle2 },
];

function getStepIndex(status: ShippingStatus): number {
  if (status === "disputed") return -1;
  return TIMELINE_STEPS.findIndex((s) => s.key === status);
}

export default async function OrdersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const sb = getDb();
  const { data: ordersRaw } = await sb
    .from("transactions")
    .select("*, artwork:artworks!transactions_artwork_id_fkey(title, photos), seller:users!transactions_seller_id_fkey(full_name)")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  // Also fetch shipping records if they exist
  const orderIds = (ordersRaw || []).map((o: any) => o.id);
  let shippingMap: Record<string, any> = {};
  if (orderIds.length > 0) {
    const { data: shippingData } = await sb
      .from("shipping_orders")
      .select("*")
      .in("transaction_id", orderIds);
    if (shippingData) {
      for (const s of shippingData) {
        shippingMap[s.transaction_id] = s;
      }
    }
  }

  const orders = (ordersRaw || []).map((o: any) => {
    const shipping = shippingMap[o.id];
    return {
      id: o.id,
      artwork_id: o.artwork_id,
      title: o.artwork?.title || "Oeuvre",
      photos: typeof o.artwork?.photos === "string" ? JSON.parse(o.artwork?.photos || "[]") : (o.artwork?.photos || []),
      seller_name: o.seller?.full_name || "Artiste",
      amount: o.amount,
      created_at: o.created_at,
      status: (shipping?.status || "preparing") as ShippingStatus,
      tracking_number: shipping?.tracking_number || null,
      shipped_at: shipping?.shipped_at || null,
      delivered_at: shipping?.delivered_at || null,
    };
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-playfair text-3xl font-semibold text-white">Mes achats</h1>
        <span className="text-xs text-white/30">{orders.length} commande{orders.length !== 1 ? "s" : ""}</span>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="size-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/40">Aucun achat pour le moment</p>
          <Link href="/art-core" className="text-[#D4AF37] text-sm mt-2 inline-block hover:underline">Explorer le marketplace</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const config = STATUS_CONFIG[o.status] || STATUS_CONFIG.preparing;
            const stepIndex = getStepIndex(o.status);

            return (
              <div key={o.id} className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden hover:border-white/10 transition-colors">
                {/* Header */}
                <div className="flex items-center gap-4 p-4 pb-3">
                  <div className="w-16 h-16 rounded-xl bg-[#111] overflow-hidden shrink-0">
                    {o.photos[0] && <img src={o.photos[0]} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/art-core/oeuvre/${o.artwork_id}`} className="text-sm font-medium text-white truncate block hover:text-[#D4AF37] transition-colors">
                          {o.title}
                        </Link>
                        <p className="text-xs text-white/30 mt-0.5">Vendu par {o.seller_name}</p>
                      </div>
                      <span className="text-[#D4AF37] font-bold text-sm tabular-nums shrink-0">{formatPrice(o.amount)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bg} ${config.color} border ${config.border}`}>
                        {o.status === "disputed" && <AlertTriangle className="size-2.5" />}
                        {config.label}
                      </span>
                      <span className="text-[10px] text-white/20">{formatDate(o.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                {o.status !== "disputed" && (
                  <div className="px-4 py-3 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      {TIMELINE_STEPS.map((step, i) => {
                        const Icon = step.icon;
                        const isActive = i <= stepIndex;
                        const isCurrent = i === stepIndex;
                        const stepConfig = STATUS_CONFIG[step.key];
                        return (
                          <div key={step.key} className="flex items-center flex-1">
                            <div className="flex flex-col items-center">
                              <div className={`size-7 rounded-full flex items-center justify-center border transition-all ${
                                isCurrent
                                  ? `${stepConfig.bg} ${stepConfig.border} ${stepConfig.color}`
                                  : isActive
                                    ? "bg-green-400/10 border-green-400/30 text-green-400"
                                    : "bg-white/[0.03] border-white/10 text-white/20"
                              }`}>
                                <Icon className="size-3.5" />
                              </div>
                              <span className={`text-[9px] mt-1 ${isActive ? "text-white/50" : "text-white/15"}`}>
                                {stepConfig.label}
                              </span>
                            </div>
                            {i < TIMELINE_STEPS.length - 1 && (
                              <div className={`flex-1 h-px mx-1.5 ${i < stepIndex ? "bg-green-400/30" : "bg-white/10"}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Footer: tracking + actions */}
                <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                  <div className="text-[11px] space-y-0.5">
                    {o.tracking_number && (
                      <p className="text-white/40 flex items-center gap-1">
                        <MapPin className="size-3" />
                        Suivi : <span className="text-white/70 font-mono">{o.tracking_number}</span>
                      </p>
                    )}
                    {o.shipped_at && (
                      <p className="text-white/25">Expedie le {formatDate(o.shipped_at)}</p>
                    )}
                    {o.delivered_at && (
                      <p className="text-white/25">Livre le {formatDate(o.delivered_at)}</p>
                    )}
                    {!o.tracking_number && (
                      <p className="text-white/20">Numero de suivi en attente</p>
                    )}
                  </div>

                  {o.status === "delivered" && (
                    <Link
                      href={`/art-core/orders/${o.id}/reception`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-400/10 border border-green-400/30 text-green-400 text-xs font-medium hover:bg-green-400/20 transition-colors"
                    >
                      <CheckCircle2 className="size-3.5" />
                      Verifier la reception
                      <ChevronRight className="size-3" />
                    </Link>
                  )}
                  {o.status === "disputed" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-400/10 border border-red-400/30 text-red-400 text-xs font-medium">
                      <AlertTriangle className="size-3.5" />
                      Litige en cours
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
