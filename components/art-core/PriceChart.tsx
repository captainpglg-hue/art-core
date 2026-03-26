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

interface DataPoint {
  month: string;
  price: number;
}

interface PriceChartProps {
  data: DataPoint[];
  currency?: string;
}

function CustomTooltip({
  active,
  payload,
  label,
  currency = "EUR",
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  currency?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[#1E1E1E] border border-gold/20 px-3 py-2 shadow-gold text-xs">
      <p className="text-white/50 mb-0.5">{label}</p>
      <p className="font-bold text-gold tabular-nums">
        {new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency,
          maximumFractionDigits: 0,
        }).format(payload[0].value)}
      </p>
    </div>
  );
}

export function PriceChart({ data, currency = "EUR" }: PriceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.04)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) =>
            new Intl.NumberFormat("fr-FR", {
              notation: "compact",
              currency,
            }).format(v)
          }
        />
        <Tooltip content={<CustomTooltip currency={currency} />} />
        <Area
          type="monotone"
          dataKey="price"
          stroke="#C9A84C"
          strokeWidth={2}
          fill="url(#goldGrad)"
          dot={false}
          activeDot={{ r: 4, fill: "#C9A84C", stroke: "#0a0a0a", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
