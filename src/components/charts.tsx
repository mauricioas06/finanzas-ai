"use client";

import { useSyncExternalStore } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatMXN } from "@/lib/money";

/**
 * Las gráficas reciben números solo para dibujar. Los montos que se leen en
 * pantalla siempre se formatean desde el valor exacto.
 */

const TOKENS = ["--positive", "--negative", "--info", "--brand", "--muted", "--line", "--fg", "--surface"] as const;
type Palette = Record<(typeof TOKENS)[number], string>;

const FALLBACK: Palette = {
  "--positive": "#22c55e", "--negative": "#f05252", "--info": "#4c8dff", "--brand": "#34d399",
  "--muted": "#8d9ab3", "--line": "#1e293d", "--fg": "#eef2f8", "--surface": "#0d1422",
};

let cache: { key: string; value: Palette } | null = null;

function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const key = document.documentElement.className;
  if (cache?.key === key) return cache.value;
  const value = Object.fromEntries(TOKENS.map((t) => [t, style.getPropertyValue(t).trim() || FALLBACK[t]])) as Palette;
  cache = { key, value };
  return value;
}

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

function usePalette(): Palette {
  return useSyncExternalStore(subscribe, readPalette, () => FALLBACK);
}

/** Colores categóricos que funcionan en modo claro y oscuro. */
export const SERIES_COLORS = ["#4c8dff", "#34d399", "#fbbf24", "#a78bfa", "#f472b6", "#22d3ee", "#fb923c", "#94a3b8", "#f87171"];

const mxnShort = (v: number) =>
  Math.abs(v) >= 1000 ? `$${(v / 1000).toLocaleString("es-MX", { maximumFractionDigits: 1 })}k` : `$${v}`;

function tooltipStyle(p: Palette) {
  return {
    contentStyle: { background: p["--surface"], border: `1px solid ${p["--line"]}`, borderRadius: 12, fontSize: 12, color: p["--fg"] },
    labelStyle: { color: p["--fg"], fontWeight: 600 },
    itemStyle: { color: p["--fg"] },
  };
}

export function CashflowChart({ data }: { data: Array<{ label: string; income: number; expense: number }> }) {
  const p = usePalette();
  return (
    <div className="h-64 w-full" role="img" aria-label="Gráfica de ingresos contra gastos por mes">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke={p["--line"]} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: p["--muted"], fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} width={52} tick={{ fill: p["--muted"], fontSize: 12 }} tickFormatter={mxnShort} />
          <Tooltip cursor={{ fill: p["--line"], opacity: 0.4 }} formatter={(v) => formatMXN(Number(v))} {...tooltipStyle(p)} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: p["--muted"] }} />
          <Bar dataKey="income" name="Ingresos" fill={p["--positive"]} radius={[6, 6, 0, 0]} maxBarSize={28} />
          <Bar dataKey="expense" name="Gastos" fill={p["--negative"]} radius={[6, 6, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({ data, label }: { data: Array<{ name: string; value: number }>; label: string }) {
  const p = usePalette();
  return (
    <div className="h-56 w-full" role="img" aria-label={label}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={2} stroke={p["--surface"]} strokeWidth={2}>
            {data.map((_, i) => <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => formatMXN(Number(v))} {...tooltipStyle(p)} />
          <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 12, color: p["--muted"] }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendChart({ data, label, name }: { data: Array<{ label: string; value: number }>; label: string; name: string }) {
  const p = usePalette();
  return (
    <div className="h-56 w-full" role="img" aria-label={label}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={p["--negative"]} stopOpacity={0.35} />
              <stop offset="100%" stopColor={p["--negative"]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={p["--line"]} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: p["--muted"], fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} width={52} tick={{ fill: p["--muted"], fontSize: 12 }} tickFormatter={mxnShort} />
          <Tooltip formatter={(v) => formatMXN(Number(v))} {...tooltipStyle(p)} />
          <Area type="monotone" dataKey="value" name={name} stroke={p["--negative"]} strokeWidth={2} fill="url(#trendFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HorizontalBars({ data, label }: { data: Array<{ name: string; value: number }>; label: string }) {
  const p = usePalette();
  const height = Math.max(140, data.length * 34 + 20);
  return (
    <div className="w-full" style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke={p["--line"]} />
          <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: p["--muted"], fontSize: 12 }} tickFormatter={mxnShort} />
          <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} tick={{ fill: p["--fg"], fontSize: 12 }} />
          <Tooltip cursor={{ fill: p["--line"], opacity: 0.4 }} formatter={(v) => formatMXN(Number(v))} {...tooltipStyle(p)} />
          <Bar dataKey="value" name="Gastado" radius={[0, 6, 6, 0]} maxBarSize={20}>
            {data.map((_, i) => <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
