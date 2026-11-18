import type { ReactNode } from "react";
import { Card, cn } from "./ui";

/** Tarjeta de cifra principal. `change` en porcentaje; `goodWhenUp` define el color. */
export function Stat({ label, value, note, change, goodWhenUp = true, tone }: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  change?: number | null;
  goodWhenUp?: boolean;
  tone?: "positive" | "negative";
}) {
  const changeTone = change === null || change === undefined || change === 0
    ? "text-muted"
    : (change > 0) === goodWhenUp ? "text-positive" : "text-negative";
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={cn("num mt-2 text-2xl font-semibold tracking-tight", tone === "positive" && "text-positive", tone === "negative" && "text-negative")}>{value}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs">
        {change !== undefined ? (
          <span className={changeTone}>
            {change === null ? "Sin mes anterior para comparar" : `${change > 0 ? "▲" : change < 0 ? "▼" : "="} ${Math.abs(change)} % vs. mes anterior`}
          </span>
        ) : null}
        {note ? <span className="text-muted">{note}</span> : null}
      </div>
    </Card>
  );
}
