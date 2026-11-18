import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel, shiftMonth } from "@/lib/finance/months";

/** Navegación entre meses con ?mes=YYYY-MM. No permite ir más allá del mes actual. */
export function MonthNav({ basePath, month, currentMonth }: { basePath: string; month: string; currentMonth: string }) {
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const canNext = next <= currentMonth;
  const linkClass = "grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface text-muted transition hover:text-fg";

  return (
    <nav aria-label="Cambiar de mes" className="flex items-center gap-2">
      <Link href={`${basePath}?mes=${prev}`} className={linkClass} aria-label={`Ver ${monthLabel(prev)}`}>
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="min-w-36 text-center text-sm font-medium capitalize">{monthLabel(month)}</span>
      {canNext ? (
        <Link href={`${basePath}?mes=${next}`} className={linkClass} aria-label={`Ver ${monthLabel(next)}`}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className={`${linkClass} opacity-40`} aria-hidden="true"><ChevronRight className="h-4 w-4" /></span>
      )}
    </nav>
  );
}
