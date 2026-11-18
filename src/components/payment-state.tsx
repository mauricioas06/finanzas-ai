import type { PaymentState } from "@/lib/finance/billing";
import { PAYMENT_STATE_LABEL } from "@/lib/labels";
import { Badge } from "./ui";

const TONE = { pendiente: "info", parcial: "info", pagado: "positive", vencido: "negative" } as const;

export function PaymentStateBadge({ state, estimated }: { state: PaymentState; estimated?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge tone={TONE[state]}>{PAYMENT_STATE_LABEL[state]}</Badge>
      {estimated ? <Badge>Fecha estimada</Badge> : null}
    </span>
  );
}
