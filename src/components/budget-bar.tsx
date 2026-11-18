import type { BudgetLevel } from "@/lib/finance/analysis";
import { cn } from "./ui";

const TONE: Record<BudgetLevel, string> = {
  sin_presupuesto: "bg-muted/40",
  ok: "bg-positive",
  aviso: "bg-[#f59e0b]",
  excedido: "bg-negative",
};

export function BudgetBar({ percent, level }: { percent: number | null; level: BudgetLevel }) {
  const width = Math.min(100, Math.max(0, percent ?? 0));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent ?? 0}
      aria-label={percent === null ? "Sin presupuesto" : `${percent} % del presupuesto`}
    >
      <div className={cn("h-full rounded-full transition-all", TONE[level])} style={{ width: `${width}%` }} />
    </div>
  );
}
