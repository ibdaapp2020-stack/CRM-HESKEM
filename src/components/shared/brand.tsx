import { COMPANY } from "@/lib/company";

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    // The public logo is served directly so the login page does not depend on the image optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.jpg"
      alt={COMPANY.name}
      width={size}
      height={size}
      className="rounded-full border border-cyan/30 shadow-[0_0_20px_rgba(34,211,238,0.25)]"
    />
  );
}

export function BrandTitle({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <div className="text-lg font-bold tracking-wide text-ink">{COMPANY.name}</div>
      {!compact && (
        <div className="text-xs text-cyan-2/80">
          {COMPANY.nameAr} · {COMPANY.tagline}
        </div>
      )}
    </div>
  );
}
