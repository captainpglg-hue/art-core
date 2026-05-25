import { getScoutStats, getUserByToken } from "@/lib/db";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Trophy, TrendingUp, Coins, Share2, Star, ArrowUp, Gift, Target, Copy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ScoutDashboardPage() {
  const token = cookies().get("prime_session")?.value;
  const sessionUser = token ? await getUserByToken(token) : undefined;
  if (!sessionUser || !sessionUser.id) {
    redirect("/prime-core/auth/login?next=/prime-core/scout");
  }

  const { user, totalBets, wonBets, commissions, myRank, totalScouts, weekGains, monthGains, recentActivity, topScouts } =
    await getScoutStats(sessionUser.id);

  // Fallback défensif : si getScoutStats ne trouve pas le user (race condition),
  // on retombe sur la session pour ne pas crasher sur user.x null.
  const safeUser = user && user.id ? user : {
    id: sessionUser.id,
    username: sessionUser.username || "scout",
    full_name: sessionUser.full_name || null,
    points_balance: sessionUser.points_balance ?? 0,
    total_earned: sessionUser.total_earned ?? 0,
  };

  // Tier calculation
  const pts = Number(safeUser.total_earned) || 0;
  const tier = pts >= 5000 ? { name: "Or", icon: "🥇", next: null as string | null, needed: 0 } :
               pts >= 2000 ? { name: "Argent", icon: "🥈", next: "Or", needed: 5000 - pts } :
               pts >= 500 ? { name: "Bronze", icon: "🥉", next: "Argent", needed: 2000 - pts } :
               { name: "Debutant", icon: "🎖", next: "Bronze", needed: 500 - pts };

  const refCode = safeUser.username?.replace(/[^a-z0-9]/g, "") || "scout";

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Solde */}
      <div className="rounded-2xl bg-gradient-to-br from-[#C9A84C]/10 to-transparent border border-[#C9A84C]/20 p-6 mb-6">
        <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Mon solde</p>
        <div className="flex items-baseline gap-2">
          <Coins className="size-7 text-[#C9A84C]" />
          <span className="text-4xl font-bold text-[#C9A84C] tabular-nums">{Math.round(Number(safeUser.points_balance) || 0)}</span>
          <span className="text-white/30">pts</span>
          <span className="text-white/20">=</span>
          <span className="text-white/50 font-semibold">{((Number(safeUser.points_balance) || 0) / 100).toFixed(2)}€</span>
        </div>
        {tier.next && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-white/30">{tier.icon} Niveau {tier.name}</span>
              <span className="text-[#C9A84C]">Plus que {Math.round(tier.needed)} pts pour {tier.next}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#C9A84C] rounded-full" style={{ width: `${Math.min(100, (1 - tier.needed / (tier.name === "Debutant" ? 500 : 2000)) * 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Gains */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
          <p className="text-lg font-bold text-green-400 tabular-nums">+{Math.round(Number(weekGains))}</p>
          <p className="text-[10px] text-white/25">Cette semaine</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
          <p className="text-lg font-bold text-[#C9A84C] tabular-nums">+{Math.round(Number(monthGains))}</p>
          <p className="text-[10px] text-white/25">Ce mois</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
          <p className="text-lg font-bold text-white tabular-nums">+{Math.round(Number(safeUser.total_earned) || 0)}</p>
          <p className="text-[10px] text-white/25">Total cumule</p>
        </div>
      </div>

      {/* Rang */}
      <div className="rounded-xl bg-[#C9A84C]/5 border border-[#C9A84C]/15 p-4 flex items-center gap-4 mb-6">
        <Trophy className="size-8 text-[#C9A84C]" />
        <div>
          <p className="text-white font-semibold">Classe <span className="text-[#C9A84C]">{myRank}e</span> sur {totalScouts} scouts</p>
          <p className="text-white/30 text-xs">{tier.icon} Niveau {tier.name}</p>
        </div>
      </div>

      {/* Explication */}
      <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4 mb-6">
        <p className="text-sm text-white/50">
          Tu gagnes <span className="text-[#C9A84C] font-semibold">10% du prix</span> de chaque oeuvre vendue grace a ton lien.
          Ex : toile 800€ = <span className="text-[#C9A84C]">80 pts = 0,80€</span>
        </p>
      </div>

      {/* Lien affiliation */}
      <div className="rounded-2xl border border-[#C9A84C]/20 bg-[#C9A84C]/5 p-5 mb-6">
        <p className="text-xs text-[#C9A84C] font-medium mb-2">Mon lien de parrainage</p>
        <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2 mb-3">
          <code className="text-xs text-white/60 flex-1 truncate">art-core.app/ref/{refCode}</code>
          <span className="text-[#C9A84C] shrink-0"><Copy className="size-4" /></span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {["Copier", "WhatsApp", "Instagram", "Email"].map(label => (
            <div key={label} className="py-2 rounded-lg bg-white/5 text-white/40 text-[10px] text-center">{label}</div>
          ))}
        </div>
      </div>

      {/* Leaderboard compact */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Trophy className="size-4 text-[#C9A84C]" /> Classement
        </h3>
        <div className="rounded-xl border border-white/5 overflow-hidden">
          {topScouts.slice(0, 5).map((s: any, i: number) => {
            const isMe = s.username === safeUser.username;
            return (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 ${isMe ? "bg-[#C9A84C]/10" : ""}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0 ? "bg-[#C9A84C] text-black" : i === 1 ? "bg-white/15 text-white" : i === 2 ? "bg-orange-800/50 text-orange-300" : "bg-white/5 text-white/30"
                }`}>{i + 1}</span>
                <span className={`text-sm flex-1 ${isMe ? "text-[#C9A84C] font-semibold" : "text-white/60"}`}>
                  {isMe ? "Vous" : `Scout_${(s.username || "").slice(0, 5)}`}
                </span>
                <span className="text-xs text-white/30 tabular-nums">{Math.round(Number(s.total_earned))} pts</span>
              </div>
            );
          })}
        </div>

        {/* Rewards */}
        <div className="mt-3 space-y-1.5">
          {[
            { rank: "Top 1", reward: "500€ + Legendaire", pts: 5000 },
            { rank: "Top 3", reward: "200€ + Elite", pts: 3000 },
            { rank: "Top 10", reward: "100€ + Expert", pts: 1500 },
          ].map(r => (
            <div key={r.rank} className="flex items-center justify-between text-xs px-2">
              <span className="text-white/25">{r.rank}: {r.reward}</span>
              {pts < r.pts && <span className="text-[#C9A84C]/50">-{r.pts - Math.round(pts)} pts</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Activite recente */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Activite recente</h3>
        <div className="space-y-1">
          {recentActivity.map((a: any, i: number) => (
            <div key={a.id ?? i} className="flex items-center justify-between py-2.5 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${Number(a.amount) > 0 ? "bg-green-500" : "bg-red-500"}`} />
                <p className="text-xs text-white/50 truncate max-w-[200px]">{a.description}</p>
              </div>
              <span className={`text-xs font-semibold tabular-nums ${Number(a.amount) > 0 ? "text-green-400" : "text-red-400"}`}>
                {Number(a.amount) > 0 ? "+" : ""}{Math.round(Number(a.amount))} pts
              </span>
            </div>
          ))}
          {recentActivity.length === 0 && <p className="text-white/20 text-xs text-center py-4">Aucune activite</p>}
        </div>
      </div>
    </div>
  );
}
