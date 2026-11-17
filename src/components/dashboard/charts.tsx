"use client";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useReducedMotion } from "framer-motion";
import { bulanPendek, formatAngka } from "@/lib/utils/format";

/** Grafik garis tipis bergaya referensi: grid putus-putus, label sumbu kanan, titik akhir. */
export function TrendLine({ data }: { data: { bulan: string; poin: number }[] }) {
  const reduce = useReducedMotion();
  const rows = data.map((d) => ({ ...d, label: bulanPendek(d.bulan) }));
  const last = rows.length - 1;
  return (
    <div className="h-[170px] w-full" role="img" aria-label={`Poin disahkan per bulan: ${rows.map((r) => `${r.label} ${r.poin}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#d9d9de" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#67676d" }} interval="preserveStartEnd" />
          <YAxis orientation="right" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#67676d" }} width={34} />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: "1px solid #e8e8eb", fontSize: 12, padding: "6px 10px" }}
            formatter={(v) => [`${formatAngka(Number(v))} poin`, "Disahkan"]}
            labelStyle={{ color: "#0c0b0b", fontWeight: 600 }}
          />
          <Line
            type="linear"
            dataKey="poin"
            stroke="#8fcf2a"
            strokeWidth={2}
            isAnimationActive={!reduce}
            animationDuration={500}
            dot={(p: { cx?: number; cy?: number; index?: number }) =>
              p.index === last ? <circle key="end" cx={p.cx} cy={p.cy} r={4} fill="#8fcf2a" stroke="#fff" strokeWidth={2} /> : <g key={p.index} />
            }
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HBarList({ rows, unit = "kasus" }: { rows: { label: string; value: number; sub?: string }[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13.5px]">
            <span className="truncate">{r.label}</span>
            <span className="tabular shrink-0 text-ink-2">
              {formatAngka(r.value)} {unit}
              {r.sub ? <span className="text-ink-3"> · {r.sub}</span> : null}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
