import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="FINANZAS AI, inicio">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-fg">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 17l5-5 4 4 7-8" />
          <path d="M15 8h5v5" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">
        FINANZAS <span className="text-brand">AI</span>
      </span>
    </Link>
  );
}
