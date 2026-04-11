import { getDb } from "@/lib/db";
import { Trophy, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default function LeaderboardPage() {
  const db = getDb();

  // Top bettors by total won
  const topBettors = db.prepare(
    `SELECT u.name, u.username,
            COUNT(b.id) as total_bets,
            SUM(CASE WHEN b.result = 'won' THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN b.result = 'lost' THEN 1 ELSE 0 END) as losses,
            COALESCE(SUM(b.payout), 0) as total_payout,
            COALESCE(SUM(b.amount), 0) as total_wagered
     FROM bets b
     JOIN users u ON b.user_id = u.id
     GROUP BY b.user_id
     ORDER BY total_payout DESC
     LIMIT 20`
  ).all() as any[];

  // Top initiates by commissions
  const topInitiates = db.prepare(
    `SELECT u.name, u.username, u.points_balance, u.total_earned,
            COUNT(ic.id) as total_commissions,
            COALESCE(SUM(ic.commission_amount), 0) as total_commission_amount
     FROM users u
     LEFT JOIN initiate_commissions ic ON u.id = ic.initiate_id
     WHERE u.is_initie = 1
     GROUP BY u.id
     ORDER BY u.total_earned DESC
     LIMIT 20`
  ).all() as any[];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
        <Trophy className="size-8 text-[#C9A84C]" />Leaderboard
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Bettors */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="size-4 text-green-400" />Top Parieurs
          </h2>
          <div className="rounded-2xl bg-[#141720] border border-white/5 overflow-hidden">
            {topBettors.map((b, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-white/5 last:border-0">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  i === 0 ? "bg-[#C9A84C] text-black" : i === 1 ? "bg-white/15 text-white" : i === 2 ? "bg-orange-800/50 text-orange-300" : "bg-white/5 text-white/30"
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{b.name}</p>
                  <p className="text-[10px] text-white/30">@{b.username} — {b.wins}W/{b.losses}L</p>
                </div>
                <span className="text-green-400 font-bold text-sm tabular-nums">{b.total_payout.toFixed(0)} pts</span>
              </div>
            ))}
            {topBettors.length === 0 && <p className="p-4 text-center text-white/30 text-sm">Aucun pari encore</p>}
          </div>
        </div>

        {/* Top Initiates */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Trophy className="size-4 text-[#C9A84C]" />Top Initiés
          </h2>
          <div className="rounded-2xl bg-[#141720] border border-white/5 overflow-hidden">
            {topInitiates.map((init, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-white/5 last:border-0">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  i === 0 ? "bg-[#C9A84C] text-black" : i === 1 ? "bg-white/15 text-white" : i === 2 ? "bg-orange-800/50 text-orange-300" : "bg-white/5 text-white/30"
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{init.name}</p>
                  <p className="text-[10px] text-white/30">@{init.username} — {init.total_commissions} commissions</p>
                </div>
                <span className="text-[#C9A84C] font-bold text-sm tabular-nums">{init.total_earned.toFixed(0)} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
