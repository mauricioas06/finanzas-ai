import { Logo } from "@/components/brand";
import { Disclaimer } from "@/components/ui";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklab,var(--brand)_14%,transparent),transparent)]"
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        {children}
        <div className="mt-8 text-center">
          <Disclaimer />
        </div>
      </div>
    </div>
  );
}
