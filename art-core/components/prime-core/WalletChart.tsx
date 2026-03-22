"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface WalletData {
  label: string;
  amount: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[#141720] border border-[#1E2235] px-3 py-2 text-xs shadow-lg">
      <p className="text-white/40 mb-0.5">{label}</p>
      <p className="font-bold text-[#C9A84C] tabular-nums">
        {new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 2,
        }).format(payload[0].value)}
      </p>
    </div>
  );
}

export function WalletChart({ data }: { data: WalletData[] }) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="walletGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) =>
            new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(v)
          }
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(212,175,55,0.2)", strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#C9A84C"
          strokeWidth={2}
          fill="url(#walletGold)"
          dot={false}
          activeDot={{ r: 4, fill: "#C9A84C", stroke: "#0D0F14", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
