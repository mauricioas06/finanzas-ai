import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { ActionForm, FormField } from "@/components/action-form";
import { DonutChart } from "@/components/charts";
import { Badge, Card, inputClass, PageHeader } from "@/components/ui";
import { financeContext, getAccounts } from "@/lib/data/finance";
import { ACCOUNT_TYPE_LABEL, label } from "@/lib/labels";
import { formatMXN, sum } from "@/lib/money";
import { adjustBalance, createAccount, deleteAccount } from "./actions";

export const metadata: Metadata = { title: "Mi dinero" };

export default async function MiDineroPage() {
  const ctx = await financeContext();
  const accounts = await getAccounts(ctx);
  const total = sum(accounts.map((a) => a.balance));

  return (
    <>
      <PageHeader title="Mi dinero" description="Dónde está tu dinero hoy. Los saldos cambian solos cuando registras ingresos o gastos con una cuenta." />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <p className="text-sm text-muted">Dinero total disponible</p>
            <p className="num mt-1 text-3xl font-semibold tracking-tight">{formatMXN(total)}</p>
            <p className="mt-1 text-xs text-muted">Suma de {accounts.length} cuenta{accounts.length === 1 ? "" : "s"}. Aún no descuenta deudas ni dinero apartado (Fases 3 y 4).</p>
            {accounts.length > 1 && total.gt(0) ? (
              <div className="mt-4">
                <DonutChart label="Distribución del dinero por cuenta" data={accounts.map((a) => ({ name: a.name, value: Number(a.balance) }))} />
              </div>
            ) : null}
          </Card>

          <Card className="p-0">
            <h2 className="border-b border-line px-5 py-4 text-base font-semibold">Tus cuentas</h2>
            {accounts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
                <Wallet className="h-8 w-8 text-muted" aria-hidden="true" />
                <p className="font-medium">Todavía no registras cuentas</p>
                <p className="max-w-sm text-sm text-muted">Agrega tu efectivo, tu cuenta de débito o tu ahorro con el saldo que tienen hoy.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {accounts.map((a) => (
                  <li key={a.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{a.name}</p>
                        <p className="text-xs text-muted">
                          <Badge>{label(ACCOUNT_TYPE_LABEL, a.account_type)}</Badge>
                          {a.institution ? <span className="ml-2">{a.institution}</span> : null}
                        </p>
                      </div>
                      <p className="num text-lg font-semibold">{formatMXN(a.balance)}</p>
                    </div>
                    <details className="mt-3 group">
                      <summary className="cursor-pointer text-xs font-medium text-brand hover:underline">Ajustar saldo o eliminar</summary>
                      <div className="mt-3 flex flex-wrap items-end gap-4">
                        <ActionForm action={adjustBalance} submitLabel="Guardar saldo" variant="secondary" inline hideMessages>
                          <input type="hidden" name="id" value={a.id} />
                          <FormField label="Saldo real de hoy" name="balance" htmlId={`saldo-${a.id}`} className="w-44">
                            <input id={`saldo-${a.id}`} name="balance" inputMode="decimal" defaultValue={a.balance} className={inputClass} />
                          </FormField>
                        </ActionForm>
                        <ActionForm
                          action={deleteAccount}
                          submitLabel="Eliminar cuenta"
                          pendingLabel="Eliminando…"
                          variant="danger"
                          confirmMessage={`¿Eliminar la cuenta "${a.name}"? Sus movimientos se conservan, pero ya no estarán ligados a ninguna cuenta.`}
                          inline
                          hideMessages
                        >
                          <input type="hidden" name="id" value={a.id} />
                        </ActionForm>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="h-fit">
          <h2 className="mb-4 text-base font-semibold">Agregar cuenta</h2>
          <ActionForm action={createAccount} submitLabel="Agregar cuenta">
            <FormField label="Nombre" name="name">
              <input id="name" name="name" maxLength={80} placeholder="Ej. Nómina BBVA" className={inputClass} />
            </FormField>
            <FormField label="Tipo" name="accountType">
              <select id="accountType" name="accountType" defaultValue="debito" className={inputClass}>
                {Object.entries(ACCOUNT_TYPE_LABEL).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
              </select>
            </FormField>
            <FormField label="Institución (opcional)" name="institution">
              <input id="institution" name="institution" maxLength={80} placeholder="Ej. BBVA, Nu, Mercado Pago" className={inputClass} />
            </FormField>
            <FormField label="Saldo actual" name="balance" hint="Lo que tiene hoy, en pesos.">
              <input id="balance" name="balance" inputMode="decimal" placeholder="0.00" className={inputClass} />
            </FormField>
          </ActionForm>
          <p className="mt-4 text-xs text-muted">Aquí solo va el saldo. FINANZAS AI nunca te pedirá contraseñas, número de tarjeta, CVV ni NIP.</p>
        </Card>
      </div>
    </>
  );
}
